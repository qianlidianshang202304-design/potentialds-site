import { NextResponse } from 'next/server';
import { nextEmailStatus } from '../../../../../lib/email-tracking';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { classifyUserAgent, hashTelemetryValue, requestIp } from '../../../../../lib/request-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const fallback = new URL('/', request.url);
  let target: URL | null = null;
  const linkId = (await context.params).id;
  const admin = getSupabaseAdmin();
  try {
    const { data: link, error: linkErr } = await admin
      .from('email_links')
      .select('id,message_id,user_id,target_url,click_count,first_clicked_at')
      .eq('id', linkId)
      .maybeSingle();
    if (linkErr) console.error('[click-track] fetch link failed:', linkErr.message, 'id=', linkId);
    if (!link) return NextResponse.redirect(fallback);

    target = new URL(link.target_url);
    if (!['http:', 'https:'].includes(target.protocol)) return NextResponse.redirect(fallback);

    const now = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || '';
    const classification = classifyUserAgent(userAgent);
    const machineGenerated = ['known_bot', 'automation'].includes(classification);

    const { error: eventErr } = await admin.from('email_events').insert({
      message_id: link.message_id,
      user_id: link.user_id,
      event_type: 'clicked',
      event_source: 'tracked_link',
      is_machine_generated: machineGenerated,
      ip_hash: hashTelemetryValue(requestIp(request)),
      user_agent_hash: hashTelemetryValue(userAgent),
      metadata: { link_id: link.id, target_domain: target.hostname, user_agent_class: classification },
      occurred_at: now,
    });
    if (eventErr) console.error('[click-track] insert event failed:', eventErr.message);

    const { error: linkUpdErr } = await admin.from('email_links').update({
      click_count: (link.click_count || 0) + 1,
      first_clicked_at: link.first_clicked_at || now,
      last_clicked_at: now,
    }).eq('id', link.id);
    if (linkUpdErr) console.error('[click-track] update link failed:', linkUpdErr.message);

    const { data: message, error: msgErr } = await admin
      .from('email_messages')
      .select('relationship_id,status,click_count,first_clicked_at')
      .eq('id', link.message_id)
      .maybeSingle();
    if (msgErr) console.error('[click-track] fetch message failed:', msgErr.message);

    if (message) {
      const { error: msgUpdErr } = await admin.from('email_messages').update({
        status: nextEmailStatus(message.status || 'sent', 'clicked'),
        click_count: (message.click_count || 0) + 1,
        first_clicked_at: message.first_clicked_at || now,
      }).eq('id', link.message_id);
      if (msgUpdErr) console.error('[click-track] update message failed:', msgUpdErr.message);

      if (message.relationship_id && !machineGenerated) {
        const { error: relErr } = await admin
          .from('creator_relationships')
          .update({ status: 'clicked' })
          .eq('id', message.relationship_id)
          .in('status', ['to_contact', 'sent', 'opened']);
        if (relErr) console.error('[click-track] update relationship failed:', relErr.message);
      }
    }
    return NextResponse.redirect(target);
  } catch (err) {
    console.error('[click-track] unexpected error:', err instanceof Error ? err.message : String(err), 'id=', linkId);
    return NextResponse.redirect(target || fallback);
  }
}
