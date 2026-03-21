'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureProfile, getSupabase, updateOwnProfile } from '../../../lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) throw new Error('Missing code');

        const supabase = getSupabase();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (!data.user) throw new Error('Missing user');

        await ensureProfile(data.user.id);
        const username = (data.user.user_metadata as { username?: string } | null)?.username ?? null;
        await updateOwnProfile({ userId: data.user.id, email: data.user.email ?? null, username });

        router.push('/');
        router.refresh();
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">正在完成登录…</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">请稍候，正在同步账号信息。</p>
          {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        </section>
      </div>
    </main>
  );
}

