import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = Object.keys(process.env).filter((k) =>
    k.includes('SUPABASE') || k.includes('RESEND') || k.includes('CRON'),
  );
  const result: Record<string, boolean> = {};
  for (const k of keys) result[k] = !!process.env[k];

  return NextResponse.json({
    keys,
    presence: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      CRON_SECRET: !!process.env.CRON_SECRET,
    },
    url_preview: process.env.SUPABASE_URL
      ? process.env.SUPABASE_URL.slice(0, 20) + '...'
      : process.env.NEXT_PUBLIC_SUPABASE_URL
        ? process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 20) + '...'
        : null,
    service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 8) + '...'
      : null,
  });
}
