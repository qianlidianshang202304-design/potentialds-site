import { NextResponse } from 'next/server';
import { safeEmailHeaderValue } from '../../../../lib/email-rendering';
import { validEmail } from '../../../../lib/email-service';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

function sanitizeProfile(body: Record<string, unknown>, userId: string) {
  const fromEmail = String(body.fromEmail || '').trim().toLowerCase();
  const replyToEmail = String(body.replyToEmail || '').trim().toLowerCase();
  if (fromEmail && !validEmail(fromEmail)) throw new Error('发信邮箱格式不正确。');
  if (replyToEmail && !validEmail(replyToEmail)) throw new Error('回复邮箱格式不正确。');

  const provider = String(body.provider || 'smtp').toLowerCase();
  const smtpHost = String(body.smtpHost || '').trim();
  const smtpPort = Math.max(1, Math.min(Number(body.smtpPort || 465), 65535));
  const smtpUser = String(body.smtpUser || '').trim();
  const smtpPassword = String(body.smtpPassword || '').trim();
  const smtpSecure = body.smtpSecure !== false;

  return {
    user_id: userId,
    label: safeEmailHeaderValue(String(body.label || '默认发件配置'), 80) || '默认发件配置',
    provider,
    from_email: fromEmail || null,
    reply_to_email: replyToEmail || null,
    sender_name: safeEmailHeaderValue(String(body.senderName || ''), 100) || null,
    brand_name: safeEmailHeaderValue(String(body.brandName || ''), 100) || null,
    daily_send_limit: Math.max(1, Math.min(Number(body.dailySendLimit || 50), 1000)),
    is_enabled: body.isEnabled !== false,
    is_default: body.isDefault !== false,
    notes: String(body.notes || '').trim().slice(0, 500) || null,
    smtp_host: provider === 'smtp' ? (smtpHost || null) : null,
    smtp_port: provider === 'smtp' ? smtpPort : null,
    smtp_user: provider === 'smtp' ? (smtpUser || null) : null,
    smtp_password: provider === 'smtp' ? (smtpPassword || null) : null,
    smtp_secure: provider === 'smtp' ? smtpSecure : null,
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
    const id = String(body.id || '').trim();

    const basePayload = sanitizeProfile(body, authData.user.id);

    // 如果是编辑已有配置且密码字段为空，则保留数据库中的旧密码（避免清空）
    let finalPayload: Record<string, unknown> = { ...basePayload };
    if (id) {
      const existing = await admin
        .from('email_sending_profiles')
        .select('smtp_password,smtp_host,smtp_port,smtp_user,smtp_secure')
        .eq('id', id)
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
      const old = existing.data as { smtp_password?: string | null; smtp_host?: string | null; smtp_port?: number | null; smtp_user?: string | null; smtp_secure?: boolean | null } | null;
      if (old && basePayload.provider === 'smtp') {
        if (!String(body.smtpPassword || '').trim() && old.smtp_password) {
          finalPayload.smtp_password = old.smtp_password;
        }
        if (!String(body.smtpHost || '').trim() && old.smtp_host) {
          finalPayload.smtp_host = old.smtp_host;
          finalPayload.smtp_port = basePayload.smtp_port ?? old.smtp_port;
          finalPayload.smtp_user = basePayload.smtp_user ?? old.smtp_user;
          finalPayload.smtp_secure = basePayload.smtp_secure ?? old.smtp_secure;
        }
      }
    }

    if (finalPayload.is_default) {
      await admin
        .from('email_sending_profiles')
        .update({ is_default: false })
        .eq('user_id', authData.user.id);
    }

    const result = id
      ? await admin
        .from('email_sending_profiles')
        .update(finalPayload)
        .eq('id', id)
        .eq('user_id', authData.user.id)
        .select('*')
        .single()
      : await admin
        .from('email_sending_profiles')
        .insert(finalPayload)
        .select('*')
        .single();

    if (result.error) {
      let msg = result.error.message;
      if (/column.*smtp_.*does not exist/i.test(msg)) {
        msg += '。请在 Supabase SQL Editor 中执行迁移：supabase/migrations/202608150001_smtp_support.sql';
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ profile: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Settings save failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const existing = await admin
      .from('email_sending_profiles')
      .select('id')
      .eq('id', id)
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (existing.error || !existing.data) return NextResponse.json({ error: '邮箱配置不存在。' }, { status: 404 });

    await admin.from('email_campaigns').update({ sender_profile_id: null }).eq('user_id', authData.user.id).eq('sender_profile_id', id);
    const { error: delError } = await admin
      .from('email_sending_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', authData.user.id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 },
    );
  }
}
