import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient<any>>;

let cachedClient: SupabaseClient | null = null;

export function getSupabase() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  cachedClient = createClient<any>(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}

export async function ensureProfile(userId: string) {
  const supabase = getSupabase();
  const basePayload: Record<string, unknown> = {
    id: userId,
    is_paid: false,
    registration_date: new Date().toISOString(),
    search_count: 0,
    browse_limit: 2000,
    browse_used: 0,
    browse_month: currentMonthKey(),
  };

  let payload = { ...basePayload };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await supabase.from('profiles').insert(payload);
    if (!error) return;

    if ((error as { code?: string }).code === '23505') return;

    const message = (error as { message?: string }).message ?? '';
    const match = message.match(/Could not find the '([^']+)' column/);
    if (match) {
      const missingColumn = match[1];
      if (missingColumn in payload) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete payload[missingColumn];
        continue;
      }
    }

    throw error;
  }

  return;
}

export async function updateOwnProfile(params: { userId: string; email?: string | null; username?: string | null }) {
  const supabase = getSupabase();
  let payload: Record<string, unknown> = {};
  if (params.email !== undefined) payload.email = params.email;
  if (params.username !== undefined) payload.username = params.username;
  if (Object.keys(payload).length === 0) return;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.from('profiles').update(payload).eq('id', params.userId);
    if (!error) return;

    const message = (error as { message?: string }).message ?? '';
    const match = message.match(/Could not find the '([^']+)' column/);
    if (match) {
      const missingColumn = match[1];
      if (missingColumn in payload) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete payload[missingColumn];
        if (Object.keys(payload).length === 0) return;
        continue;
      }
    }

    throw error;
  }
}

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function incrementProfileBrowseCount(userId: string, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0) return;

  const supabase = getSupabase();

  let data:
    | {
        browse_used?: number | null;
        browse_month?: string | null;
        browse_limit?: number | null;
        search_count?: number | null;
      }
    | null = null;

  const first = await supabase.from('profiles').select('browse_used,browse_month,browse_limit').eq('id', userId).maybeSingle();

  if (first.error) {
    const message = (first.error as { message?: string }).message ?? '';
    const match = message.match(/Could not find the '([^']+)' column/);
    if (match && ['browse_used', 'browse_month', 'browse_limit'].includes(match[1])) {
      const fallback = await supabase.from('profiles').select('search_count').eq('id', userId).maybeSingle();
      if (fallback.error) throw fallback.error;
      data = fallback.data as typeof data;
    } else {
      throw first.error;
    }
  } else {
    data = first.data as typeof data;
  }

  const monthKey = currentMonthKey();
  const supportsBrowseMonth = Boolean(data && 'browse_month' in (data as object));
  const currentMonth = supportsBrowseMonth ? data?.browse_month : null;
  const monthMismatch = Boolean(currentMonth && currentMonth !== monthKey);

  const currentUsed = supportsBrowseMonth ? (data?.browse_used ?? 0) : (data?.search_count ?? 0);
  const nextUsed = monthMismatch ? delta : currentUsed + delta;

  let payload: Record<string, unknown> = { browse_used: nextUsed, browse_month: monthKey };
  if (!supportsBrowseMonth) {
    payload = { search_count: nextUsed };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const update = await supabase.from('profiles').update(payload).eq('id', userId);
    if (!update.error) return;

    const message = (update.error as { message?: string }).message ?? '';
    const match = message.match(/Could not find the '([^']+)' column/);
    if (match) {
      const missingColumn = match[1];
      if (missingColumn in payload) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete payload[missingColumn];
        continue;
      }
    }
    throw update.error;
  }
}
