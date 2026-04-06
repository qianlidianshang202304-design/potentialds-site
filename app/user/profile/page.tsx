'use client';

import { useState, useEffect } from 'react';
import { useSearchQuota } from '../../../hooks/useSearchQuota';
import { useSupabaseUser } from '../../../hooks/useSupabaseUser';
import { getSupabase } from '../../../lib/supabase';

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function UserProfilePage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const quota = useSearchQuota(user?.id);
  const [exportCount, setExportCount] = useState<{ today: number; month: number }>({ today: 0, month: 0 });

  useEffect(() => {
    if (!user?.id) return;
    const loadExportCount = async () => {
      const supabase = getSupabase();
      const { data } = await supabase.from('profiles').select('export_today, export_month, export_date').eq('id', user.id).maybeSingle();
      if (data) {
        const todayKey = getTodayKey();
        const row = data as { export_date?: string | null; export_today?: number | null; export_month?: number | null };
        const today = row.export_date === todayKey ? (row.export_today ?? 0) : 0;
        const month = row.export_month ?? 0;
        setExportCount({ today, month });
      }
    };
    loadExportCount();
  }, [user?.id]);

  if (userLoading || quota.loading) {
    return (
      <main className="min-h-screen bg-transparent text-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
            <div className="animate-pulse">
              <div className="h-8 w-32 rounded bg-zinc-200"></div>
              <div className="mt-4 h-4 w-64 rounded bg-zinc-200"></div>
              <div className="mt-6 h-40 rounded bg-zinc-200"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-transparent text-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
            <h1 className="text-2xl font-semibold text-slate-900">请先登录</h1>
            <p className="mt-4 text-sm text-zinc-600">您需要登录才能查看个人中心</p>
          </div>
        </div>
      </main>
    );
  }

  const used = quota.used ?? quota.profile?.browse_used ?? quota.profile?.search_count ?? 0;
  const limit = quota.limit ?? quota.profile?.browse_limit ?? 0;
  const isPaid = quota.profile?.is_paid ?? false;
  const subscriptionType = quota.profile?.subscription_type ?? 'free';

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">个人中心</h1>
          <p className="mt-2 text-sm text-zinc-600">欢迎回来，{user.email}</p>

          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">账户信息</h2>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">邮箱</span>
                  <span className="font-medium text-slate-900">{user.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">账户类型</span>
                  <span className={`font-medium ${isPaid ? 'text-green-600' : 'text-zinc-600'}`}>
                    {isPaid ? '付费用户' : '免费用户'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">额度使用情况</h2>
              <div className="mt-4 space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600">本月浏览额度</span>
                    <span className="font-medium text-slate-900">{used}/{limit}</span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600">今日导出额度</span>
                    <span className="font-medium text-slate-900">{exportCount.today}/{isPaid ? '10' : '1'}</span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min((exportCount.today / (isPaid ? 10 : 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600">本月导出额度</span>
                    <span className="font-medium text-slate-900">{exportCount.month}/{isPaid ? '300' : '1'}</span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min((exportCount.month / (isPaid ? 300 : 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <p className="text-xs text-zinc-500">
                  {isPaid ? '付费用户享受无限制额度' : '免费用户每月有固定额度'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">订阅信息</h2>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">当前套餐</span>
                  <span className="font-medium text-slate-900">
                    {subscriptionType === 'free' ? '免费版' : subscriptionType === 'monthly' ? '月付会员' : '年付会员'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">到期日期</span>
                  <span className="font-medium text-slate-900">
                    {subscriptionType === 'free' ? '永久免费' : '长期有效'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}