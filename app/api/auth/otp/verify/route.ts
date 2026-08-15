import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { validEmail } from '../../../../../lib/email-service';
import { verifyOtp } from '../../../../../lib/otp-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const purpose = String(body.purpose || 'signup_confirm') as 'signup_confirm' | 'magic_login';

    if (!validEmail(email)) return NextResponse.json({ error: '邮箱格式不正确。' }, { status: 400 });
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: '验证码必须是 6 位数字。' }, { status: 400 });
    if (!['signup_confirm', 'magic_login'].includes(purpose)) {
      return NextResponse.json({ error: '不支持的验证用途。' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const result = await verifyOtp({ admin, email, purpose, code });
    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    const otp = result.otp;
    const userId = otp.user_id;

    // OTP 验证通过，根据 purpose 处理后续动作
    if (purpose === 'signup_confirm') {
      if (!userId) {
        return NextResponse.json(
          { error: '验证码有效但无法关联注册用户，请尝试重新注册。' },
          { status: 500 },
        );
      }
      // 使用 Admin API 将用户标记为已确认
      const { data: confirmedUser, error: confirmErr } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmErr || !confirmedUser) {
        return NextResponse.json(
          {
            error: `验证码正确，但确认用户失败：${confirmErr?.message || '未知错误'}。请联系管理员。`,
          },
          { status: 500 },
        );
      }
      const userEmail = (confirmedUser as any).email || email;
      // 登录用户：通过 Admin API generateLink(magiclink) 获取一次性 session
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });
        if (linkData && (linkData as any).properties?.action_link) {
          const actionUrl = new URL((linkData as any).properties.action_link);
          const hash = actionUrl.hash.replace(/^#/, '');
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            return NextResponse.json({
              success: true,
              verified: true,
              purpose,
              message: '注册验证成功，正在自动登录…',
              session: { access_token: accessToken, refresh_token: refreshToken },
              user: { id: userId, email: userEmail },
            });
          }
        }
      } catch {
        // 忽略会话生成失败，提示去密码登录
      }
      return NextResponse.json({
        success: true,
        verified: true,
        purpose,
        message: '邮箱验证成功。请使用账号密码登录。',
        redirectTo: '/login',
        user: { id: userId, email: userEmail },
      });
    }

    // ============== magic_login ==============
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (linkData && (linkData as any).properties?.action_link) {
        const actionUrl = new URL((linkData as any).properties.action_link);
        const hash = actionUrl.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          return NextResponse.json({
            success: true,
            verified: true,
            purpose,
            message: '验证码登录成功，正在进入首页…',
            session: { access_token: accessToken, refresh_token: refreshToken },
          });
        }
      }
    } catch (magicErr) {
      const msg = magicErr instanceof Error ? magicErr.message : String(magicErr);
      return NextResponse.json(
        {
          success: true,
          verified: true,
          purpose,
          message: `验证码正确，但自动登录失败：${msg}。请改用账号密码登录。`,
          redirectTo: '/login',
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      purpose,
      message: '验证码正确，请使用账号密码登录。',
      redirectTo: '/login',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `验证码处理异常：${msg}` }, { status: 500 });
  }
}
