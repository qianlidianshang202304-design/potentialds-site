import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: authData } = await admin.auth.getUser(token);
  const email = authData.user?.email?.toLowerCase();
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (!email || admins.length === 0 || !admins.includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [analyticsResult, securityResult] = await Promise.all([
    admin
      .from('analytics_events')
      .select('event_name,entry_path,page_path,traffic_source,utm_source,occurred_at')
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(5000),
    admin
      .from('security_events')
      .select('event_type,risk_score,route,reasons,request_count,occurred_at')
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(500),
  ]);

  if (analyticsResult.error || securityResult.error) {
    return NextResponse.json({ error: analyticsResult.error?.message || securityResult.error?.message }, { status: 500 });
  }

  const events = (analyticsResult.data ?? []) as Array<{
    event_name: string | null;
    entry_path: string | null;
    traffic_source: string | null;
  }>;
  const countBy = (key: 'entry_path' | 'traffic_source' | 'event_name') =>
    Object.entries(events.reduce<Record<string, number>>((acc, event) => {
      const value = String(event[key] || 'unknown');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {}))
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

  return NextResponse.json({
    totalEvents: events.length,
    entryPaths: countBy('entry_path'),
    trafficSources: countBy('traffic_source'),
    eventNames: countBy('event_name'),
    securityEvents: securityResult.data ?? [],
  });
}
