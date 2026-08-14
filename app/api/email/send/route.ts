import { NextResponse } from 'next/server';
import {
  safeEmailHeaderValue,
} from '../../../../lib/email-rendering';
import {
  appOriginFromRequest,
  createQueuedEmailMessage,
  deliverQueuedEmailMessage,
  loadTemplateForUser,
  senderProfileFromEnv,
  validEmail,
} from '../../../../lib/email-service';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      templateId?: string;
      influencerId?: string;
      relationshipId?: string;
      recipientEmail?: string;
      recipientName?: string;
      senderName?: string;
      brandName?: string;
    };

    if (!body.templateId || !body.recipientEmail) {
      return NextResponse.json({ error: 'Missing template or recipient email' }, { status: 400 });
    }
    const recipientEmail = body.recipientEmail.trim().toLowerCase();
    if (!validEmail(recipientEmail)) {
      return NextResponse.json({ error: '收件邮箱格式不正确。' }, { status: 400 });
    }

    const unsubscribed = await admin
      .from('email_unsubscribes')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('email', recipientEmail)
      .maybeSingle();
    if (unsubscribed.data) {
      return NextResponse.json({ error: '该邮箱已退订，不能继续发送。' }, { status: 409 });
    }

    const template = await loadTemplateForUser(admin, authData.user.id, body.templateId);
    const senderProfile = senderProfileFromEnv({
      sender_name: safeEmailHeaderValue(body.senderName || '', 100),
      brand_name: safeEmailHeaderValue(body.brandName || '', 100),
    });
    const message = await createQueuedEmailMessage({
      admin,
      userId: authData.user.id,
      template,
      senderProfile,
      recipient: {
        recipientEmail,
        recipientName: body.recipientName || '',
        username: body.recipientName || '',
        influencerId: body.influencerId || null,
        relationshipId: body.relationshipId || null,
      },
    });
    await deliverQueuedEmailMessage({
      admin,
      userId: authData.user.id,
      messageId: message.id,
      appUrl: appOriginFromRequest(request),
      senderProfile,
    });

    return NextResponse.json({ messageId: message.id, status: 'sent' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 },
    );
  }
}
