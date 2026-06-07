export function trackProductEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  const anonymousId = window.localStorage.getItem('potentialds-anonymous-id');
  const sessionId = window.sessionStorage.getItem('potentialds-session-id');
  const entryPath = window.sessionStorage.getItem('potentialds-entry-path');

  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventName,
      anonymousId,
      sessionId,
      entryPath,
      pagePath: window.location.pathname,
      referrer: document.referrer,
      metadata,
    }),
    keepalive: true,
  });
}
