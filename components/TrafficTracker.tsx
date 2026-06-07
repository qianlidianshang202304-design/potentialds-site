'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = 'potentialds-anonymous-id';
    let anonymousId = window.localStorage.getItem(key);
    if (!anonymousId) {
      anonymousId = crypto.randomUUID();
      window.localStorage.setItem(key, anonymousId);
    }

    const sessionKey = 'potentialds-session-id';
    let sessionId = window.sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.sessionStorage.setItem(sessionKey, sessionId);
    }

    const entryKey = 'potentialds-entry-path';
    const entryPath = window.sessionStorage.getItem(entryKey) || `${pathname}${window.location.search}`;
    window.sessionStorage.setItem(entryKey, entryPath);

    const query = new URLSearchParams(searchParams.toString());
    const payload = {
      eventName: 'page_view',
      anonymousId,
      sessionId,
      entryPath,
      pagePath: pathname,
      referrer: document.referrer,
      utmSource: query.get('utm_source'),
      utmMedium: query.get('utm_medium'),
      utmCampaign: query.get('utm_campaign'),
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function TrafficTracker() {
  return <Suspense fallback={null}><Tracker /></Suspense>;
}
