import { NextResponse } from 'next/server';
import { nextEmailStatus } from '../../../../../lib/email-tracking';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { classifyUserAgent, hashTelemetryValue, requestIp } from '../../../../../lib/request-security';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const fallback = new URL('/', request.url);
  try {
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const { data: link } = await admin
      .from('email_links')
      .select('id,message_id,user_id,target_url,click_count,first_clicked_at')
      .eq('id', id)
      .maybeSingle();
    if (!link) return NextResponse.redirect(fallback);

    const target = new URL(link.target_url);
    if (!['http:', 'https:'].includes(target.protocol)) return NextResponse.redirect(fallback);

    const now = new Date().toISOString();
    const userAgent = request.headers.get('user-agent');
    const classification = classifyUserAgent(userAgent);
    await admin.from('email_events').insert({
      message_id: link.message_id,
      user_id: link.user_id,
      event_type: 'clicked',
      event_source: 'tracked_link',
      is_machine_generated: ['known_bot', 'automation'].includes(classification),
      ip_hash: hashTelemetryValue(requestIp(request)),
      user_agent_hash: hashTelemetryValue(userAgent),
      metadata: { link_id: link.id, target_domain: target.hostname, user_agent_class: classification },
      occurred_at: now,
    });
    await admin.from('email_links').update({
      click_count: (link.click_count || 0) + 1,
      first_clicked_at: link.first_clicked_at || now,
      last_clicked_at: now,
    }).eq('id', link.id);

    const { data: message } = await admin
      .from('email_messages')
      .select('relationship_id,status,click_count,first_clicked_at')
      .eq('id', link.message_id)
      .maybeSingle();
    await admin.from('email_messages').update({
      status: nextEmailStatus(message?.status || 'sent', 'clicked'),
      click_count: (message?.click_count || 0) + 1,
      first_clicked_at: message?.first_clicked_at || now,
    }).eq('id', link.message_id);
    if (message?.relationship_id && !['known_bot', 'automation'].includes(classification)) {
      await admin
        .from('creator_relationships')
        .update({ status: 'clicked' })
        .eq('id', message.relationship_id)
        .in('status', ['to_contact', 'sent', 'opened']);
    }
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
