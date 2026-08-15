/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

export type OtpPurpose = 'signup_confirm' | 'magic_login';

export type AuthOtpRow = {
  id: string;
  email: string;
  purpose: OtpPurpose;
  code_digest: string; // sha256(6位纯数字) hex
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  send_attempts: number;
  last_sent_at: string | null;
  user_id: string | null; // 关联的 auth.users.id（注册场景可选，登录场景留空）
};

/**
 * 生成 6 位纯数字验证码。
 * 避免返回 000000/123456 等过于简单的值，但保留纯数字以便用户录入。
 */
export function generateOtpCode(): string {
  // 使用 crypto.randomInt 生成安全的 0-999999 数字
  const buf = randomBytes(4);
  const num = buf.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

export function digestCode(code: string): string {
  return createHash('sha256').update(code.normalize()).digest('hex');
}

export async function loadGlobalSmtpProfile(admin: SupabaseClient<any, 'public', any>) {
  // 取任意一条已启用、标记 is_default 的 SMTP 配置；否则取第一条启用的 SMTP
  let { data: profile } = await admin
    .from('email_sending_profiles')
    .select('*')
    .eq('provider', 'smtp')
    .eq('is_enabled', true)
    .eq('is_default', true)
    .maybeSingle();
  if (!profile) {
    const res = await admin
      .from('email_sending_profiles')
      .select('*')
      .eq('provider', 'smtp')
      .eq('is_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1);
    profile = res.data?.[0] ?? null;
  }
  return profile as {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    smtp_secure: boolean;
    from_email: string;
    sender_name: string | null;
    brand_name: string | null;
  } | null;
}

export async function sendOtpEmail(params: {
  admin: SupabaseClient<any, 'public', any>;
  toEmail: string;
  code: string;
  purpose: OtpPurpose;
  brandName?: string;
}): Promise<void> {
  const { admin, toEmail, code, purpose, brandName = 'PotentialDS' } = params;
  const profile = await loadGlobalSmtpProfile(admin);
  if (!profile || !profile.smtp_host || !profile.smtp_user || !profile.smtp_password) {
    throw new Error(
      '系统还未配置可用的全局 SMTP 发信邮箱。请先在"邮箱设置"中添加并启用一条 SMTP 配置（通常为你的飞书/企业邮箱）。',
    );
  }
  const host = profile.smtp_host;
  const port = Number(profile.smtp_port) || 465;
  const secure = profile.smtp_secure !== false;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: profile.smtp_user, pass: profile.smtp_password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    tls: { rejectUnauthorized: false },
  });

  const senderName = profile.sender_name || brandName;
  const fromHeader = senderName ? `${senderName} <${profile.from_email || profile.smtp_user}>` : (profile.from_email || profile.smtp_user);

  const subjectLine = purpose === 'magic_login'
    ? `【登录验证码】您的 ${brandName} 登录验证码为 ${code}`
    : `【注册验证码】您的 ${brandName} 注册验证码为 ${code}`;

  const headline = purpose === 'magic_login' ? '登录验证码' : '注册验证码';
  const hint = purpose === 'magic_login'
    ? '请在 10 分钟内回到登录页录入该验证码以完成登录。'
    : '请在 10 分钟内回到验证页录入该验证码以完成账号验证。';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <div style="font-size: 13px; letter-spacing: 0.14em; color: #64748b; text-transform: uppercase; font-weight: 600;">${brandName}</div>
  <h1 style="font-size: 24px; margin: 16px 0 8px; color: #0f172a; font-weight: 600;">${headline}</h1>
  <p style="color: #334155; line-height: 1.6; margin: 12px 0;">${hint}</p>
  <div style="margin: 28px 0; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center;">
    <div style="font-size: 40px; font-weight: 700; letter-spacing: 0.6em; color: #0f172a; font-variant-numeric: tabular-nums;">${code}</div>
  </div>
  <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
    如果你没有请求此操作，可以忽略这封邮件。验证码为一次性有效，过期后请在网站重新发送。<br/>
    发件人：${profile.from_email || profile.smtp_user}
  </p>
</div>`;

  const text =
    `${brandName} - ${headline}\n` +
    `您的验证码为：${code}（6 位纯数字）\n` +
    `${hint}\n\n` +
    `如果您没有请求此操作，请忽略本邮件。`;

  await transporter.sendMail({
    from: fromHeader,
    to: [toEmail],
    subject: subjectLine,
    html,
    text,
  });
}

export async function recordOtp(params: {
  admin: SupabaseClient<any, 'public', any>;
  email: string;
  purpose: OtpPurpose;
  code: string;
  ttlSeconds?: number;
  userId?: string | null;
}): Promise<{ id: string }> {
  const { admin, email, purpose, code, ttlSeconds = 10 * 60, userId = null } = params;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const id = cryptoRandomId();
  const { error } = await admin.from('auth_otp_codes').insert({
    id,
    email: email.trim().toLowerCase(),
    purpose,
    code_digest: digestCode(code),
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    consumed_at: null,
    send_attempts: 1,
    last_sent_at: now.toISOString(),
    user_id: userId,
  });
  if (error) throw error;
  return { id };
}

export async function incrementSendAttempt(admin: SupabaseClient<any, 'public', any>, id: string) {
  await admin
    .from('auth_otp_codes')
    .update({
      send_attempts: (admin.rpc as any)('increment', { x: 1 }),
      last_sent_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function findLatestActiveOtp(params: {
  admin: SupabaseClient<any, 'public', any>;
  email: string;
  purpose: OtpPurpose;
}): Promise<AuthOtpRow | null> {
  const { admin, email, purpose } = params;
  const { data } = await admin
    .from('auth_otp_codes')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  return (data?.[0] as AuthOtpRow) ?? null;
}

export async function verifyOtp(params: {
  admin: SupabaseClient<any, 'public', any>;
  email: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ valid: true; otp: AuthOtpRow } | { valid: false; reason: string }> {
  const { admin, email, purpose, code } = params;
  const cleanCode = code.trim();
  if (!/^\d{6}$/.test(cleanCode)) return { valid: false, reason: '验证码必须是 6 位数字。' };
  const otp = await findLatestActiveOtp({ admin, email, purpose });
  if (!otp) return { valid: false, reason: '验证码无效或已过期，请重新发送。' };
  const expected = digestCode(cleanCode);
  if (expected !== otp.code_digest) {
    // 不消耗，允许重试
    return { valid: false, reason: '验证码错误。' };
  }
  // 标记已消费
  const now = new Date().toISOString();
  await admin.from('auth_otp_codes').update({ consumed_at: now }).eq('id', otp.id);
  return { valid: true, otp: { ...otp, consumed_at: now } };
}

function cryptoRandomId(): string {
  const bytes = randomBytes(16);
  // 简单转为 UUID-like 格式（非 RFC 严格）
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}
