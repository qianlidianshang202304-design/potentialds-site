'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseSafe } from '../../../lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => password.trim().length >= 6 && password === confirm, [confirm, password]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const supabase = getSupabaseSafe();
        if (!supabase) {
          setError('系统配置错误：Supabase 未配置，请联系管理员。');
          setLoading(false);
          return;
        }

        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const session = await supabase.auth.getSession();
        if (session.error) throw session.error;
        if (!session.data.session?.user) {
          setError('重置链接无效或已过期，请重新发送重置邮件。');
          setLoading(false);
          return;
        }

        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = async () => {
    if (!canSubmit) return;
    setHint(null);
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseSafe();
      if (!supabase) {
        setError('系统配置错误：Supabase 未配置，请联系管理员。');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setHint('密码已更新，可以使用新密码登录。');
      setTimeout(() => {
        router.push('/login');
        router.refresh();
      }, 600);
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
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">重置密码</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">设置一个新密码（至少 6 位）。</p>

          <div className="mt-6 space-y-4">
            {hint ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{hint}</div> : null}
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {loading ? (
              <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-600">正在校验链接…</div>
            ) : null}

            {ready ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">新密码</span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="至少 6 位"
                    className="h-11 rounded-xl border border-zinc-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    autoComplete="new-password"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">确认新密码</span>
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    type="password"
                    placeholder="再次输入"
                    className="h-11 rounded-xl border border-zinc-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    autoComplete="new-password"
                  />
                </label>

                <button
                  type="button"
                  onClick={update}
                  disabled={!canSubmit || loading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  保存新密码
                </button>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
