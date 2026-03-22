'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { getSupabase } from '../lib/supabase';

export type SearchQuotaBlockReason = 'monthly_browse_limit';

type ProfileQuotaRow = {
  is_paid: boolean | null;
  browse_limit?: number | null;
  browse_used?: number | null;
  browse_month?: string | null;
  search_count?: number | null;
};

type UseSearchQuotaResult = {
  canSearch: boolean;
  reason: SearchQuotaBlockReason | null;
  message: string | null;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  loading: boolean;
  profile: ProfileQuotaRow | null;
  refresh: () => void;
};

function monthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function normalizeMonth(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const m = String(Number(ymd[2])).padStart(2, '0');
    return `${ymd[1]}-${m}`;
  }
  const ym = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) {
    const m = String(Number(ym[2])).padStart(2, '0');
    return `${ym[1]}-${m}`;
  }
  const dt = new Date(trimmed);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  return null;
}

function computeQuota(profile: ProfileQuotaRow) {
  const isPaid = Boolean(profile.is_paid);
  const limit = profile.browse_limit ?? (isPaid ? 20_000 : 2_000);
  const key = monthKey();
  const rawUsed = profile.browse_used ?? profile.search_count ?? 0;
  const month = normalizeMonth(profile.browse_month);
  const used = month && month !== key ? 0 : rawUsed;
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    return {
      canSearch: false,
      reason: 'monthly_browse_limit' as SearchQuotaBlockReason,
      message: isPaid ? '本月可浏览达人额度已用完（20,000/月）。' : '本月可浏览达人额度已用完（2,000/月）。',
      used,
      limit,
      remaining,
    };
  }

  return { canSearch: true, reason: null, message: null, used, limit, remaining };
}

type StoreState = {
  loading: boolean;
  profile: ProfileQuotaRow | null;
  error: unknown;
  updatedAt: number;
};

type StoreEntry = {
  state: StoreState;
  listeners: Set<() => void>;
  inFlight: Promise<void> | null;
};

const store = new Map<string, StoreEntry>();
const emptyState: StoreState = { loading: false, profile: null, error: null, updatedAt: 0 };

function getEntry(userId: string): StoreEntry {
  const existing = store.get(userId);
  if (existing) return existing;
  const entry: StoreEntry = {
    state: { loading: false, profile: null, error: null, updatedAt: 0 },
    listeners: new Set(),
    inFlight: null,
  };
  store.set(userId, entry);
  return entry;
}

function setEntryState(userId: string, partial: Partial<StoreState>) {
  const entry = getEntry(userId);
  entry.state = { ...entry.state, ...partial };
  entry.listeners.forEach((listener) => listener());
}

async function fetchProfile(userId: string) {
  const entry = getEntry(userId);
  if (entry.inFlight) return entry.inFlight;

  entry.inFlight = (async () => {
    setEntryState(userId, { loading: true, error: null });
    const supabase = getSupabase();

    const primary = await supabase
      .from('profiles')
      .select('is_paid,browse_limit,browse_used,browse_month,search_count')
      .eq('id', userId)
      .maybeSingle();

    if (!primary.error) {
      setEntryState(userId, { loading: false, profile: primary.data ?? null, updatedAt: Date.now() });
      return;
    }

    const message = (primary.error as { message?: string }).message ?? '';
    const match = message.match(/Could not find the '([^']+)' column/);
    if (match && ['browse_limit', 'browse_used', 'browse_month'].includes(match[1])) {
      const fallback = await supabase.from('profiles').select('is_paid,search_count').eq('id', userId).maybeSingle();
      if (fallback.error) {
        setEntryState(userId, { loading: false, profile: null, error: fallback.error, updatedAt: Date.now() });
        return;
      }
      setEntryState(userId, { loading: false, profile: fallback.data ?? null, updatedAt: Date.now() });
      return;
    }

    setEntryState(userId, { loading: false, profile: null, error: primary.error, updatedAt: Date.now() });
  })().finally(() => {
    const entry2 = getEntry(userId);
    entry2.inFlight = null;
  });

  return entry.inFlight;
}

export function refreshSearchQuota(userId: string) {
  void fetchProfile(userId);
}

export function useSearchQuota(userId: string | null | undefined): UseSearchQuotaResult {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!userId) return () => {};
      const entry = getEntry(userId);
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    [userId],
  );

  const getSnapshot = useCallback((): StoreState => {
    if (!userId) return emptyState;
    return getEntry(userId).state;
  }, [userId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refresh = useCallback(() => {
    if (!userId) return;
    refreshSearchQuota(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refreshSearchQuota(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onFocus = () => refreshSearchQuota(userId);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshSearchQuota(userId);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId]);

  const quota = useMemo(() => {
    const empty = { canSearch: false, reason: null, message: null, used: null, limit: null, remaining: null };
    if (!userId) return empty;
    if (state.loading) return empty;
    if (state.error) return empty;
    if (!state.profile) return empty;
    return computeQuota(state.profile);
  }, [state.error, state.loading, state.profile, userId]);

  return {
    canSearch: quota.canSearch,
    reason: quota.reason,
    message: quota.message,
    used: quota.used,
    limit: quota.limit,
    remaining: quota.remaining,
    loading: Boolean(userId) && state.loading,
    profile: state.profile,
    refresh,
  };
}
