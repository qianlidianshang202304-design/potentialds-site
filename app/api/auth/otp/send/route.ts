import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { validEmail } from '../../../../../lib/email-service';
import {
  findLatestActiveOtp,
  generateOtpCode,
  recordOtp,
  sendOtpEmail,
} from '../../../../../lib/otp-service';

export const dynamic = 'force-dynamic';

// 单 IP / 单邮箱的粗频率控制（防止刷接口），记录在进程内存中
const throttle: Map<string, number> = new Map();

function checkThrottle(key: string, minIntervalMs: number): { ok: boolean; waitMs: number } {
  const now = Date.now();
  const last = throttle.get(key) || 0;
  const wait = last + minIntervalMs - now;
  if (wait > 0) return { ok: false, waitMs: wait };
  throttle.set(key, now);
  return { ok: true, waitMs: 0 };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = String(body.email || '').trim().toLowerCase();
    const purpose = String(body.purpose || 'signup_confirm') as 'signup_confirm' | 'magic_login';

    if (!validEmail(email)) {
      return NextResponse.json({ error: '邮箱格式不正确。' }, { status: 400 });
    }
    if (!['signup_confirm', 'magic_login'].includes(purpose)) {
      return NextResponse.json({ error: '不支持的验证码用途。' }, { status: 400 });
    }

    // 节流：同邮箱 30 秒一次，同 IP 10 秒一次
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';
    const byIp = checkThrottle(`ip:${ip}`, 10 * 1000);
    if (!byIp.ok) return NextResponse.json({ error: '请求过于频繁，请稍后再试。' }, { status: 429 });
    const byEmail = checkThrottle(`email:${email}`, 30 * 1000);
    if (!byEmail.ok) return NextResponse.json({ error: `发送过于频繁，请 ${Math.ceil(byEmail.waitMs / 1000)} 秒后再试。` }, { status: 429 });

    const admin = getSupabaseAdmin();

    // 注册场景：要求邮箱必须存在且未确认；登录场景：邮箱需存在且已确认
    let linkedUserId: string | null = null;
    const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 50,
    });
    const users = (listErr ? [] : usersList.users).filter(
      (u: { email?: string | null }) => (u.email || '').toLowerCase() === email,
    ) as Array<{ id: string; confirmed_at?: string | null }>;
    if (users.length === 0) {
      if (purpose === 'signup_confirm') {
        return NextResponse.json({ error: '未找到该邮箱的注册账号，请先完成注册。' }, { status: 404 });
      }
      return NextResponse.json({ error: '未找到该邮箱的账号，请先注册。' }, { status: 404 });
    }
    const matched = users[0];
    linkedUserId = matched.id;
    if (purpose === 'magic_login' && !matched.confirmed_at) {
      return NextResponse.json({ error: '该邮箱尚未完成验证，请先完成注册验证。' }, { status: 400 });
    }

    // 如果最近 10 分钟内已经有未消费的验证码，则重新发送同一个数字（不频繁生成新码），只更新发送时间
    const existing = await findLatestActiveOtp({ admin, email, purpose });
    let codeToSend: string;
    let otpId: string;
    if (existing) {
      // 同一目的不允许超过 6 次重发，避免攻击
      if (existing.send_attempts >= 6) {
        return NextResponse.json(
          { error: '该邮箱请求验证码次数过多，请等待当前验证码过期后重新生成（10 分钟）。' },
          { status: 429 },
        );
      }
      // 注意：现有 code 无法还原，只能重新生成新的（旧码失效可通过让它 expires_at = now 实现）
      await admin
        .from('auth_otp_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', existing.id);
      codeToSend = generateOtpCode();
      const res = await recordOtp({ admin, email, purpose, code: codeToSend, userId: linkedUserId });
      otpId = res.id;
    } else {
      codeToSend = generateOtpCode();
      const res = await recordOtp({ admin, email, purpose, code: codeToSend, userId: linkedUserId });
      otpId = res.id;
    }

    try {
      await sendOtpEmail({ admin, toEmail: email, code: codeToSend, purpose });
    } catch (sendErr) {
      const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      // 发送失败不消耗码，只是标记为错误（下次会生成新的，避免旧码残留）
      await admin.from('auth_otp_codes').delete().eq('id', otpId);
      return NextResponse.json(
        {
          error: `验证码邮件发送失败：${msg}`,
          hint: '系统需要一条已启用的 SMTP 发信邮箱（飞书/企业邮箱等）。请在"邮箱设置"中添加并启用 SMTP 配置，再重新发送验证码。',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `验证码已发送到 ${email}，请查收并输入 6 位数字。验证码 10 分钟内有效。`,
      expiresInSeconds: 10 * 60,
      email,
      purpose,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `发送验证码异常：${msg}` }, { status: 500 });
  }
}
