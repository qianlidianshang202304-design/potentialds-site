'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getSupabaseSafe, ensureProfile, updateOwnProfile } from '../../../lib/supabase';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('正在验证链接，请稍候…');
  const [debugInfo, setDebugInfo] = useState<string>('');

  // 手动验证码输入（兜底方案）
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const firstToken = useMemo(() => {
    if (typeof window === 'undefined') return { token: null, type: null, accessToken: null, refreshToken: null, code: null, email: null };

    const url = new URL(window.location.href);

    // 正常的 query/hash 参数提取
    const token = searchParams.get('token') || url.searchParams.get('token');
    const type = searchParams.get('type') || url.searchParams.get('type') || 'signup';
    const code = searchParams.get('code') || url.searchParams.get('code');
    const email = searchParams.get('email') || url.searchParams.get('email');

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let hashType: string | null = null;
    let hashToken: string | null = null;
    if (url.hash && url.hash.length > 1) {
      const hashStr = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
      const hashParams = new URLSearchParams(hashStr);
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
      hashType = hashParams.get('type');
      hashToken = hashParams.get('token');
    }

    // 如果正常方式没拿到 token，尝试从 referrer 中提取（QQ 邮箱安全跳转场景）
    if (!token && !code && !accessToken) {
      const referrer = typeof document !== 'undefined' ? document.referrer : '';
      if (referrer && referrer.includes('supabase')) {
        try {
          const refUrl = new URL(referrer);
          const refToken = refUrl.searchParams.get('token');
          const refCode = refUrl.searchParams.get('code');
          const refEmail = refUrl.searchParams.get('email');
          const refType = refUrl.searchParams.get('type');
          if (refToken) return { token: refToken, type: refType || type, accessToken: null, refreshToken: null, code: refCode, email: refEmail || email };
          if (refCode) return { token: null, type: refType || type, accessToken: null, refreshToken: null, code: refCode, email: refEmail || email };
        } catch {}
      }
    }

    return {
      token: token || hashToken,
      type: hashType || type,
      accessToken,
      refreshToken,
      code,
      email,
    };
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseSafe();
      if (!supabase) {
        setStatus('error');
        setMessage('系统配置错误：Supabase 未配置。');
        return;
      }
      const { accessToken, refreshToken, token, type, code, email } = firstToken;

      // 记录调试信息
      const debugParts: string[] = [];
      debugParts.push(`参数: code=${code ? '有' : '无'}, token=${token ? '有' : '无'}, accessToken=${accessToken ? '有' : '无'}, type=${type}`);
      if (email) debugParts.push(`email=${email}`);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        debugParts.push(`URL: ${url.pathname}?${url.searchParams.toString().replace(/(token|code|access_token|refresh_token)=[^&]+/gi, '$1=***')}`);
        if (url.hash) debugParts.push(`存在 hash 参数`);
        if (document.referrer) debugParts.push(`来源: ${document.referrer.slice(0, 100)}`);
      }
      setDebugInfo(debugParts.join('\n'));

      try {
        // 场景 A：PKCE code
        if (code) {
          const res = await supabase.auth.exchangeCodeForSession(code);
          if (res.error) throw res.error;
          const user = res.data?.user;
          if (user) {
            await ensureProfile(user.id);
            await updateOwnProfile({ userId: user.id, email: user.email ?? null });
          }
          if (!cancelled) {
            setStatus('success');
            setMessage('邮箱验证成功，正在进入首页…');
            setTimeout(() => router.push('/'), 1000);
          }
          return;
        }

        // 场景 B：hash 中带 access_token
        if (accessToken && refreshToken) {
          const res = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (res.error) throw res.error;
          const user = res.data?.user;
          if (user) {
            await ensureProfile(user.id);
            await updateOwnProfile({ userId: user.id, email: user.email ?? null });
          }
          if (!cancelled) {
            setStatus('success');
            setMessage('邮箱验证成功，正在进入首页…');
            setTimeout(() => router.push('/'), 1000);
          }
          return;
        }

        // 场景 C：query 中带 token
        if (token) {
          const verifyType = (type === 'signup' ? 'signup'
            : type === 'recovery' ? 'recovery'
            : type === 'invite' ? 'invite'
            : type === 'email' || type === 'magiclink' ? 'email'
            : 'signup') as 'signup' | 'recovery' | 'invite' | 'email';

          let res;
          // 先带 email 尝试（新版 Supabase 需要）
          if (email) {
            try {
              res = await supabase.auth.verifyOtp({ token_hash: token, type: verifyType, email });
            } catch {}
          }
          // 不带 email 重试
          if (!res || res.error) {
            res = await supabase.auth.verifyOtp({ token_hash: token, type: verifyType });
          }
          if (res.error) throw res.error;
          const user = res.data?.user;
          if (user) {
            await ensureProfile(user.id);
            await updateOwnProfile({ userId: user.id, email: user.email ?? null });
          }
          if (!cancelled) {
            setStatus('success');
            setMessage('邮箱验证成功，正在进入首页…');
            setTimeout(() => router.push('/'), 1000);
          }
          return;
        }

        // 场景 D：没有任何 token — 显示手动验证码输入
        setStatus('error');
        setShowOtpInput(true);
        if (email) setOtpEmail(email);
        setMessage('验证链接缺少必要参数。\n这通常是因为邮箱客户端（如 QQ 邮箱）的安全跳转包裹了验证链接。\n\n你可以直接输入验证码完成验证：');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setShowOtpInput(true);
          if (email) setOtpEmail(email);
          const text = e instanceof Error ? e.message : String(e);
          let userMsg = `验证失败：${text}`;
          if (/expired|过期|invalid/i.test(text)) {
            userMsg += '\n链接可能已过期，请重新注册或重新发送验证邮件。';
          } else if (/Missing code|missing.*code|code.*missing/i.test(text)) {
            userMsg += '\n\n你可以直接输入验证码完成验证：';
          } else {
            userMsg += '\n\n你可以直接输入验证码完成验证：';
          }
          setMessage(userMsg);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [firstToken, router]);

  // 手动 OTP 验证（走自托管 OTP API，用 6 位数字验证码）
  const handleOtpVerify = async () => {
    if (!otpEmail || !otpCode) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const supabase = getSupabaseSafe();
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, code: otpCode, purpose: 'signup_confirm' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `验证失败 (HTTP ${res.status})`);
      }

      // 如果后端返回了 session，优先 setSession 实现自动登录
      if (data.session?.access_token && data.session?.refresh_token && supabase) {
        const setRes = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (!setRes.error) {
          const user = setRes.data?.user;
          if (user) {
            await ensureProfile(user.id);
            await updateOwnProfile({ userId: user.id, email: user.email ?? null });
          }
          setStatus('success');
          setMessage(data.message || '邮箱验证成功，正在进入首页…');
          setTimeout(() => router.push('/'), 1000);
          return;
        }
      }

      // 无 session 或 setSession 失败：按后端返回的 redirectTo 跳转
      setStatus('success');
      setMessage(data.message || '邮箱验证成功，正在前往登录页…');
      const redirect = data.redirectTo || '/login';
      setTimeout(() => router.push(redirect), 1000);
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : String(e));
    } finally {
      setOtpLoading(false);
    }
  };

  // 重新发送验证码：调用自托管 API，用你已配置的 SMTP 发 6 位纯数字验证码
  const handleResend = async () => {
    if (!otpEmail) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, purpose: 'signup_confirm' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `重新发送失败 (HTTP ${res.status})`);
      }
      setMessage(data.message || `验证码邮件已重新发送到 ${otpEmail}，请查收并输入 6 位验证码。`);
      setOtpError(data.hint ? `注意：${data.hint}` : null);
    } catch (e) {
      // 若自托管 OTP API 不可用，降级到 Supabase 原生 resend（仍会尝试，避免彻底卡死）
      try {
        const supabase = getSupabaseSafe();
        if (supabase) {
          const fallback = await supabase.auth.resend({ email: otpEmail, type: 'signup' });
          if (fallback.error) throw fallback.error;
          setMessage(
            `已通过备用渠道重新发送验证邮件到 ${otpEmail}（可能因 QQ 邮箱屏蔽而无法送达）。若仍收不到，请联系管理员。`,
          );
          return;
        }
      } catch {}
      setOtpError(e instanceof Error ? e.message : String(e));
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {status === 'success' ? '验证成功' : status === 'error' ? '验证失败' : '正在验证邮箱'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 whitespace-pre-wrap">{message}</p>

          {/* 手动验证码输入区域 */}
          {showOtpInput && status === 'error' ? (
            <div className="mt-5 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">注册邮箱</span>
                  <input
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
                    inputMode="email"
                  />
                </label>
              </div>
              <div>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">验证码</span>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6 位验证码"
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm tracking-widest outline-none focus:border-slate-900"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </label>
              </div>
              {otpError ? <p className="text-xs text-red-600">{otpError}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOtpVerify}
                  disabled={!otpEmail || !otpCode || otpLoading}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {otpLoading ? '验证中…' : '验证'}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!otpEmail || otpLoading}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                >
                  重新发送
                </button>
              </div>
            </div>
          ) : null}

          {status === 'error' && debugInfo ? (
            <details className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <summary className="cursor-pointer text-xs font-semibold text-zinc-500">技术调试信息（反馈时可提供）</summary>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-600 break-all">{debugInfo}</pre>
            </details>
          ) : null}

          <div className="mt-8 space-y-3">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              前往首页
            </Link>
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>还没完成验证？</span>
              <Link href="/register" className="font-semibold text-slate-900 underline underline-offset-4">
                重新注册
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
