import { NextResponse } from 'next/server';
import {
  classifyTrafficSource,
  safeAnalyticsText,
  safeCountryCode,
} from '../../../lib/analytics-attribution';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { classifyUserAgent, hashTelemetryValue, requestIp } from '../../../lib/request-security';

const allowedEvents = new Set([
  'page_view',
  'signup_started',
  'signup_completed',
  'creator_search',
  'creator_opened',
  'creator_saved',
  'list_created',
  'csv_exported',
  'import_completed',
  'email_sent',
  'email_opened',
  'email_clicked',
  'email_replied',
  'pricing_viewed',
  'upgrade_contact_clicked',
]);

function safeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .map(([key, item]) => [key.slice(0, 80), String(item ?? '').slice(0, 300)]),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventName = String(body.eventName || '');
    if (!allowedEvents.has(eventName)) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

    const ip = requestIp(request);
    const ipHash = hashTelemetryValue(ip);
    const now = Date.now();

    const admin = getSupabaseAdmin();
    let requestCount = 1;
    if (ipHash) {
      const windowStartedAt = new Date(Math.floor(now / 60_000) * 60_000).toISOString();
      const counterResult = await admin.rpc('increment_security_rate_limit', {
        p_bucket_key_hash: ipHash,
        p_route_group: 'analytics',
        p_window_started_at: windowStartedAt,
      });
      if (typeof counterResult.data === 'number') requestCount = counterResult.data;
    }
    const userAgent = request.headers.get('user-agent');
    const agentClass = classifyUserAgent(userAgent);
    const referrer = body.referrer ? String(body.referrer) : null;
    const utmSource = safeAnalyticsText(body.utmSource);
    const utmMedium = safeAnalyticsText(body.utmMedium);
    const utmCampaign = safeAnalyticsText(body.utmCampaign);
    let referrerDomain: string | null = null;
    try { referrerDomain = referrer ? new URL(referrer).hostname : null; } catch {}

    await admin.from('analytics_events').insert({
      anonymous_id_hash: hashTelemetryValue(String(body.anonymousId || '')),
      session_id: body.sessionId || null,
      event_name: eventName,
      entry_path: String(body.entryPath || '').slice(0, 500) || null,
      page_path: String(body.pagePath || '').slice(0, 500) || '/',
      referrer_domain: referrerDomain,
      traffic_source: classifyTrafficSource(referrer, utmSource, utmMedium),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      device_type: agentClass === 'mobile' ? 'mobile' : 'desktop',
      country_code: safeCountryCode(
        request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry'),
      ),
      metadata: safeMetadata(body.metadata),
    });

    if (requestCount > 120 || ['known_bot', 'automation'].includes(agentClass)) {
      await admin.from('security_events').insert({
        ip_hash: ipHash,
        route: String(body.pagePath || '/'),
        method: 'PAGE_VIEW',
        user_agent_class: agentClass,
        event_type: agentClass === 'known_bot' ? 'known_bot' : agentClass === 'automation' ? 'suspicious_agent' : 'high_frequency',
        risk_score: agentClass === 'known_bot' ? 20 : agentClass === 'automation' ? 70 : 60,
        reasons: agentClass === 'desktop' || agentClass === 'mobile' ? ['more_than_120_events_per_minute'] : [agentClass],
        request_count: requestCount,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
