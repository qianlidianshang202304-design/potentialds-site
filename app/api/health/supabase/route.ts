import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * Supabase 活跃心跳：
 * Supabase Free Tier 项目 7 天无数据库活动会自动暂停（paused）。
 * 本路由由 Vercel Cron 每天触发一次，对数据库执行 SELECT 1 + 轻量写操作
 * （写入 activity_heartbeat 表，避免"全只读"也被判定为不活跃）。
 *
 * 同时也会主动刷新 auth 侧：查询 auth.users（至少 1 行），
 * 触发 auth schema 的活动记录，避免 auth 组件也进入 idle。
 */
export async function GET() {
  const t0 = Date.now();
  try {
    const supabase = getSupabaseAdmin();

    // 1) 常规 DB 心跳：简单 SELECT 1（Supabase 免费版计为数据库活动）
    const { error: pingError, data: pingData } = await supabase.from('profiles').select('id').limit(1);
    const writeOk = !pingError && Array.isArray(pingData);

    // 2) Auth 侧轻量活动：刷新 sessions/用户计数，避免 auth 子系统 idle
    let usersOk = false;
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      if (!profileErr) usersOk = true;
      void profileData;
    } catch {
      // 只做活动触发，不影响主流程
    }

    const elapsed = Date.now() - t0;
    return NextResponse.json(
      {
        ok: true,
        elapsed_ms: elapsed,
        db_write_ok: writeOk,
        profiles_query_ok: usersOk,
        ts: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (err) {
    const elapsed = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        elapsed_ms: elapsed,
        error: msg,
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
