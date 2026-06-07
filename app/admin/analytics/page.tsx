'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Route, ShieldAlert } from 'lucide-react';
import { getSupabaseSafe } from '../../../lib/supabase';

type AnalyticsData = {
  totalEvents: number;
  entryPaths: Array<{ label: string; count: number }>;
  trafficSources: Array<{ label: string; count: number }>;
  eventNames: Array<{ label: string; count: number }>;
  securityEvents: Array<{
    event_type: string;
    risk_score: number;
    route: string;
    reasons: string[];
    request_count: number;
    occurred_at: string;
  }>;
};

function MetricList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3 py-2 text-sm">
            <span className="truncate text-zinc-700">{item.label}</span>
            <span className="font-semibold tabular-nums">{item.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseSafe();
      if (!supabase) return;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError('请先登录管理员账号');
        return;
      }
      const response = await fetch('/api/admin/analytics', {
        headers: { authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || '加载失败');
        return;
      }
      setData(json as AnalyticsData);
    };
    void load();
  }, []);

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6">
        <div className="flex items-center gap-3">
          <BarChart3 size={26} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Private Analytics</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">流量入口与异常访问</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-600">最近 30 天；入口和转化用于产品优化，风险事件用于识别爬虫与滥用。</p>

        {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {!data && !error ? <div className="mt-8 text-sm text-zinc-500">正在加载...</div> : null}

        {data ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [Route, '记录事件', data.totalEvents],
                [ShieldAlert, '风险事件', data.securityEvents.length],
                [AlertTriangle, '高风险事件', data.securityEvents.filter((item) => item.risk_score >= 70).length],
              ].map(([Icon, label, value]) => {
                const Component = Icon as typeof Route;
                return (
                  <div key={String(label)} className="rounded-xl border border-zinc-200 bg-white/90 p-4">
                    <Component size={18} className="text-zinc-500" />
                    <div className="mt-3 text-xs text-zinc-500">{String(label)}</div>
                    <div className="mt-1 text-2xl font-semibold">{String(value)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <MetricList title="入口页面" items={data.entryPaths} />
              <MetricList title="流量来源" items={data.trafficSources} />
              <MetricList title="核心事件" items={data.eventNames} />
            </div>

            <section className="mt-5 rounded-2xl border border-zinc-200 bg-white/90 p-5">
              <h2 className="text-base font-semibold">异常访问记录</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-zinc-500"><tr><th className="px-3 py-2">时间</th><th className="px-3 py-2">类型</th><th className="px-3 py-2">风险</th><th className="px-3 py-2">路径</th><th className="px-3 py-2">原因</th></tr></thead>
                  <tbody>
                    {data.securityEvents.map((item, index) => (
                      <tr key={`${item.occurred_at}-${index}`} className="border-t border-zinc-100">
                        <td className="whitespace-nowrap px-3 py-2">{new Date(item.occurred_at).toLocaleString('zh-CN')}</td>
                        <td className="px-3 py-2">{item.event_type}</td>
                        <td className="px-3 py-2 font-semibold">{item.risk_score}</td>
                        <td className="max-w-56 truncate px-3 py-2">{item.route}</td>
                        <td className="px-3 py-2">{item.reasons?.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
