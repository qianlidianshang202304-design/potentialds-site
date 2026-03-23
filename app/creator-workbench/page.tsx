'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Chrome, Search, Youtube } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuotaModal from '../../components/QuotaModal';
import { getSupabase, incrementProfileBrowseCount } from '../../lib/supabase';
import { useSearchQuota } from '../../hooks/useSearchQuota';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';

type Platform = 'All' | 'Instagram' | 'YouTube' | 'TikTok';
type FollowerRange = 'any' | '0-10k' | '10k-100k' | '100k-1m' | '1m+';
type Region = 'any' | 'us';

const platforms: Platform[] = ['All', 'Instagram', 'YouTube', 'TikTok'];

type InfluencerRow = {
  nickname?: string | null;
  username?: string | null;
  fans_num?: number | null;
  view_avg?: number | null;
  region_zh?: string | null;
  tags?: string | null;
  link?: string | null;
  platform?: string | null;
  region?: string | null;
};

function PlatformBadge({ value }: { value: string | null | undefined }) {
  const v = (value ?? '').toLowerCase();
  if (v === 'youtube') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        <Youtube size={12} />
        YouTube
      </span>
    );
  }
  if (v === 'instagram') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-pink-700">
        <Chrome size={12} />
        Instagram
      </span>
    );
  }
  if (v === 'tiktok') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
        <span className="inline-block h-2 w-2 rounded-full bg-slate-900" />
        TikTok
      </span>
    );
  }
  return null;
}

function platformToValue(platform: Platform) {
  if (platform === 'All') return null;
  if (platform === 'Instagram') return 'instagram';
  if (platform === 'YouTube') return 'youtube';
  return 'tiktok';
}

function followerRangeToBounds(range: FollowerRange) {
  if (range === '0-10k') return { min: 0, max: 10_000 };
  if (range === '10k-100k') return { min: 10_000, max: 100_000 };
  if (range === '100k-1m') return { min: 100_000, max: 1_000_000 };
  if (range === '1m+') return { min: 1_000_000, max: null as number | null };
  return { min: null as number | null, max: null as number | null };
}

function formatCompactZh(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return '-';
  if (value >= 10_000) {
    const w = value / 10_000;
    const fixed = w >= 100 ? w.toFixed(0) : w >= 10 ? w.toFixed(1) : w.toFixed(2);
    return `${fixed.replace(/\.0+$/, '')}万`;
  }
  return new Intl.NumberFormat('zh-CN').format(value);
}

