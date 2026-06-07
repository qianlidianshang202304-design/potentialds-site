export function classifyTrafficSource(
  referrer: string | null,
  utmSource: string | null,
  utmMedium: string | null,
) {
  const medium = (utmMedium ?? '').toLowerCase();
  if (/^(cpc|ppc|paid|paid_social|display|retargeting)$/.test(medium)) return 'paid';
  if (/^(affiliate|partner|partnership)$/.test(medium)) return 'partner';
  if (utmSource || utmMedium) return 'campaign';
  if (!referrer) return 'direct';

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (/google|bing|baidu|yahoo|duckduckgo/.test(host)) return 'organic';
    if (/facebook|instagram|tiktok|youtube|linkedin|x\.com|twitter/.test(host)) return 'social';
    return 'referral';
  } catch {
    return 'unknown';
  }
}

export function safeAnalyticsText(value: unknown, maxLength = 200) {
  return String(value ?? '').trim().slice(0, maxLength) || null;
}

export function safeCountryCode(value: string | null) {
  const code = (value ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}
