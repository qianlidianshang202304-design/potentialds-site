import { NextRequest, NextResponse } from 'next/server';
import { classifyUserAgent, hashTelemetryValue, requestIp } from './lib/request-security';
import { getSupabaseAdmin } from './lib/supabase-server';

const monitoredPrefixes = ['/creator-workbench', '/creators/', '/crm', '/my-creators', '/api/'];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!monitoredPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return response;
  }

  try {
    const ipHash = hashTelemetryValue(requestIp(request));
    const agentClass = classifyUserAgent(request.headers.get('user-agent'));
    if (!ipHash && !['known_bot', 'automation'].includes(agentClass)) return response;

    const admin = getSupabaseAdmin();
    let requestCount = 1;
    if (ipHash) {
      const timestamp = Date.now();
      const windowStartedAt = new Date(Math.floor(timestamp / 60_000) * 60_000).toISOString();
      const counter = await admin.rpc('increment_security_rate_limit', {
        p_bucket_key_hash: ipHash,
        p_route_group: 'monitored_routes',
        p_window_started_at: windowStartedAt,
      });
      if (typeof counter.data === 'number') requestCount = counter.data;
    }

    const suspiciousAgent = ['known_bot', 'automation'].includes(agentClass);
    if (suspiciousAgent || requestCount > 90) {
      await admin.from('security_events').insert({
        ip_hash: ipHash,
        route: request.nextUrl.pathname.slice(0, 500),
        method: request.method,
        user_agent_class: agentClass,
        event_type: agentClass === 'known_bot'
          ? 'known_bot'
          : agentClass === 'automation'
            ? 'suspicious_agent'
            : 'high_frequency',
        risk_score: agentClass === 'known_bot' ? 20 : agentClass === 'automation' ? 70 : 60,
        reasons: suspiciousAgent ? [agentClass] : ['more_than_90_requests_per_minute'],
        request_count: requestCount,
      });
    }
  } catch {
    // Monitoring must never make the product unavailable.
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
