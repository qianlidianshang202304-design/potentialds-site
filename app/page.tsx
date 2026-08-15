'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Eye, FileText, Merge, Search, Subtitles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import QuotaModal from '../components/QuotaModal';
import { useSearchQuota } from '../hooks/useSearchQuota';
import { useSupabaseUser } from '../hooks/useSupabaseUser';

type Platform = 'Instagram' | 'YouTube' | 'TikTok';
type FollowerRange = 'any' | '0-1k' | '1k-5k' | '5k-10k' | '10k-50k' | '50k-100k' | '100k-500k' | '500k-1m' | '1m+' | 'custom';
type Region = 'any' | 'us' | 'ca' | 'jp' | 'kr' | 'uk' | 'de' | 'fr' | 'au' | 'sg';
type SearchMode = 'name' | 'tag';

const platforms: Platform[] = ['Instagram', 'YouTube', 'TikTok'];

const followerOptions: { value: FollowerRange; label: string }[] = [
  { value: 'any', label: '不限' },
  { value: '0-1k', label: '0 - 1,000' },
  { value: '1k-5k', label: '1,000 - 5,000' },
  { value: '5k-10k', label: '5,000 - 1万' },
  { value: '10k-50k', label: '1万 - 5万' },
  { value: '50k-100k', label: '5万 - 10万' },
  { value: '100k-500k', label: '10万 - 50万' },
  { value: '500k-1m', label: '50万 - 100万' },
  { value: '1m+', label: '100万以上' },
  { value: 'custom', label: '自定义' },
];

const regionGroups: { group: string; options: { value: Region; label: string }[] }[] = [
  { group: '不限', options: [{ value: 'any', label: '全部地区' }] },
  { group: '北美', options: [{ value: 'us', label: '美国' }, { value: 'ca', label: '加拿大' }] },
  { group: '亚太', options: [{ value: 'jp', label: '日本' }, { value: 'kr', label: '韩国' }, { value: 'sg', label: '新加坡' }, { value: 'au', label: '澳大利亚' }] },
  { group: '欧洲', options: [{ value: 'uk', label: '英国' }, { value: 'de', label: '德国' }, { value: 'fr', label: '法国' }] },
];

const creatorTools = [
  { title: 'Leadtracking', description: '低成本采集线索数据，让中小团队也能搭建自己的增长流程。', href: '/leadtracking', icon: Database },
  { title: 'TT透视眼', description: '减少选品和达人判断的信息差，用更低门槛看懂 TikTok 数据。', href: '/tt-insight', icon: Eye },
  { title: 'TikTok 达人精灵·字幕', description: '在 TikTok 视频页自动生成中文字幕，本地 whisper 离线转写，保护隐私。', href: '/tt-subtitle', icon: Subtitles },
];

const officeTools = [
  { title: 'PDF 排版助手', description: '把复杂文档处理做成人人用得起的效率工具。', href: '/pdf-pro', icon: FileText },
  { title: 'PDF 合并工具', description: '简单、稳定、低门槛地完成日常文件合并工作。', href: '/pdf-merge', icon: Merge },
];

