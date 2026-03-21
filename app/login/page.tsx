'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase, ensureProfile, updateOwnProfile } from '../../lib/supabase';

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const anyError = error as Record<string, unknown>;
    if (typeof anyError.message === 'string') return anyError.message;
    if (typeof anyError.error === 'string') return anyError.error;
    try {
      return JSON.stringify(anyError);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => identifier.trim().length > 0 && password.trim().length >= 6, [identifier, password]);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const raw = identifier.trim();
      let email = raw;

      if (!raw.includes('@')) {
        const res = await fetch('/api/auth/resolve-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: raw }),
        });
        if (!res.ok) {
          throw new Error('用户名不存在或无法登录');
        }
        const json = (await res.json()) as { email?: string };
        if (!json.email) throw new Error('用户名不存在或无法登录');
        email = json.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('登录失败');
      try {
        await ensureProfile(data.user.id);
        await updateOwnProfile({ userId: data.user.id, email: data.user.email ?? null });
      } catch {}
      router.push('/');
      router.refresh();
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">登录</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">支持邮箱或用户名 + 密码登录。</p>

          <div className="mt-6 space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">邮箱或用户名</span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@example.com 或 username"
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
                autoComplete="current-password"
              />
            </label>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <button
              type="button"
              onClick={signIn}
              disabled={!canSubmit || loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              登录
            </button>

            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>忘记密码？</span>
              <Link href="/forgot-password" className="font-semibold text-slate-900 underline underline-offset-4">
                找回密码
              </Link>
            </div>

            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>还没有账号？</span>
              <Link href="/register" className="font-semibold text-slate-900 underline underline-offset-4">
                去注册
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
