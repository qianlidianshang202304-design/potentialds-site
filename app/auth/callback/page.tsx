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

  const firstToken = useMemo(() => {
    // Supabase 邮件确认链接有多种格式：
    // 1) 旧版 query 模式：?token=xxx&type=signup  (&email=xxx)
    // 2) PKCE/新版 hash 模式：#access_token=xxx&refresh_token=xxx&expires_in=...&token_type=bearer&type=signup
    // 3) PKCE code 模式：?code=xxx (exchangeCodeForSession)
    // 4) Magiclink / 新版 signup：可能只带 token 不带 type
    if (typeof window === 'undefined') return { token: null, type: null, accessToken: null, refreshToken: null, code: null, email: null };

    const url = new URL(window.location.href);
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

      // 记录调试信息便于用户报告问题
      const debugParts: string[] = [];
      debugParts.push(`检测到参数: code=${code ? '有' : '无'}, token=${token ? '有' : '无'}, accessToken=${accessToken ? '有' : '无'}, type=${type}`);
      if (email) debugParts.push(`email=${email}`);
      if (typeof window !== 'undefined') {
        // 只显示路径，不暴露完整 token
        const url = new URL(window.location.href);
        debugParts.push(`URL路径: ${url.pathname}?${url.searchParams.toString().replace(/(token|code|access_token|refresh_token)=[^&]+/gi, '$1=***')}`);
        if (url.hash) debugParts.push(`存在 hash 参数`);
      }
      const debugStr = debugParts.join('\n');
      setDebugInfo(debugStr);

      try {
        // 场景 A：URL 带 code 参数（PKCE 新版）
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

        // 场景 B：hash 中已经带 access_token（新版 Supabase 直接返回会话）
        if (accessToken && refreshToken) {
          const res = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
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

        // 场景 C：query 中带 token（旧版 / email OTP 模式）
        if (token) {
          const verifyType = (type === 'signup'
            ? 'signup'
            : type === 'recovery'
              ? 'recovery'
              : type === 'invite'
                ? 'invite'
                : type === 'email' || type === 'magiclink'
                  ? 'email'
                  : 'signup') as 'signup' | 'recovery' | 'invite' | 'email';

          // 尝试两种方式：先带 email 尝试（新版需要），失败再不带 email
          let res;
          if (email) {
            try {
              res = await supabase.auth.verifyOtp({
                token_hash: token,
                type: verifyType,
                email: email,
              });
            } catch {
              // 忽略，重试下一个方式
            }
          }
          if (!res || res.error) {
            res = await supabase.auth.verifyOtp({
              token_hash: token,
              type: verifyType,
            });
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

        // 场景 D：没有任何 token
        setStatus('error');
        setMessage('验证链接缺少必要参数，请从邮件中重新点击完整链接。如果问题持续，请尝试使用电脑浏览器打开链接。');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          const text = e instanceof Error ? e.message : String(e);
          let userMsg = `验证失败：${text}`;
          if (/expired|过期|invalid/i.test(text)) {
            userMsg += '\n链接可能已过期，请重新注册或重新发送验证邮件。';
          } else if (/Missing code|missing.*code|code.*missing/i.test(text) || !code && !token && !accessToken) {
            userMsg += '\n请确保：1) 完整点击邮件中的链接（不要复制粘贴部分内容）；2) 如果使用手机邮件客户端，请选择"用浏览器打开"链接。';
          } else {
            userMsg += '。如链接已过期，请重新发送验证邮件。';
          }
          setMessage(userMsg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firstToken, router]);

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {status === 'success' ? '验证成功' : status === 'error' ? '验证失败' : '正在验证邮箱'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 whitespace-pre-wrap">{message}</p>

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