export default function Home() {
  const router = useRouter();
  const [activePlatform, setActivePlatform] = useState<Platform>('TikTok');
  const [followerRange, setFollowerRange] = useState<FollowerRange>('any');
  const [customFollowerMin, setCustomFollowerMin] = useState('');
  const [customFollowerMax, setCustomFollowerMax] = useState('');
  const [region, setRegion] = useState<Region>('any');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { user } = useSupabaseUser();
  const quota = useSearchQuota(user?.id);
  const [quotaMessage, setQuotaMessage] = useState('本月浏览额度已用完，请付费升级。');

  const platformActiveStyle = (platform: Platform) => {
    if (platform === 'Instagram') return 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white';
    if (platform === 'YouTube') return 'bg-[#FF0000] text-white';
    return 'bg-slate-900 text-white';
  };

  const actionButtonStyle = () => {
    if (activePlatform === 'Instagram') return 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white hover:opacity-95';
    if (activePlatform === 'YouTube') return 'bg-[#FF0000] text-white hover:bg-[#d90000]';
    return 'bg-slate-900 text-white hover:bg-slate-700';
  };

  const handleSearch = () => {
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
    params.set('searchMode', searchMode);
    if (query.trim()) params.set('q', query.trim());
    if (followerRange === 'custom') {
      if (customFollowerMin) params.set('followerMin', customFollowerMin);
      if (customFollowerMax) params.set('followerMax', customFollowerMax);
    }
    router.push(`/creator-workbench?${params.toString()}`);
  };

  return (
    <main className="min-h-screen text-slate-900" style={{
      backgroundImage: `url(/images/site-bg.webp)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>
      <QuotaModal open={quotaModalOpen} title="额度已用完" message={quotaMessage} onClose={() => setQuotaModalOpen(false)} />
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="relative overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/80 px-4 py-8 shadow-[0_24px_50px_-36px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/60 to-transparent" />
          <div className="relative">
            <p className="mb-3 text-center text-[10px] font-semibold tracking-[0.14em] text-zinc-600 uppercase sm:mb-4 sm:text-[11px]">
              Affordable SaaS Tools For Real Teams
            </p>
            <h1 className="text-center text-[clamp(1.2rem,8vw,2.5rem)] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[clamp(1.5rem,6vw,3rem)] lg:text-[clamp(1.8rem,5vw,3.8rem)]">
              打破信息差，做大家都用得起的 SaaS 服务软件
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-relaxed text-zinc-500 sm:mt-4 sm:text-sm lg:text-base">
              从达人发现、数据洞察到办公效率，把原本昂贵复杂的工具做得更轻、更清楚、更适合中小团队长期使用。
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3 sm:mt-8 sm:p-4 lg:p-5">
              <div className="mb-4 flex flex-wrap justify-center gap-2 sm:mb-5">
                {platforms.map((platform) => {
                  const isActive = activePlatform === platform;
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setActivePlatform(platform)}
                      className={`rounded-full px-4 py-2 text-xs font-medium transition-all sm:px-5 sm:py-2.5 sm:text-sm ${
                        isActive ? platformActiveStyle(platform) : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex w-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:px-4 sm:py-3">
                  <div className="flex shrink-0 items-center gap-1.5 sm:mr-3 sm:border-r sm:border-zinc-200 sm:pr-3">
                    <button
                      type="button"
                      onClick={() => setSearchMode('name')}
                      className={`rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all sm:px-3 sm:text-xs ${
                        searchMode === 'name' ? 'bg-slate-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      频道
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchMode('tag')}
                      className={`rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all sm:px-3 sm:text-xs ${
                        searchMode === 'tag' ? 'bg-slate-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      标签
                    </button>
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <Search size={16} className="shrink-0 text-zinc-400" />
                    <input
                      type="text"
                      aria-label={`${activePlatform} influencer search`}
                      placeholder={searchMode === 'name' ? '搜索达人频道 / Handle' : '搜索标签 / 关键词'}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                      className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-zinc-400 sm:text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium transition sm:px-5 sm:py-2 sm:text-sm ${actionButtonStyle()}`}
                  >
                    搜索
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 sm:text-xs">粉丝量</span>
                    <select
                      value={followerRange}
                      onChange={(e) => setFollowerRange(e.target.value as FollowerRange)}
                      className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[10px] text-slate-900 outline-none transition focus:border-slate-900 sm:h-8 sm:px-3 sm:text-xs"
                    >
                      {followerOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {followerRange === 'custom' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="最小"
                          value={customFollowerMin}
                          onChange={(e) => setCustomFollowerMin(e.target.value)}
                          className="h-7 w-16 rounded-lg border border-zinc-200 bg-white px-2 text-[10px] text-slate-900 outline-none sm:h-8 sm:w-20 sm:text-xs"
                        />
                        <span className="text-[10px] text-zinc-400 sm:text-xs">-</span>
                        <input
                          type="number"
                          placeholder="最大"
                          value={customFollowerMax}
                          onChange={(e) => setCustomFollowerMax(e.target.value)}
                          className="h-7 w-16 rounded-lg border border-zinc-200 bg-white px-2 text-[10px] text-slate-900 outline-none sm:h-8 sm:w-20 sm:text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="hidden h-5 w-px bg-zinc-200 sm:block" />

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 sm:text-xs">地区</span>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value as Region)}
                      className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[10px] text-slate-900 outline-none transition focus:border-slate-900 sm:h-8 sm:px-3 sm:text-xs"
                    >
                      {regionGroups.map((group) => (
                        <optgroup key={group.group} label={group.group}>
                          {group.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-8 overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/80 p-3 shadow-[0_14px_36px_-30px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:mt-10 sm:p-4 lg:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/50 to-transparent" />
          <div className="relative">
            <div className="mb-4 sm:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 sm:text-[11px]">PRODUCTS & DOWNLOADS</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:mt-2 lg:text-xl">产品系列与下载中心</h2>
              <p className="mt-1 text-[10px] text-zinc-600 sm:mt-2 sm:text-xs lg:text-sm">围绕达人营销、数据分析和办公效率，持续提供低门槛、可负担的工具。</p>
            </div>

            {/* 达人营销工具 */}
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 sm:text-sm">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                达人营销工具
              </h3>
              <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.35)]">
                {creatorTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.title} className="group flex items-center justify-between border-b border-zinc-100 px-3 py-3 last:border-b-0 sm:px-4 lg:px-5">
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <div className="inline-flex rounded-lg bg-indigo-50 p-2 text-indigo-700 sm:p-1.5">
                          <Icon style={{ width: '16px', height: '16px' }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900 lg:text-base">{tool.title}</h3>
                          <p className="mt-0.5 text-[10px] leading-4 text-zinc-600 sm:mt-1 sm:text-xs lg:text-sm">{tool.description}</p>
                        </div>
                      </div>
                      <Link href={tool.href} className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-medium text-indigo-700 transition hover:border-indigo-600 hover:text-indigo-700 sm:text-xs lg:px-3 lg:py-1.5">
                        立即使用
                        <ArrowRight size={10} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* 办公效率工具 */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 sm:text-sm">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                办公效率工具
              </h3>
              <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.35)]">
                {officeTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.title} className="group flex items-center justify-between border-b border-zinc-100 px-3 py-3 last:border-b-0 sm:px-4 lg:px-5">
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <div className="inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-700 sm:p-1.5">
                          <Icon style={{ width: '16px', height: '16px' }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900 lg:text-base">{tool.title}</h3>
                          <p className="mt-0.5 text-[10px] leading-4 text-zinc-600 sm:mt-1 sm:text-xs lg:text-sm">{tool.description}</p>
                        </div>
                      </div>
                      <Link href={tool.href} className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-medium text-emerald-700 transition hover:border-emerald-600 hover:text-emerald-700 sm:text-xs lg:px-3 lg:py-1.5">
                        立即使用
                        <ArrowRight size={10} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
