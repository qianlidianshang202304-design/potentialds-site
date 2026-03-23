'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseSafe } from '../../lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => /\S+@\S+\.\S+/.test(email) && username.trim().length >= 2 && password.trim().length >= 6, [email, password, username]);

  const register = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseSafe();
      if (!supabase) {
        setError('系统配置错误：Supabase 未配置，请联系管理员。');
        setLoading(false);
        return;
      }
      const emailRedirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { username },
        },
      });
      if (error) throw error;
      router.push(`/register/verify?email=${encodeURIComponent(email)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">注册</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">输入邮箱、用户名和密码，我们会发送验证码到邮箱。</p>

          <div className="mt-6 space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">邮箱</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-11 rounded-xl border border-zinc-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                inputMode="email"
                autoComplete="email"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">用户名</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="h-11 rounded-xl border border-zinc-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                autoComplete="username"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">密码</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="至少 6 位"
                className="h-11 rounded-xl border border-zinc-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                autoComplete="new-password"
              />
            </label>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <button
              type="button"
              onClick={register}
              disabled={!canSubmit || loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              创建账号并发送邮件
            </button>

            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>已有账号？</span>
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
