import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import {
  EmailMessageStatus,
  crmStatusForEmailEvent,
  nextEmailStatus,
} from '../../../../lib/email-tracking';

const eventMap: Record<string, EmailMessageStatus> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
};

function verifyWebhook(request: Request, body: string) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const messageId = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signatures = request.headers.get('svix-signature');
  if (!secret || !messageId || !timestamp || !signatures) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  try {
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', secretBytes)
      .update(`${messageId}.${timestamp}.${body}`)
      .digest();
    return signatures.split(' ').some((signature) => {
      const [version, value] = signature.split(',');
      if (version !== 'v1' || !value) return false;
      const received = Buffer.from(value, 'base64');
      return received.length === expected.length && timingSafeEqual(received, expected);
    });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyWebhook(request, rawBody)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const eventType = eventMap[String(payload.type || '')];
    const providerMessageId = payload.data?.email_id || payload.data?.id;
    if (!eventType || !providerMessageId) return NextResponse.json({ ok: true });

    const admin = getSupabaseAdmin();
    const { data: message } = await admin
      .from('email_messages')
      .select('id,user_id,relationship_id,status,open_count,click_count,first_opened_at,first_clicked_at')
      .eq('provider_message_id', providerMessageId)
      .maybeSingle();
    if (!message) return NextResponse.json({ ok: true });

    const occurredAt = payload.created_at || new Date().toISOString();
    const eventInsert = await admin.from('email_events').insert({
      message_id: message.id,
      user_id: message.user_id,
      event_type: eventType,
      provider: 'resend',
      provider_event_id: payload.id || null,
      event_source: 'provider',
      metadata: { provider_event_type: String(payload.type || '').slice(0, 100) },
      occurred_at: occurredAt,
    });
    if (eventInsert.error?.code === '23505') return NextResponse.json({ ok: true });
    if (eventInsert.error) throw eventInsert.error;

    const update: Record<string, unknown> = {
      status: nextEmailStatus(message.status, eventType),
    };
    if (eventType === 'delivered') update.delivered_at = occurredAt;
    if (eventType === 'bounced') update.bounced_at = occurredAt;
    if (eventType === 'opened') {
      update.first_opened_at = message.first_opened_at || occurredAt;
      update.last_opened_at = occurredAt;
      update.open_count = (message.open_count || 0) + 1;
    }
    if (eventType === 'clicked') {
      update.first_clicked_at = message.first_clicked_at || occurredAt;
      update.click_count = (message.click_count || 0) + 1;
    }
    await admin.from('email_messages').update(update).eq('id', message.id);

    const crmStatus = crmStatusForEmailEvent(eventType);
    if (crmStatus && message.relationship_id) {
      const allowedCurrentStatuses = crmStatus === 'opened'
        ? ['to_contact', 'sent']
        : crmStatus === 'clicked'
          ? ['to_contact', 'sent', 'opened']
          : ['to_contact', 'sent', 'opened', 'clicked'];
      await admin
        .from('creator_relationships')
        .update({ status: crmStatus })
        .eq('id', message.relationship_id)
        .in('status', allowedCurrentStatuses);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook failed' }, { status: 500 });
  }
}
