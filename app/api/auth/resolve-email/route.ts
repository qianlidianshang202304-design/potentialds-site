import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string } | null;
  const username = body?.username?.trim();
  if (!username) return NextResponse.json({ error: 'missing username' }, { status: 400 });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'server not configured' }, { status: 500 });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.from('profiles').select('email').eq('username', username).maybeSingle();
  if (error) return NextResponse.json({ error: 'query failed' }, { status: 500 });
  if (!data?.email) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ email: data.email });
}

