'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseSafe } from '../../../lib/supabase';

export default function RegisterVerifyPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-transparent text-slate-900" />}>
      <RegisterVerifyInner />
    </Suspense>
  );
}

function RegisterVerifyInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const canResend = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  }, [cooldownUntil]);

  useEffect(() => {
    if (!cooldownUntil) return;
    if (cooldownSeconds <= 0) {
      setCooldownUntil(null);
      return;
    }
    const id = window.setInterval(() => {
      setCooldownUntil((prev) => prev);
    }, 500);
    return () => window.clearInterval(id);
  }, [cooldownSeconds, cooldownUntil]);

  const resend = async () => {
    if (!canResend || loading || cooldownSeconds > 0) return;
    setLoading(true);
    setHint(null);
    setError(null);
    try {
      const supabase = getSupabaseSafe();
      if (!supabase) {
        setError('系统配置错误：Supabase 未配置，请联系管理员。');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setHint('已重新发送验证邮件，请检查收件箱与垃圾邮件。');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.toLowerCase().includes('rate limit')) {
        setCooldownUntil(Date.now() + 5 * 60 * 1000);
        setError('发送过于频繁，已触发邮件限流。请等待一段时间后再试。');
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">检查邮箱</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            我们已向 {email || '你的邮箱'} 发送了一封验证邮件。请点击邮件里的链接完成注册。
          </p>

          <div className="mt-6 space-y-4">
            {hint ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{hint}</div> : null}
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <button
              type="button"
              onClick={resend}
              disabled={!canResend || loading || cooldownSeconds > 0}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cooldownSeconds > 0 ? `请稍候（${cooldownSeconds}s）` : '重新发送验证邮件'}
            </button>

            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>收不到邮件？</span>
              <Link href="/register" className="font-semibold text-slate-900 underline underline-offset-4">
                换个邮箱
              </Link>
            </div>

            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>已经验证完成？</span>
              <Link href="/login" className="font-semibold text-slate-900 underline underline-offset-4">
                去登录
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
