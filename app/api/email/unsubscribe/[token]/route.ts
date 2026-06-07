import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

function page(title: string, body: string) {
  return new NextResponse(
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui;margin:0;padding:48px 20px;background:#f5f5f7;color:#18181b"><main style="max-width:520px;margin:auto;background:white;border:1px solid #e4e4e7;border-radius:16px;padding:32px;text-align:center">${body}</main></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

async function unsubscribe(token: string) {
  const admin = getSupabaseAdmin();
  const { data: message } = await admin
    .from('email_messages')
    .select('id,user_id,recipient_email')
    .eq('tracking_token', token)
    .maybeSingle();

  if (!message) return false;

  const existing = await admin
    .from('email_unsubscribes')
    .select('id')
    .eq('user_id', message.user_id)
    .eq('email', message.recipient_email)
    .maybeSingle();
  await admin.from('email_unsubscribes').upsert(
    {
      user_id: message.user_id,
      email: message.recipient_email,
      reason: 'recipient_link',
      source_message_id: message.id,
    },
    { onConflict: 'user_id,email' },
  );
  await admin.from('email_messages').update({ status: 'unsubscribed' }).eq('id', message.id);
  if (!existing.data) {
    await admin.from('email_events').insert({
      message_id: message.id,
      user_id: message.user_id,
      event_type: 'unsubscribed',
      event_source: 'manual',
    });
  }
  return true;
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const action = new URL(`/api/email/unsubscribe/${encodeURIComponent(token)}`, request.url).pathname;
  return page(
    '确认退订',
    `<h1 style="font-size:24px;margin:0 0 12px">确认取消订阅？</h1><p style="line-height:1.7;color:#52525b">确认后，此邮箱将不再收到该发送方的营销邮件。</p><form method="post" action="${action}"><button type="submit" style="margin-top:12px;border:0;border-radius:999px;background:#18181b;color:white;padding:12px 22px;font-weight:600;cursor:pointer">确认退订</button></form>`,
  );
}

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const success = await unsubscribe(token);
    if (!success) return page('退订链接无效', '<h1 style="font-size:24px;margin:0 0 12px">链接无效或已过期</h1><p style="color:#52525b">请联系邮件发送方处理。</p>');
  } catch {}

  return page(
    '已退订',
    '<h1 style="font-size:24px;margin:0 0 12px">已取消订阅</h1><p style="line-height:1.7;color:#52525b">此邮箱将不再收到来自该发送方的营销邮件。</p>',
  );
}
