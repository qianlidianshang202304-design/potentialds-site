'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Chrome, Download, Search, Youtube } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuotaModal from '../../components/QuotaModal';
import { getSupabase, incrementProfileBrowseCount } from '../../lib/supabase';
import { useSearchQuota } from '../../hooks/useSearchQuota';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';

type Platform = 'All' | 'Instagram' | 'YouTube' | 'TikTok';
type FollowerRange = 'any' | '0-1k' | '1k-5k' | '5k-10k' | '10k-50k' | '50k-100k' | '100k-500k' | '500k-1m' | '1m+' | 'custom';
type Region = 'any' | 'us' | 'ca' | 'jp' | 'kr' | 'uk' | 'de' | 'fr' | 'au' | 'sg';
type SearchMode = 'name' | 'tag';

const platforms: Platform[] = ['All', 'Instagram', 'YouTube', 'TikTok'];

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

function followerRangeToBounds(range: FollowerRange, customMin?: number | null, customMax?: number | null) {
  if (range === '0-1k') return { min: 0, max: 1_000 };
  if (range === '1k-5k') return { min: 1_000, max: 5_000 };
  if (range === '5k-10k') return { min: 5_000, max: 10_000 };
  if (range === '10k-50k') return { min: 10_000, max: 50_000 };
  if (range === '50k-100k') return { min: 50_000, max: 100_000 };
  if (range === '100k-500k') return { min: 100_000, max: 500_000 };
  if (range === '500k-1m') return { min: 500_000, max: 1_000_000 };
  if (range === '1m+') return { min: 1_000_000, max: null as number | null };
  if (range === 'custom') return { min: customMin ?? null, max: customMax ?? null };
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

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function CreatorWorkbenchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-transparent text-slate-900" />}>
      <CreatorWorkbenchInner />
    </Suspense>
  );
}

function CreatorWorkbenchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePlatform, setActivePlatform] = useState<Platform>('All');
  const [followerRange, setFollowerRange] = useState<FollowerRange>('any');
  const [customFollowerMin, setCustomFollowerMin] = useState<number | null>(null);
  const [customFollowerMax, setCustomFollowerMax] = useState<number | null>(null);
  const [region, setRegion] = useState<Region>('any');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
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
  const [exporting, setExporting] = useState(false);
  const [exportCount, setExportCount] = useState<{ today: number; month: number }>({ today: 0, month: 0 });

  const { user } = useSupabaseUser();
  const quota = useSearchQuota(user?.id);

  useEffect(() => {
    if (initializedFromUrl) return;
    const p = (searchParams.get('platform') ?? '').toLowerCase();
    const f = (searchParams.get('followers') ?? '').toLowerCase();
    const r = (searchParams.get('region') ?? '').toLowerCase();
    const sm = (searchParams.get('searchMode') ?? '').toLowerCase();
    const q = searchParams.get('q') ?? '';
    const fMin = searchParams.get('followerMin');
    const fMax = searchParams.get('followerMax');

    if (p === 'instagram') setActivePlatform('Instagram');
    else if (p === 'youtube') setActivePlatform('YouTube');
    else if (p === 'tiktok') setActivePlatform('TikTok');
    else if (p === 'all') setActivePlatform('All');

    const validRanges: FollowerRange[] = ['any', '0-1k', '1k-5k', '5k-10k', '10k-50k', '50k-100k', '100k-500k', '500k-1m', '1m+', 'custom'];
    if (validRanges.includes(f as FollowerRange)) setFollowerRange(f as FollowerRange);
    if (fMin) setCustomFollowerMin(parseInt(fMin, 10));
    if (fMax) setCustomFollowerMax(parseInt(fMax, 10));

    const validRegions: Region[] = ['any', 'us', 'ca', 'jp', 'kr', 'uk', 'de', 'fr', 'au', 'sg'];
    if (validRegions.includes(r as Region)) setRegion(r as Region);

    if (sm === 'tag') setSearchMode('tag');
    else setSearchMode('name');

    if (q) setQuery(q);

    setPage(1);
    setHasAutoLoaded(false);
    setInitializedFromUrl(true);
  }, [initializedFromUrl, searchParams]);

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

  const runSearch = useCallback(
    async (shouldCount: boolean = true, targetPage?: number) => {
      if (!user?.id) { router.push('/login'); return; }
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

      const bounds = followerRangeToBounds(followerRange, customFollowerMin, customFollowerMax);
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

          if (keyword) {
            if (searchMode === 'name' && !missingColumns.has('nickname') && !missingColumns.has('username')) {
              const safe = keyword.replace(/,/g, ' ');
              qy = qy.or(`nickname.ilike.%${safe}%,username.ilike.%${safe}%`);
            } else if (searchMode === 'tag' && !missingColumns.has('tags')) {
              const safe = keyword.replace(/,/g, ' ');
              qy = qy.ilike('tags', `%${safe}%`);
            }
          }

          const { data, error, count } = await qy;
          if (!error) {
            const rows = (data ?? []) as unknown as InfluencerRow[];
            setResults(rows);
            setLastFetchedAt(Date.now());
            setTotalCount(typeof count === 'number' ? count : null);
            try { if (shouldCount) await incrementProfileBrowseCount(user.id, rows.length); } catch {}
            quota.refresh();
            setLoading(false);
            return;
          }

          const message = (error as { message?: string }).message ?? '';
          const match = message.match(/Could not find the '([^']+)' column/);
          if (match) { missingColumns.add(match[1]); continue; }
          throw error;
        }
        throw new Error('搜索失败：字段与数据库结构不匹配（已多次重试）');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    },
    [activePlatform, followerRange, customFollowerMin, customFollowerMax, page, query, searchMode, quota, region, router, user?.id],
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
    if (!user?.id) { router.push('/login'); return; }
    if (!quota.loading && quota.canSearch === false && quota.reason) { setQuotaModalOpen(true); return; }
    setPage(1);
    runSearch(true, 1);
  };

  const handleExport = async () => {
    if (!user?.id) return;
    const isPaid = quota.profile?.is_paid ?? false;
    const maxDailyExports = isPaid ? 10 : 1;
    const maxMonthlyExports = isPaid ? 300 : 1;

    if (exportCount.today >= maxDailyExports) {
      setQuotaMessage(isPaid ? '今日导出次数已达上限（10次/天）' : '今日导出次数已达上限（1次/天）');
      setQuotaModalOpen(true);
      return;
    }
    if (exportCount.month >= maxMonthlyExports) {
      setQuotaMessage(isPaid ? '本月导出次数已达上限（300次/月）' : '导出次数已达上限');
      setQuotaModalOpen(true);
      return;
    }

    setExporting(true);
    try {
      const supabase = getSupabase();
      const bounds = followerRangeToBounds(followerRange, customFollowerMin, customFollowerMax);
      const platformValue = platformToValue(activePlatform);
      const keyword = query.trim();
      const exportLimit = 1000;

      const baseColumns = ['nickname', 'username', 'fans_num', 'view_avg', 'region_zh', 'tags', 'link', 'platform', 'region'];
      let qy = supabase.from('influencers').select(baseColumns.join(',')).limit(exportLimit);

      if (platformValue) qy = qy.eq('platform', platformValue);
      if (region !== 'any') qy = qy.eq('region', region);
      if (bounds.min !== null) qy = qy.gte('fans_num', bounds.min);
      if (bounds.max !== null) qy = qy.lte('fans_num', bounds.max);
      qy = qy.order('fans_num', { ascending: false, nullsFirst: false });

      if (keyword) {
        if (searchMode === 'name') {
          const safe = keyword.replace(/,/g, ' ');
          qy = qy.or(`nickname.ilike.%${safe}%,username.ilike.%${safe}%`);
        } else {
          const safe = keyword.replace(/,/g, ' ');
          qy = qy.ilike('tags', `%${safe}%`);
        }
      }

      const { data, error } = await qy;
      if (error) throw error;

      const rows = (data ?? []) as unknown as InfluencerRow[];
      const headers = ['昵称', '用户名', '粉丝数', '平均播放', '地区', '标签', '链接', '平台'];
      const csvContent = [
        headers.join(','),
        ...rows.map(row => [
          `"${(row.nickname ?? '').replace(/"/g, '""')}"`,
          `"${(row.username ?? '').replace(/"/g, '""')}"`,
          row.fans_num ?? '',
          row.view_avg ?? '',
          `"${(row.region_zh ?? '').replace(/"/g, '""')}"`,
          `"${(row.tags ?? '').replace(/"/g, '""')}"`,
          `"${(row.link ?? '').replace(/"/g, '""')}"`,
          `"${(row.platform ?? '').replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `influencers_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      const todayKey = getTodayKey();
      const newToday = exportCount.today + 1;
      const newMonth = exportCount.month + 1;

      const profiles = supabase.from('profiles') as unknown as {
        update: (values: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown }> };
      };
      await profiles.update({ export_today: newToday, export_month: newMonth, export_date: todayKey }).eq('id', user.id);

      setExportCount({ today: newToday, month: newMonth });
      setExportModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

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

  const isPaid = quota.profile?.is_paid ?? false;
  const maxDailyExports = isPaid ? 10 : 1;
  const maxMonthlyExports = isPaid ? 300 : 1;

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <QuotaModal open={quotaModalOpen} title="额度已用完" message={quotaMessage} onClose={() => setQuotaModalOpen(false)} />
      <QuotaModal
        open={exportModalOpen}
        title="导出数据"
        message={`确定导出当前筛选结果（最多1000条）？今日已导出 ${exportCount.today}/${maxDailyExports} 次，本月已导出 ${exportCount.month}/${maxMonthlyExports} 次。`}
        onClose={() => setExportModalOpen(false)}
        onConfirm={handleExport}
        confirmText={exporting ? '导出中...' : '确认导出'}
      />
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">全平台达人查询</h2>
          <p className="mt-3 text-sm text-zinc-600 sm:text-base">输入账号、关键词或赛道标签，快速筛选潜力达人并查看核心数据画像。</p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2 mb-5">
              {platforms.map((platform) => {
                const isActive = activePlatform === platform;
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setActivePlatform(platform)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                      isActive ? platformActiveStyle(platform) : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSearchMode('name')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      searchMode === 'name' ? 'bg-slate-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    频道
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode('tag')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      searchMode === 'tag' ? 'bg-slate-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    标签
                  </button>
                </div>
                <div className="h-5 w-px bg-zinc-200" />
                <Search size={18} className="text-zinc-400 shrink-0" />
                <input
                  type="text"
                  aria-label={`${activePlatform} creator search`}
                  placeholder={searchMode === 'name' ? `搜索达人频道 / Handle` : `搜索标签 / 关键词`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearchClick(); }}
                  className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={runSearchClick}
                  className={`shrink-0 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition ${actionButtonStyle()}`}
                >
                  {loading ? '查询中…' : '查询'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">粉丝量</span>
                  <select
                    value={followerRange}
                    onChange={(e) => setFollowerRange(e.target.value as FollowerRange)}
                    className="h-8 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-slate-900"
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
                        value={customFollowerMin ?? ''}
                        onChange={(e) => setCustomFollowerMin(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="h-8 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-slate-900 outline-none"
                      />
                      <span className="text-xs text-zinc-400">-</span>
                      <input
                        type="number"
                        placeholder="最大"
                        value={customFollowerMax ?? ''}
                        onChange={(e) => setCustomFollowerMax(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="h-8 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="h-5 w-px bg-zinc-200" />

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">地区</span>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as Region)}
                    className="h-8 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-slate-900"
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

            {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.35)]">
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
                    当前筛选：平台 {activePlatform === 'All' ? '全部' : activePlatform} · 粉丝量 {followerRange === 'any' ? '不限' : followerRange} · 地区 {region === 'any' ? '不限' : region}
                  </div>
                  <div className="mt-4">
                    <button type="button" onClick={runSearchClick} className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900">
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
                            <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900">
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
                每页 10 条{typeof totalCount === 'number' ? ` · 共 ${totalCount} 条` : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => { const nextPage = Math.max(1, page - 1); setPage(nextPage); runSearch(true, nextPage); }}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  上一页
                </button>
                <div className="min-w-[40px] text-center text-xs font-semibold text-zinc-700 tabular-nums">{page}</div>
                <button
                  type="button"
                  disabled={loading || (typeof totalCount === 'number' ? page * 10 >= totalCount : results.length < 10)}
                  onClick={() => { const nextPage = page + 1; setPage(nextPage); runSearch(true, nextPage); }}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  下一页
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
              <div className="text-xs text-zinc-500">
                导出额度：今日 {exportCount.today}/{maxDailyExports} 次 · 本月 {exportCount.month}/{maxMonthlyExports} 次
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                disabled={loading || results.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={14} />
                导出 CSV
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
