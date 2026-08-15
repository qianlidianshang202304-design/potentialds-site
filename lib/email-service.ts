/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
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
  provider?: string | null;
  from_email?: string | null;
  reply_to_email?: string | null;
  sender_name?: string | null;
  brand_name?: string | null;
  daily_send_limit?: number | null;
  is_enabled?: boolean | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  smtp_secure?: boolean | null;
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
  // 优先级：EMAIL_TRACKING_URL > NEXT_PUBLIC_APP_URL > 请求来源
  // 追踪像素和链接必须使用公网可访问的域名，否则收件人打开邮件时无法回传
  const candidates = [
    process.env.EMAIL_TRACKING_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const candidate of candidates) {
    if (candidate) {
      try {
        const url = new URL(candidate);
        if (['http:', 'https:'].includes(url.protocol)) return url.origin;
      } catch {}
    }
  }
  return new URL(request.url).origin;
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
  // 只统计今天实际发送成功的邮件（sent），不含 queued/sending/cancelled/failed
  const sentToday = await admin
    .from('email_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent')
    .gte('sent_at', startOfDay.toISOString());

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
      provider: String(senderProfile?.provider || 'resend').toLowerCase(),
      status: 'queued',
    })
    .select('*')
    .single();

  if (messageResult.error) throw new Error(messageResult.error.message);
  return messageResult.data as Record<string, any>;
}

