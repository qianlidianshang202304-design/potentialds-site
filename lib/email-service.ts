/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyEmailVariables,
  escapeHtml,
  extractTrackedLinks,
  replaceTrackedLink,
  safeEmailHeaderValue,
} from './email-rendering';

export type EmailTemplateRow = {
  id: string;
  subject_template: string;
  html_template: string;
  text_template: string | null;
};

export type EmailSenderProfile = {
  id?: string | null;
  label?: string | null;
  from_email?: string | null;
  reply_to_email?: string | null;
  sender_name?: string | null;
  brand_name?: string | null;
  daily_send_limit?: number | null;
  is_enabled?: boolean | null;
};

export type EmailRecipientInput = {
  recipientEmail: string;
  recipientName?: string | null;
  influencerId?: string | null;
  relationshipId?: string | null;
  username?: string | null;
  platform?: string | null;
};

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function appOriginFromRequest(request: Request) {
  let appUrl = new URL(request.url).origin;
  try {
    const configuredUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || appUrl);
    if (['http:', 'https:'].includes(configuredUrl.protocol)) appUrl = configuredUrl.origin;
  } catch {}
  return appUrl;
}

export function senderProfileFromEnv(overrides: Partial<EmailSenderProfile> = {}): EmailSenderProfile {
  return {
    provider: 'resend',
    from_email: process.env.OUTREACH_FROM_EMAIL || null,
    daily_send_limit: Number(process.env.OUTREACH_DAILY_LIMIT || 50),
    is_enabled: true,
    ...overrides,
  } as EmailSenderProfile;
}

export async function loadTemplateForUser(
  admin: SupabaseClient<any, 'public', any>,
  userId: string,
  templateId: string,
) {
  const { data, error } = await admin
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) throw new Error('Template not found');
  return data as EmailTemplateRow;
}

export async function ensureDailySendLimit(
  admin: SupabaseClient<any, 'public', any>,
  userId: string,
  limit?: number | null,
) {
  const dailyLimit = Math.max(1, Math.min(Number(limit || process.env.OUTREACH_DAILY_LIMIT || 50), 1000));
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const sentToday = await admin
    .from('email_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .not('status', 'in', '("failed","cancelled")');

  if ((sentToday.count || 0) >= dailyLimit) {
    throw new Error(`今日发送已达到 ${dailyLimit} 封上限。`);
  }
}

export async function createQueuedEmailMessage(params: {
  admin: SupabaseClient<any, 'public', any>;
  userId: string;
  template: EmailTemplateRow;
  recipient: EmailRecipientInput;
  senderProfile?: EmailSenderProfile | null;
  campaignId?: string | null;
}) {
  const { admin, userId, template, recipient, senderProfile, campaignId } = params;
  const recipientEmail = recipient.recipientEmail.trim().toLowerCase();
  if (!validEmail(recipientEmail)) throw new Error('收件邮箱格式不正确。');

  const variables = {
    creator_name: recipient.recipientName || recipient.username || '',
    username: recipient.username || recipient.recipientName || '',
    sender_name: safeEmailHeaderValue(senderProfile?.sender_name || '', 100),
    brand_name: safeEmailHeaderValue(senderProfile?.brand_name || '', 100),
    platform: recipient.platform || '',
  };
  const htmlVariables = Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [key, escapeHtml(value)]),
  );
  const subject = safeEmailHeaderValue(applyEmailVariables(template.subject_template, variables), 300);
  const html = applyEmailVariables(template.html_template, htmlVariables);
  const text = applyEmailVariables(template.text_template || '', variables);

  const messageResult = await admin
    .from('email_messages')
    .insert({
      user_id: userId,
      campaign_id: campaignId || null,
      template_id: template.id,
      relationship_id: recipient.relationshipId || null,
      influencer_id: recipient.influencerId || null,
      recipient_email: recipientEmail,
      recipient_name: safeEmailHeaderValue(recipient.recipientName || '', 100) || null,
      sender_email: senderProfile?.from_email || process.env.OUTREACH_FROM_EMAIL || null,
      sender_name: variables.sender_name || null,
      subject,
      html_body: html,
      text_body: text || null,
      provider: 'resend',
      status: 'queued',
    })
    .select('*')
    .single();

  if (messageResult.error) throw new Error(messageResult.error.message);
  return messageResult.data as Record<string, any>;
}

