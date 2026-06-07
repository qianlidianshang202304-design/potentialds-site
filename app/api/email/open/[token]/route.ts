import { NextResponse } from 'next/server';
import { nextEmailStatus } from '../../../../../lib/email-tracking';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { classifyUserAgent, hashTelemetryValue, requestIp } from '../../../../../lib/request-security';

const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const admin = getSupabaseAdmin();
    const { data: message } = await admin
      .from('email_messages')
      .select('id,user_id,relationship_id,status,open_count,first_opened_at')
      .eq('tracking_token', token)
      .maybeSingle();

    if (message) {
      const now = new Date().toISOString();
      const userAgent = request.headers.get('user-agent');
      const classification = classifyUserAgent(userAgent);
      const machineGenerated = ['known_bot', 'automation'].includes(classification);

      await admin.from('email_events').insert({
        message_id: message.id,
        user_id: message.user_id,
        event_type: 'opened',
        event_source: 'tracking_pixel',
        is_machine_generated: machineGenerated,
        ip_hash: hashTelemetryValue(requestIp(request)),
        user_agent_hash: hashTelemetryValue(userAgent),
        metadata: { user_agent_class: classification },
        occurred_at: now,
      });
      const updatePayload: Record<string, unknown> = {
        status: nextEmailStatus(message.status, 'opened'),
        first_opened_at: message.first_opened_at || now,
        last_opened_at: now,
        open_count: (message.open_count || 0) + 1,
      };
      await admin.from('email_messages').update(updatePayload).eq('id', message.id);
      if (message.relationship_id && !machineGenerated) {
        await admin
          .from('creator_relationships')
          .update({ status: 'opened' })
          .eq('id', message.relationship_id)
          .in('status', ['to_contact', 'sent']);
      }
    }
  } catch {
    // Tracking pixels must remain invisible even when telemetry is unavailable.
  }

  return new NextResponse(transparentGif, {
    headers: {
      'content-type': 'image/gif',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      expires: '0',
    },
  });
}