// 统一的失败记录：更新 message 状态 + 写入 email_events 元数据
async function recordSendFailure(
  admin: SupabaseClient<any, 'public', any>,
  message: Record<string, any>,
  userId: string,
  errorMessage: string,
  provider?: string | null,
) {
  const failedAt = new Date().toISOString();
  try {
    await admin.from('email_messages').update({ status: 'failed' }).eq('id', message.id);
  } catch {
    // 忽略：防止覆盖错误时的二次异常
  }
  try {
    await admin.from('email_events').insert({
      message_id: message.id,
      user_id: userId,
      event_type: 'failed',
      provider: provider || message.provider || null,
      event_source: 'manual',
      metadata: { error: errorMessage, failed_at: failedAt },
      occurred_at: failedAt,
    });
  } catch {
    // 忽略：即使事件写失败，也不影响主流程（至少 message 状态已更新）
  }
  // 抛出带有更明确上下文的错误，便于上层汇总
  throw new Error(errorMessage);
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
      await recordSendFailure(admin, message, userId, '邮件链接追踪初始化失败，请稍后重试。');
      return; // unreachable - recordSendFailure throws
    }
    html = replaceTrackedLink(html, link.placeholder, `${appUrl}/api/email/click/${linkResult.data.id}`);
  }
  html += `<img src="${escapeHtml(appUrl)}/api/email/open/${message.tracking_token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;overflow:hidden" />`;
  await admin.from('email_messages').update({ html_body: html }).eq('id', message.id);

  const provider = String(message.provider || senderProfile?.provider || 'resend').toLowerCase();
  const fromEmail = senderProfile?.from_email || process.env.OUTREACH_FROM_EMAIL || String(message.sender_email || '');
  if (!fromEmail) {
    await recordSendFailure(admin, message, userId, '未配置发件邮箱地址。请在"邮箱设置"中补充发信邮箱或选择已保存的发件配置。', provider);
  }

  const senderName = safeEmailHeaderValue(senderProfile?.sender_name || message.sender_name || '', 100);
  const fromHeader = senderName ? `${senderName} <${fromEmail}>` : fromEmail;

  let providerMessageId: string | null = null;

  if (provider === 'smtp') {
    const smtpHost = senderProfile?.smtp_host || process.env.SMTP_HOST;
    const smtpPort = Number(senderProfile?.smtp_port || process.env.SMTP_PORT || 465);
    const smtpUser = senderProfile?.smtp_user || process.env.SMTP_USER;
    const smtpPassword = senderProfile?.smtp_password || process.env.SMTP_PASSWORD;
    const smtpSecure = senderProfile?.smtp_secure ?? (process.env.SMTP_SECURE !== 'false');

    // 明确指出缺少哪个字段，便于用户定位
    if (!smtpHost && !smtpUser && !smtpPassword) {
      await recordSendFailure(admin, message, userId,
        `SMTP 未完整配置：缺少服务器地址、用户名和授权码。当前 profile.id=${senderProfile?.id || '无'}，请检查发件配置是否已保存为 SMTP 模式并填写完整参数。`, provider);
    }
    const missing: string[] = [];
    if (!smtpHost) missing.push('SMTP服务器地址');
    if (!smtpUser) missing.push('SMTP用户名');
    if (!smtpPassword) missing.push('SMTP授权码');
    if (missing.length > 0) {
      await recordSendFailure(admin, message, userId,
        `SMTP 配置不完整，缺少：${missing.join('、')}。请在邮箱设置中确认这些字段已保存。`, provider);
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser!, pass: smtpPassword! },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      tls: { rejectUnauthorized: false },
    });

    try {
      const smtpResult = await transporter.sendMail({
        from: fromHeader,
        to: [message.recipient_email],
        subject: message.subject,
        html,
        text: message.text_body || undefined,
        replyTo: senderProfile?.reply_to_email || undefined,
        headers: {
          'List-Unsubscribe': `<${appUrl}/api/email/unsubscribe/${message.tracking_token}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (!smtpResult.messageId) {
        await recordSendFailure(admin, message, userId, 'SMTP 发送失败：未获取到消息 ID。', provider);
      }
      providerMessageId = smtpResult.messageId;
    } catch (smtpErr) {
      const rawMsg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      let userMsg = rawMsg;
      if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo/i.test(rawMsg)) {
        userMsg = `SMTP 服务器无法连接：${smtpHost}:${smtpPort}。请检查地址/端口是否正确，SSL/TLS 设置是否匹配（465通常勾选SSL，587通常不勾选），以及服务器网络是否允许出站连接。`;
      } else if (/authentication|auth.*fail|password|invalid|credentials|5\.7\.\d|535|5\.7\.8/i.test(rawMsg)) {
        userMsg = `SMTP 认证失败（${smtpUser}）：请确认授权码（不是登录密码）是否正确，QQ邮箱/163邮箱需在后台开启SMTP并生成"授权码/客户端专用密码"。`;
      } else if (/recipient|550|553|mailbox unavailable|no such user/i.test(rawMsg)) {
        userMsg = `收件人邮箱被拒绝（${message.recipient_email}）：${rawMsg}`;
      } else if (/spam|rejected|content blocked|554|policy/i.test(rawMsg)) {
        userMsg = `邮件内容被SMTP服务商判定为垃圾邮件拦截：${rawMsg}`;
      } else if (/daily|limit|quota|exceeded|too many|hour|rate/i.test(rawMsg)) {
        userMsg = `SMTP 发送配额超限或频率过高，请稍后再试：${rawMsg}`;
      }
      await recordSendFailure(admin, message, userId, userMsg, provider);
    }
  } else {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      await recordSendFailure(admin, message, userId,
        'Resend API Key 未配置。请在部署环境设置 RESEND_API_KEY，或在邮箱设置中改用 SMTP 发送。', provider);
    }

    const providerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
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
      const msg = providerJson?.message || '邮件发送失败';
      await recordSendFailure(admin, message, userId, `Resend 返回错误 (HTTP ${providerResponse.status})：${msg}`, provider);
    }
    providerMessageId = providerJson.id;
  }

  const sentAt = new Date().toISOString();
  await admin.from('email_messages').update({
    status: 'sent',
    provider,
    provider_message_id: providerMessageId,
    sent_at: sentAt,
  }).eq('id', message.id);
  await admin.from('email_events').insert({
    message_id: message.id,
    user_id: userId,
    event_type: 'sent',
    provider,
    provider_event_id: providerMessageId,
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