export default function CreatorWorkbenchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePlatform, setActivePlatform] = useState<Platform>('All');
  const [followerRange, setFollowerRange] = useState<FollowerRange>('any');
  const [region, setRegion] = useState<Region>('any');
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<InfluencerRow[]>([]);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState('本月浏览额度已用完，请付费升级。');

  const { user } = useSupabaseUser();
  const quota = useSearchQuota(user?.id);

  useEffect(() => {
    if (initializedFromUrl) return;
    const p = (searchParams.get('platform') ?? '').toLowerCase();
    const f = (searchParams.get('followers') ?? '').toLowerCase();
    const r = (searchParams.get('region') ?? '').toLowerCase();
    const q = searchParams.get('q') ?? '';

    if (p === 'instagram') setActivePlatform('Instagram');
    else if (p === 'youtube') setActivePlatform('YouTube');
    else if (p === 'tiktok') setActivePlatform('TikTok');
    else if (p === 'all') setActivePlatform('All');

    if (f === '0-10k' || f === '10k-100k' || f === '100k-1m' || f === '1m+' || f === 'any') {
      setFollowerRange(f as FollowerRange);
    }

    if (r === 'us') setRegion('us');
    else if (r === 'any') setRegion('any');

    if (q) setQuery(q);

    setPage(1);
    setHasAutoLoaded(false);
    setInitializedFromUrl(true);
  }, [initializedFromUrl, searchParams]);

  const runSearch = useCallback(
    async (shouldCount: boolean = true, targetPage?: number) => {
      if (!user?.id) {
        router.push('/login');
        return;
      }
      if (!quota.loading && quota.canSearch === false && quota.reason) {
        setQuotaMessage(quota.message ?? '本月浏览额度已用完，请付费升级。');
        setQuotaModalOpen(true);
        return;
      }
      if (typeof quota.remaining === 'number' && quota.remaining <= 0) {
        setQuotaMessage(quota.message ?? '本月浏览额度已用完，请付费升级。');
        setQuotaModalOpen(true);
        return;
      }

      setLoading(true);
      setError(null);

      const supabase = getSupabase();
      const baseColumns = ['nickname', 'username', 'fans_num', 'view_avg', 'region_zh', 'tags', 'link', 'platform', 'region'];
      const missingColumns = new Set<string>();
      const pageSize = 10;
      const effectivePage = targetPage ?? page;
      const pageFrom = (effectivePage - 1) * pageSize;
      const pageTo = pageFrom + pageSize - 1;

      const bounds = followerRangeToBounds(followerRange);
      const platformValue = platformToValue(activePlatform);
      const keyword = query.trim();

      try {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const cols = baseColumns.filter((c) => !missingColumns.has(c));
          let qy = supabase.from('influencers').select(cols.join(','), { count: 'exact' }).range(pageFrom, pageTo);

          if (platformValue && !missingColumns.has('platform')) qy = qy.eq('platform', platformValue);
          if (region !== 'any' && !missingColumns.has('region')) qy = qy.eq('region', region);

          if (!missingColumns.has('fans_num')) {
            if (bounds.min !== null) qy = qy.gte('fans_num', bounds.min);
            if (bounds.max !== null) qy = qy.lte('fans_num', bounds.max);
            qy = qy.order('fans_num', { ascending: false, nullsFirst: false });
          }

          if (keyword && !missingColumns.has('nickname') && !missingColumns.has('username')) {
            const safe = keyword.replace(/,/g, ' ');
            qy = qy.or(`nickname.ilike.%${safe}%,username.ilike.%${safe}%`);
          }

          const { data, error, count } = await qy;
          if (!error) {
            const rows = (data ?? []) as unknown as InfluencerRow[];
            setResults(rows);
            setLastFetchedAt(Date.now());
            setTotalCount(typeof count === 'number' ? count : null);
            try {
              if (shouldCount) await incrementProfileBrowseCount(user.id, rows.length);
            } catch {}
            quota.refresh();
            setLoading(false);
            return;
          }

          const message = (error as { message?: string }).message ?? '';
          const match = message.match(/Could not find the '([^']+)' column/);
          if (match) {
            missingColumns.add(match[1]);
            continue;
          }

          throw error;
        }

        throw new Error('搜索失败：字段与数据库结构不匹配（已多次重试）');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    },
    [activePlatform, followerRange, page, query, quota.canSearch, quota.loading, quota.reason, region, router, user?.id],
  );

  useEffect(() => {
    if (hasAutoLoaded) return;
    if (!user?.id) return;
    if (quota.loading) return;
    if (quota.canSearch === false && quota.reason) return;
    setHasAutoLoaded(true);
    runSearch(false, 1);
  }, [hasAutoLoaded, quota.canSearch, quota.loading, quota.reason, runSearch, user?.id]);

  const runSearchClick = () => {
    if (!user?.id) {
      router.push('/login');
      return;
    }
    if (!quota.loading && quota.canSearch === false && quota.reason) {
      setQuotaModalOpen(true);
      return;
    }
    setPage(1);
    runSearch(true, 1);
  };

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
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">全平台达人查询</h2>
          <p className="mt-3 text-sm text-zinc-600 sm:text-base">
            输入账号、关键词或赛道标签，快速筛选潜力达人并查看核心数据画像。
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
                  aria-label={`${activePlatform} creator search`}
                  placeholder={`搜索 ${activePlatform} 达人名称 / 账号 / 关键词`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearchClick();
                  }}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-zinc-400 sm:text-base"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  runSearchClick();
                }}
                className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition sm:text-base ${actionButtonStyle()}`}
              >
                {loading ? '查询中…' : '查询达人'}
              </button>
            </div>

            {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.35)]">
              <div className="grid grid-cols-12 gap-3 border-b border-zinc-100 bg-white/70 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">
                <div className="col-span-4">达人</div>
                <div className="col-span-2">粉丝</div>
                <div className="col-span-2">均播</div>
                <div className="col-span-2">地区</div>
                <div className="col-span-2 text-right">链接</div>
              </div>

              {results.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-zinc-500">
                  <div>暂无结果</div>
                  <div className="mt-2 text-xs text-zinc-500">
                    当前筛选：平台 {activePlatform === 'All' ? '全部' : activePlatform} · 粉丝量 {followerRange === 'any' ? '不限' : followerRange} · 地区{' '}
                    {region === 'any' ? '不限' : '北美·美国'}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {lastFetchedAt
                      ? '已成功请求数据库但返回 0 条：可能是表里确实没数据，或 influencers 表开启了 RLS 仅允许特定条件读取。'
                      : '点击“查询达人”开始从数据库加载列表。'}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={runSearchClick}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
                    >
                      重新加载
                    </button>
                  </div>
                </div>
              ) : (
                <ul>
                  {results.map((item, idx) => (
                    <li key={`${item.username ?? item.nickname ?? 'row'}-${idx}`} className="border-b border-zinc-100 last:border-b-0">
                      <div className="grid grid-cols-12 gap-3 px-4 py-4">
                        <div className="col-span-4 min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{item.nickname ?? '-'}</div>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <div className="truncate text-xs text-zinc-500">{item.username ? `@${item.username}` : ''}</div>
                            {item.tags ? (
                              <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                                {item.tags.split(',')[0].trim()}
                              </span>
                            ) : null}
                            <PlatformBadge value={item.platform} />
                          </div>
                        </div>
                        <div className="col-span-2 text-sm font-medium text-slate-900 tabular-nums">{formatCompactZh(item.fans_num)}</div>
                        <div className="col-span-2 text-sm text-zinc-700 tabular-nums">{formatCompactZh(item.view_avg)}</div>
                        <div className="col-span-2 min-w-0">
                          <div className="truncate text-sm text-zinc-700">{item.region_zh ?? '-'}</div>
                        </div>
                        <div className="col-span-2 text-right">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
                            >
                              打开
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                每页 10 条
                {typeof totalCount === 'number' ? ` · 共 ${totalCount} 条` : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const nextPage = Math.max(1, page - 1);
                    setPage(nextPage);
                    runSearch(true, nextPage);
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  上一页
                </button>
                <div className="min-w-[76px] text-center text-xs font-semibold text-zinc-700 tabular-nums">{page}</div>
                <button
                  type="button"
                  disabled={loading || (typeof totalCount === 'number' ? page * 10 >= totalCount : results.length < 10)}
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    runSearch(true, nextPage);
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
