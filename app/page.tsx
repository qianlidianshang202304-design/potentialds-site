'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Eye, FileText, Merge, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import QuotaModal from '../components/QuotaModal';
import { useSearchQuota } from '../hooks/useSearchQuota';
import { useSupabaseUser } from '../hooks/useSupabaseUser';

type Platform = 'Instagram' | 'YouTube' | 'TikTok';
type FollowerRange = 'any' | '0-10k' | '10k-100k' | '100k-1m' | '1m+';
type Region = 'any' | 'us';

const platforms: Platform[] = ['Instagram', 'YouTube', 'TikTok'];

const tools = [
  {
    title: 'Leadtracking',
    description: '全链路采集线索数据，自动同步到团队协作流。',
    href: '/leadtracking',
    icon: Database,
  },
  {
    title: 'TT透视眼',
    description: '洞察达人内容表现与商品趋势，辅助选品决策。',
    href: '/tt-insight',
    icon: Eye,
  },
  {
    title: 'PDF 排版助手',
    description: '一键重构文档结构，让复杂内容更清晰、更专业。',
    href: '/pdf-pro',
    icon: FileText,
  },
  {
    title: 'PDF 合并工具',
    description: '快速合并多份文件，统一输出高质量交付文档。',
    href: '/pdf-merge',
    icon: Merge,
  },
];

export default function Home() {
  const router = useRouter();
  const [activePlatform, setActivePlatform] = useState<Platform>('TikTok');
  const [followerRange, setFollowerRange] = useState<FollowerRange>('any');
  const [region, setRegion] = useState<Region>('any');
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { user } = useSupabaseUser();
  const quota = useSearchQuota(user?.id);
  const [quotaMessage, setQuotaMessage] = useState('本月浏览额度已用完，请付费升级。');

  const platformAccent = (platform: Platform) => {
    if (platform === 'Instagram') return 'text-[#E1306C]';
    if (platform === 'YouTube') return 'text-[#FF0000]';
    return 'text-slate-900';
  };

  const platformActiveStyle = (platform: Platform) => {
    if (platform === 'Instagram') return 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white shadow-sm';
    if (platform === 'YouTube') return 'bg-[#FF0000] text-white shadow-sm';
    return 'bg-slate-900 text-white shadow-sm';
  };

  const actionButtonStyle = () => {
    if (activePlatform === 'Instagram') return 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white hover:opacity-95';
    if (activePlatform === 'YouTube') return 'bg-[#FF0000] text-white hover:bg-[#d90000]';
    return 'bg-slate-900 text-white hover:bg-slate-700';
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <QuotaModal
        open={quotaModalOpen}
        title="额度已用完"
        message={quotaMessage}
        onClose={() => setQuotaModalOpen(false)}
      />
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white/80 px-6 py-10 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl md:px-9 md:py-14 lg:px-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-zinc-100/70 to-transparent" />
          <div className="relative">
            <p className="mb-4 inline-flex items-center rounded-full border border-zinc-200 bg-white/90 px-4 py-1 text-[11px] font-semibold tracking-[0.14em] text-zinc-600 uppercase">
              Professional Creator Marketing OS
            </p>
            <h1 className="text-[clamp(0.9rem,4.2vw,3.8rem)] font-semibold leading-tight tracking-tight whitespace-nowrap text-slate-900">
              全球全平台达人数据分析 &amp; 营销平台
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              从达人发现、数据洞察到营销执行，一站式覆盖 IG、YouTube、TikTok 的增长工作流。
            </p>

            <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3 sm:p-4">
              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => {
                  const isActive = activePlatform === platform;
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setActivePlatform(platform)}
                      className={`rounded-xl border border-zinc-200/80 px-4 py-2 text-sm font-medium transition-all sm:px-5 ${
                        isActive
                          ? platformActiveStyle(platform)
                          : `bg-white/90 text-zinc-600 hover:bg-white ${platformAccent(platform)}`
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">粉丝量</span>
                  <select
                    value={followerRange}
                    onChange={(event) => setFollowerRange(event.target.value as FollowerRange)}
                    className="h-10 rounded-lg border border-zinc-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  >
                    <option value="any">不限</option>
                    <option value="0-10k">0 - 1 万</option>
                    <option value="10k-100k">1 万 - 10 万</option>
                    <option value="100k-1m">10 万 - 100 万</option>
                    <option value="1m+">100 万以上</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">国家地区</span>
                  <select
                    value={region}
                    onChange={(event) => setRegion(event.target.value as Region)}
                    className="h-10 rounded-lg border border-zinc-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  >
                    <option value="any">不限</option>
                    <option value="us">北美 · 美国</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center rounded-lg px-3 py-2">
                  <Search size={20} className="mr-3 text-zinc-400" />
                  <input
                    type="text"
                    aria-label={`${activePlatform} influencer search`}
                    placeholder={`搜索 ${activePlatform} 达人名称 / 账号 / 关键词`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-zinc-400 sm:text-base"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!user?.id) {
                      router.push('/login');
                      return;
                    }
                    if (user?.id && !quota.loading && quota.canSearch === false && quota.reason) {
                      setQuotaMessage(quota.message ?? '本月浏览额度已用完，请付费升级。');
                      setQuotaModalOpen(true);
                      return;
                    }
                    const platform = activePlatform.toLowerCase();
                    const params = new URLSearchParams();
                    params.set('platform', platform);
                    params.set('followers', followerRange);
                    params.set('region', region);
                    if (query.trim()) params.set('q', query.trim());
                    router.push(`/creator-workbench?${params.toString()}`);
                  }}
                  className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition sm:text-base ${actionButtonStyle()}`}
                >
                  开始搜索
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          id="tools-center"
          className="relative mt-10 overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white/80 p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-5"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-zinc-100/70 to-transparent" />
          <div className="relative">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Products & Downloads</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">产品系列与下载中心</h2>
                <p className="mt-2 text-xs text-zinc-600 sm:text-sm">在一个列表中查看全部工具，并跳转到各工具的独立介绍与下载页面。</p>
              </div>
              <span className="hidden rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-xs font-medium text-zinc-500 sm:inline-flex">
                首页直达 · 全部工具
              </span>
            </div>

            <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.35)]">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <li
                    key={tool.title}
                    className="group flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="inline-flex rounded-lg bg-zinc-100 p-2.5 text-zinc-700">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{tool.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-600 sm:text-sm">{tool.description}</p>
                      </div>
                    </div>
                    <Link
                      href={tool.href}
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-slate-900 hover:text-slate-900 sm:text-sm"
                    >
                      立即使用
                      <ArrowRight size={14} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
