import { createHash } from 'node:crypto';

export function hashTelemetryValue(value: string | null | undefined) {
  if (!value) return null;
  const salt = process.env.TELEMETRY_HASH_SALT;
  if (!salt) return null;
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
}

export function classifyUserAgent(userAgent: string | null) {
  const value = (userAgent ?? '').toLowerCase();
  if (!value) return 'unknown';
  if (/googlebot|bingbot|baiduspider|yandexbot/.test(value)) return 'known_bot';
  if (/headless|phantom|selenium|playwright|puppeteer/.test(value)) return 'automation';
  if (/mobile|android|iphone|ipad/.test(value)) return 'mobile';
  return 'desktop';
}
