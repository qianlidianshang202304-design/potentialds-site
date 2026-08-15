import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

// 超时工具：防止 SMTP 连接卡死一直 pending
function withTimeout<T>(promise: Promise<T>, ms: number, hint: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${hint}（${ms}ms 超时）。请检查 SMTP 服务器地址、端口和网络是否可达。`)), ms);
    }),
  ]);
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const provider = String(body.provider || 'smtp').toLowerCase();
    const fromEmail = String(body.fromEmail || '').trim().toLowerCase();
    // 支持自定义收件人，默认发给自己（fromEmail）
    const testTo = String(body.testTo || body.fromEmail || '').trim().toLowerCase() || fromEmail;

    if (!fromEmail) return NextResponse.json({ error: '请先填写发信邮箱地址。' }, { status: 400 });
    if (!testTo) return NextResponse.json({ error: '缺少测试收件人地址。' }, { status: 400 });

    if (provider === 'smtp') {
      const profileId = String(body.id || '').trim();

      // 先从表单取，空值则从已有配置补（编辑场景）
      let smtpHost = String(body.smtpHost || '').trim();
      let smtpPort = Number(body.smtpPort || 0) || 465;
      let smtpUser = String(body.smtpUser || '').trim();
      let smtpPassword = String(body.smtpPassword || '').trim();
      let smtpSecure = body.smtpSecure !== false;

      if (profileId && (!smtpHost || !smtpUser || !smtpPassword)) {
        const { data: existing } = await admin
          .from('email_sending_profiles')
          .select('smtp_host,smtp_port,smtp_user,smtp_password,smtp_secure,from_email')
          .eq('id', profileId)
          .eq('user_id', authData.user.id)
          .maybeSingle();
        if (existing) {
          if (!smtpHost) smtpHost = existing.smtp_host || '';
          if (!smtpPort || smtpPort === 465 && Number(body.smtpPort || 0) === 0) smtpPort = Number(existing.smtp_port) || 465;
          if (!smtpUser) smtpUser = existing.smtp_user || '';
          if (!smtpPassword) smtpPassword = existing.smtp_password || '';
          if (body.smtpSecure === undefined) smtpSecure = existing.smtp_secure !== false;
        }
      }

      if (!smtpHost) return NextResponse.json({ error: '请填写 SMTP 服务器地址（如 smtp.qq.com）。' }, { status: 400 });
      if (!smtpUser) return NextResponse.json({ error: '请填写 SMTP 用户名（通常是完整邮箱地址）。' }, { status: 400 });
      if (!smtpPassword) return NextResponse.json({ error: '请填写 SMTP 授权码（注意：不是邮箱登录密码，是邮箱后台生成的授权码/应用专用密码）。' }, { status: 400 });

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPassword },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: { rejectUnauthorized: false },
      });

      // 第一步：验证 SMTP 连接（不发邮件，只握手验证账号密码）
      try {
        await withTimeout(
          transporter.verify(),
          15000,
          'SMTP 服务器连接失败',
        );
      } catch (verifyErr) {
        const msg = verifyErr instanceof Error ? verifyErr.message : 'SMTP 验证失败';
        let hint = '';
        if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo/i.test(msg)) {
          hint = '\n可能原因：\n1) SMTP 服务器地址或端口错误\n2) 服务器防火墙阻止了出站连接（端口 465/587/25）\n3) SSL/TLS 设置不匹配（465通常用SSL，587通常用TLS/STARTTLS）';
        } else if (/authentication|auth|password|invalid|credentials|5\.7\.\d|535/i.test(msg)) {
          hint = '\n认证失败！请检查：\n1) 用户名是完整邮箱地址\n2) 授权码正确（不是登录密码，需要在邮箱后台开启SMTP并生成授权码）\n3) QQ邮箱/163邮箱需要单独开启"客户端授权码"功能';
        }
        return NextResponse.json({ error: `SMTP 连接验证失败：${msg}${hint}`, stage: 'verify' }, { status: 400 });
      }

      // 第二步：实际发送测试邮件
      const senderName = String(body.senderName || '').trim();
      const fromHeader = senderName ? `${senderName} <${fromEmail}>` : fromEmail;

      try {
        await withTimeout(
          transporter.sendMail({
            from: fromHeader,
            to: testTo,
            subject: '【测试】SMTP 邮箱配置验证成功 - PotentialDS',
            html: `<p>这是一封测试邮件，确认您的 SMTP 配置可以正常发送邮件。</p>
<p>配置信息：<br/>
发信方式：SMTP<br/>
SMTP服务器：${smtpHost}:${smtpPort} (${smtpSecure ? 'SSL/TLS' : '非加密'})<br/>
发件地址：${fromEmail}<br/>
收件地址：${testTo}</p>
<p>如果您收到了这封邮件，说明配置正确，可以开始发送达人建联邮件了。</p>`,
            text: `这是一封测试邮件，确认您的 SMTP 配置可以正常发送邮件。\n\n配置：SMTP ${smtpHost}:${smtpPort}，发件人 ${fromEmail}。\n如果您收到了这封邮件，说明配置正确。`,
          }),
          25000,
          '发送测试邮件超时',
        );
      } catch (sendErr) {
        const msg = sendErr instanceof Error ? sendErr.message : '邮件发送失败';
        let hint = '';
        if (/recipient|550|553|mailbox unavailable|no such user/i.test(msg)) {
          hint = '\n收件人地址被拒绝，请确认收件邮箱真实存在。';
        } else if (/spam|rejected|content blocked|554/i.test(msg)) {
          hint = '\n邮件被判定为垃圾邮件被拦截，请调整邮件内容或联系邮箱服务商。';
        } else if (/daily|limit|quota|exceeded|too many/i.test(msg)) {
          hint = '\n邮箱当日发送配额已满，请稍后再试或升级邮箱套餐。';
        }
        return NextResponse.json({ error: `SMTP 连接成功，但发送测试邮件失败：${msg}${hint}`, stage: 'send' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `✅ 测试邮件已从 ${fromEmail} 发送到 ${testTo}，请检查收件箱（含垃圾邮件文件夹）。`, to: testTo });
    }

    // Resend 测试
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: '服务器未配置 RESEND_API_KEY 环境变量。请改用 SMTP 发送，或在 .env.local 中配置 Resend API Key。' }, { status: 400 });

    const senderName = String(body.senderName || '').trim();
    const fromHeader = senderName ? `${senderName} <${fromEmail}>` : fromEmail;

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 20000);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: fromHeader,
          to: [testTo],
          subject: '【测试】Resend 邮箱配置验证成功',
          html: '<p>这是一封测试邮件，确认您的 Resend 配置可以正常发送邮件。</p>',
        }),
        signal: timeoutController.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Resend 发送失败 (HTTP ${res.status}): ${err}` }, { status: 500 });
      }
    } catch (resendErr) {
      clearTimeout(timeoutId);
      const msg = resendErr instanceof Error ? resendErr.message : 'Resend 请求失败';
      if (resendErr instanceof Error && (resendErr as any).name === 'AbortError') {
        return NextResponse.json({ error: 'Resend API 请求超时，请检查网络连接。' }, { status: 500 });
      }
      return NextResponse.json({ error: `Resend 请求失败：${msg}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: `✅ 测试邮件已从 ${fromEmail} 发送到 ${testTo}，请检查收件箱。`, to: testTo });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '测试失败（未知错误）';
    return NextResponse.json({ error: `测试异常：${msg}` }, { status: 500 });
  }
}