export async function deliverQueuedEmailMessage(params: {
  admin: SupabaseClient<any, 'public', any>;
  userId: string;
  messageId: string;
  appUrl: string;
  senderProfile?: EmailSenderProfile | null;
}) {
  const { admin, userId, messageId, appUrl, senderProfile } = params;
  if (senderProfile?.is_enabled === false) throw new Error('发件配置已暂停。');

  await ensureDailySendLimit(admin, userId, senderProfile?.daily_send_limit);

  const { data: message, error: messageError } = await admin
    .from('email_messages')
    .select('*')
    .eq('id', messageId)
    .eq('user_id', userId)
    .maybeSingle();
  if (messageError || !message) throw new Error('Message not found');
  if (message.status !== 'queued') return { messageId, status: message.status };

  const unsubscribed = await admin
    .from('email_unsubscribes')
    .select('id')
    .eq('user_id', userId)
    .eq('email', message.recipient_email)
    .maybeSingle();
  if (unsubscribed.data) {
    await admin.from('email_messages').update({ status: 'cancelled' }).eq('id', message.id);
    return { messageId, status: 'cancelled' };
  }

  await admin.from('email_messages').update({ status: 'sending' }).eq('id', message.id);

  let html = String(message.html_body || '');
  const extractedLinks = extractTrackedLinks(html);
  html = extractedLinks.html;
  for (const link of extractedLinks.links) {
    const linkResult = await admin
      .from('email_links')
      .insert({ message_id: message.id, user_id: userId, target_url: link.target })
      .select('id')
      .single();
    if (linkResult.error || !linkResult.data?.id) {
      await admin.from('email_messages').update({ status: 'failed' }).eq('id', message.id);
      throw new Error('邮件链接追踪初始化失败，请稍后重试。');
    }
    html = replaceTrackedLink(html, link.placeholder, `${appUrl}/api/email/click/${linkResult.data.id}`);
  }
  html += `<img src="${escapeHtml(appUrl)}/api/email/open/${message.tracking_token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;overflow:hidden" />`;
  await admin.from('email_messages').update({ html_body: html }).eq('id', message.id);

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = senderProfile?.from_email || process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    await admin.from('email_messages').update({ status: 'failed' }).eq('id', message.id);
    throw new Error('邮件服务尚未配置。请设置 RESEND_API_KEY 和 OUTREACH_FROM_EMAIL。');
  }

  const senderName = safeEmailHeaderValue(senderProfile?.sender_name || message.sender_name || '', 100);
  const providerResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: senderName ? `${senderName} <${fromEmail}>` : fromEmail,
      to: [message.recipient_email],
      subject: message.subject,
      html,
      text: message.text_body || undefined,
      reply_to: senderProfile?.reply_to_email || undefined,
      headers: {
        'List-Unsubscribe': `<${appUrl}/api/email/unsubscribe/${message.tracking_token}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
  const providerJson = await providerResponse.json();
  if (!providerResponse.ok) {
    await admin.from('email_messages').update({ status: 'failed' }).eq('id', message.id);
    throw new Error(providerJson.message || '邮件发送失败');
  }

  const sentAt = new Date().toISOString();
  await admin.from('email_messages').update({
    status: 'sent',
    provider_message_id: providerJson.id,
    sent_at: sentAt,
  }).eq('id', message.id);
  await admin.from('email_events').insert({
    message_id: message.id,
    user_id: userId,
    event_type: 'sent',
    provider: 'resend',
    provider_event_id: providerJson.id,
    occurred_at: sentAt,
  });

  if (message.relationship_id) {
    await admin.from('creator_relationships').update({
      status: 'sent',
      last_contacted_at: sentAt,
    }).eq('id', message.relationship_id).eq('user_id', userId);
  }

  return { messageId, status: 'sent' };
}
