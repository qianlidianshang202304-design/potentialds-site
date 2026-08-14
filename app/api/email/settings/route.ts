import { NextResponse } from 'next/server';
import { safeEmailHeaderValue } from '../../../../lib/email-rendering';
import { validEmail } from '../../../../lib/email-service';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

function sanitizeProfile(body: Record<string, unknown>, userId: string) {
  const fromEmail = String(body.fromEmail || '').trim().toLowerCase();
  const replyToEmail = String(body.replyToEmail || '').trim().toLowerCase();
  if (fromEmail && !validEmail(fromEmail)) throw new Error('发信邮箱格式不正确。');
  if (replyToEmail && !validEmail(replyToEmail)) throw new Error('回复邮箱格式不正确。');

  return {
    user_id: userId,
    label: safeEmailHeaderValue(String(body.label || '默认发件配置'), 80) || '默认发件配置',
    from_email: fromEmail || process.env.OUTREACH_FROM_EMAIL || null,
    reply_to_email: replyToEmail || null,
    sender_name: safeEmailHeaderValue(String(body.senderName || ''), 100) || null,
    brand_name: safeEmailHeaderValue(String(body.brandName || ''), 100) || null,
    daily_send_limit: Math.max(1, Math.min(Number(body.dailySendLimit || 50), 1000)),
    is_enabled: body.isEnabled !== false,
    is_default: body.isDefault !== false,
    notes: String(body.notes || '').trim().slice(0, 500) || null,
  };
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await admin
      .from('email_sending_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ profiles: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Settings load failed' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const payload = sanitizeProfile(body, authData.user.id);

    if (payload.is_default) {
      await admin
        .from('email_sending_profiles')
        .update({ is_default: false })
        .eq('user_id', authData.user.id);
    }

    const id = String(body.id || '').trim();
    const result = id
      ? await admin
        .from('email_sending_profiles')
        .update(payload)
        .eq('id', id)
        .eq('user_id', authData.user.id)
        .select('*')
        .single()
      : await admin
        .from('email_sending_profiles')
        .insert(payload)
        .select('*')
        .single();

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ profile: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Settings save failed' },
      { status: 500 },
    );
  }
}
