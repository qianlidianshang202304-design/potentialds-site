import { NextResponse } from 'next/server';
import {
  applyEmailVariables,
  escapeHtml,
  extractTrackedLinks,
  replaceTrackedLink,
  safeEmailHeaderValue,
} from '../../../../lib/email-rendering';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      templateId?: string;
      influencerId?: string;
      relationshipId?: string;
      recipientEmail?: string;
      recipientName?: string;
      senderName?: string;
      brandName?: string;
    };

    if (!body.templateId || !body.recipientEmail) {
      return NextResponse.json({ error: 'Missing template or recipient email' }, { status: 400 });
    }
    const recipientEmail = body.recipientEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json({ error: '收件邮箱格式不正确。' }, { status: 400 });
    }

    const dailyLimit = Math.max(1, Math.min(Number(process.env.OUTREACH_DAILY_LIMIT || 50), 1000));
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const sentToday = await admin
      .from('email_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authData.user.id)
      .gte('created_at', startOfDay.toISOString())
      .not('status', 'in', '("failed","cancelled")');
    if ((sentToday.count || 0) >= dailyLimit) {
      return NextResponse.json({ error: `今日发送已达到 ${dailyLimit} 封上限。` }, { status: 429 });
    }

    const unsubscribed = await admin
      .from('email_unsubscribes')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('email', recipientEmail)
      .maybeSingle();
    if (unsubscribed.data) {
      return NextResponse.json({ error: '该邮箱已退订，不能继续发送。' }, { status: 409 });
    }

    const { data: template, error: templateError } = await admin
      .from('email_templates')
      .select('*')
      .eq('id', body.templateId)
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const variables = {
      creator_name: body.recipientName || '',
      username: body.recipientName || '',
      sender_name: safeEmailHeaderValue(body.senderName || '', 100),
      brand_name: safeEmailHeaderValue(body.brandName || '', 100),
      platform: '',
    };
    const htmlVariables = Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [key, escapeHtml(value)]),
    );

    const subject = safeEmailHeaderValue(
      applyEmailVariables(template.subject_template, variables),
      300,
    );
    let html = applyEmailVariables(template.html_template, htmlVariables);
    const text = applyEmailVariables(template.text_template || '', variables);

    const messageResult = await admin
      .from('email_messages')
      .insert({
        user_id: authData.user.id,
        template_id: body.templateId,
        relationship_id: body.relationshipId || null,
        influencer_id: body.influencerId || null,
        recipient_email: recipientEmail,
        recipient_name: safeEmailHeaderValue(body.recipientName || '', 100) || null,
        sender_email: process.env.OUTREACH_FROM_EMAIL || null,
        sender_name: variables.sender_name || null,
        subject,
        html_body: html,
        text_body: text || null,
        provider: 'resend',
        status: 'queued',
      })
      .select('*')
      .single();
    if (messageResult.error) return NextResponse.json({ error: messageResult.error.message }, { status: 500 });

    const message = messageResult.data;
    let appUrl = new URL(request.url).origin;
    try {
      const configuredUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || appUrl);
      if (['http:', 'https:'].includes(configuredUrl.protocol)) appUrl = configuredUrl.origin;
    } catch {}

    const extractedLinks = extractTrackedLinks(html);
    html = extractedLinks.html;

    for (const link of extractedLinks.links) {
      const linkResult = await admin
        .from('email_links')
        .insert({ message_id: message.id, user_id: authData.user.id, target_url: link.target })
        .select('id')
        .single();
      if (linkResult.error || !linkResult.data?.id) {
        await admin.from('email_messages').update({ status: 'failed' }).eq('id', message.id);
        return NextResponse.json(
          { error: '邮件链接追踪初始化失败，请稍后重试。', messageId: message.id },
          { status: 503 },
        );
      }
      html = replaceTrackedLink(
        html,
        link.placeholder,
        `${appUrl}/api/email/click/${linkResult.data.id}`,
      );
    }

    html += `<img src="${escapeHtml(appUrl)}/api/email/open/${message.tracking_token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;overflow:hidden" />`;
    await admin.from('email_messages').update({ html_body: html }).eq('id', message.id);

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.OUTREACH_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
      await admin.from('email_messages').update({ status: 'failed' }).eq('id', message.id);
      return NextResponse.json(
        { error: '邮件服务尚未配置。请设置 RESEND_API_KEY 和 OUTREACH_FROM_EMAIL。', messageId: message.id },
        { status: 503 },
      );
    }

    const providerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: variables.sender_name ? `${variables.sender_name} <${fromEmail}>` : fromEmail,
        to: [recipientEmail],
        subject,
        html,
        text: text || undefined,
        headers: {
          'List-Unsubscribe': `<${appUrl}/api/email/unsubscribe/${message.tracking_token}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
    const providerJson = await providerResponse.json();
    if (!providerResponse.ok) {
      await admin.from('email_messages').update({ status: 'failed' }).eq('id', message.id);
      return NextResponse.json({ error: providerJson.message || '邮件发送失败' }, { status: 502 });
    }

    const sentAt = new Date().toISOString();
    await admin.from('email_messages').update({
      status: 'sent',
      provider_message_id: providerJson.id,
      sent_at: sentAt,
    }).eq('id', message.id);
    await admin.from('email_events').insert({
      message_id: message.id,
      user_id: authData.user.id,
      event_type: 'sent',
      provider: 'resend',
      provider_event_id: providerJson.id,
      occurred_at: sentAt,
    });

    if (body.relationshipId) {
      await admin.from('creator_relationships').update({
        status: 'sent',
        last_contacted_at: sentAt,
      }).eq('id', body.relationshipId).eq('user_id', authData.user.id);
    }

    return NextResponse.json({ messageId: message.id, status: 'sent' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 },
    );
  }
}
