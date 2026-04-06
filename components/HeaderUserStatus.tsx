'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { getSupabaseSafe } from '../lib/supabase';
import { useSearchQuota } from '../hooks/useSearchQuota';
import { useSupabaseUser } from '../hooks/useSupabaseUser';

export default function HeaderUserStatus() {
  const { user, loading: userLoading } = useSupabaseUser();
  const quota = useSearchQuota(user?.id);

  const label = useMemo(() => {
    if (!quota.profile) return null;
    return quota.profile.is_paid ? '已付费' : '试用中';
  }, [quota.profile]);

  if (userLoading) {
    return <div className="h-7 w-24 rounded-full bg-white/60" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-[12px] font-medium text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
      >
        登录
      </Link>
    );
  }

  if (quota.loading) {
    return <div className="h-7 w-40 rounded-full bg-white/60" />;
  }

  const used = quota.used ?? quota.profile?.browse_used ?? quota.profile?.search_count ?? null;
  const limit = quota.limit ?? quota.profile?.browse_limit ?? null;
  const exportToday = quota.profile?.export_today ?? 0;
  const exportMonth = quota.profile?.export_month ?? 0;
  const subscriptionType = quota.profile?.subscription_type ?? 'free';
  const isPaid = quota.profile?.is_paid ?? false;

  return (
    <div className="flex items-center gap-2">
      <div className="relative group">
        <Link
          href="/user/profile"
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-white/80 px-3 py-1 text-[12px] font-medium text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          个人中心
        </Link>
        <div className="absolute right-0 top-full mt-1 hidden group-hover:block rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-[11px] text-zinc-600 shadow-lg whitespace-nowrap">
          <div className="space-y-1">
            <div>本月浏览: {typeof limit === 'number' ? `${used ?? 0}/${limit}` : used ?? '—'}</div>
            <div>今日导出: {exportToday}/{isPaid ? '10' : '1'}</div>
            <div>本月导出: {exportMonth}/{isPaid ? '300' : '1'}</div>
            <div>会员类型: {subscriptionType === 'free' ? '免费版' : subscriptionType === 'monthly' ? '月付会员' : '年付会员'}</div>
            <div>到期日期: {subscriptionType === 'free' ? '永久免费' : '长期有效'}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-3 py-1 text-[12px] text-zinc-700 min-h-[28px]">
        {label && (
          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-600 flex-shrink-0">
            {label}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          const supabase = getSupabaseSafe();
          if (supabase) {
            supabase.auth.signOut();
          }
        }}
        className="inline-flex items-center rounded-lg border border-zinc-200 bg-white/80 px-3 py-1 text-[12px] font-medium text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
      >
        退出
      </button>
    </div>
  );
}
