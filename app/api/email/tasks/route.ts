import { NextResponse } from 'next/server';
import {
  createQueuedEmailMessage,
  loadTemplateForUser,
  senderProfileFromEnv,
  type EmailSenderProfile,
} from '../../../../lib/email-service';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const maxDuration = 300;

type MessageRow = {
  campaign_id: string | null;
  status: string;
  open_count: number | null;
  click_count: number | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  sent_at: string | null;
  created_at: string;
};

function campaignStats(messages: MessageRow[], campaignId: string) {
  const rows = messages.filter((item) => item.campaign_id === campaignId);
  const sentRows = rows.filter((item) => !['queued', 'sending', 'failed', 'cancelled'].includes(item.status));
  const opened = rows.filter((item) => (item.open_count || 0) > 0).length;
  const clicked = rows.filter((item) => (item.click_count || 0) > 0).length;
  return {
    queued: rows.filter((item) => item.status === 'queued').length,
    sent: sentRows.length,
    failed: rows.filter((item) => item.status === 'failed').length,
    cancelled: rows.filter((item) => item.status === 'cancelled').length,
    opened,
    clicked,
    openRate: sentRows.length > 0 ? Math.round((opened / sentRows.length) * 100) : 0,
    progress: rows.length > 0 ? Math.round(((sentRows.length + rows.filter((item) => ['failed', 'cancelled'].includes(item.status)).length) / rows.length) * 100) : 0,
  };
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [campaignResult, profileResult, templateResult, listResult, messageResult] = await Promise.all([
      admin
        .from('email_campaigns')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('email_sending_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false }),
      admin
        .from('email_templates')
        .select('id,name,subject_template,updated_at')
        .eq('user_id', authData.user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false }),
      admin
        .from('creator_lists')
        .select('id,name,updated_at')
        .eq('user_id', authData.user.id)
        .order('updated_at', { ascending: false }),
      admin
        .from('email_messages')
        .select('id,campaign_id,status,open_count,click_count,recipient_email,recipient_name,subject,sent_at,created_at')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    const firstError = campaignResult.error || profileResult.error || templateResult.error || listResult.error || messageResult.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

    const messages = ((messageResult.data || []) as MessageRow[]);
    const campaigns = ((campaignResult.data || []) as Array<Record<string, unknown>>).map((campaign) => ({
      ...campaign,
      stats: campaignStats(messages, String(campaign.id)),
    }));

    return NextResponse.json({
      campaigns,
      profiles: profileResult.data || [],
      templates: templateResult.data || [],
      lists: listResult.data || [],
      recentMessages: messages.slice(0, 200),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tasks load failed' },
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

    const body = await request.json() as {
      name?: string;
      listId?: string;
      templateId?: string;
      senderProfileId?: string;
      scheduledAt?: string;
    };
    if (!body.name?.trim() || !body.listId || !body.templateId) {
      return NextResponse.json({ error: '请填写任务名称、达人名单和邮件模板。' }, { status: 400 });
    }

    const [listResult, savedResult, template] = await Promise.all([
      admin
        .from('creator_lists')
        .select('id,name')
        .eq('id', body.listId)
        .eq('user_id', authData.user.id)
        .maybeSingle(),
      admin
        .from('saved_creators')
        .select('influencer_id')
        .eq('list_id', body.listId)
        .eq('user_id', authData.user.id),
      loadTemplateForUser(admin, authData.user.id, body.templateId),
    ]);
    if (listResult.error || !listResult.data) return NextResponse.json({ error: '名单不存在。' }, { status: 404 });
    if (savedResult.error) return NextResponse.json({ error: savedResult.error.message }, { status: 500 });

    const influencerIds = Array.from(new Set(((savedResult.data || []) as Array<{ influencer_id: string }>).map((row) => row.influencer_id)));
    if (influencerIds.length === 0) return NextResponse.json({ error: '这个名单里还没有达人。' }, { status: 400 });

    const [relationshipResult, creatorResult, profileResult] = await Promise.all([
      admin
        .from('creator_relationships')
        .select('id,influencer_id,contact_email,contact_name')
        .eq('user_id', authData.user.id)
        .in('influencer_id', influencerIds),
      admin
        .from('influencers')
        .select('id,nickname,username,platform')
        .in('id', influencerIds),
      body.senderProfileId
        ? admin
          .from('email_sending_profiles')
          .select('*')
          .eq('id', body.senderProfileId)
          .eq('user_id', authData.user.id)
          .maybeSingle()
        : admin
          .from('email_sending_profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .eq('is_default', true)
          .maybeSingle(),
    ]);
    const error = relationshipResult.error || creatorResult.error || profileResult.error;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const profile = (profileResult.data as EmailSenderProfile | null) || senderProfileFromEnv();
    if (profile.is_enabled === false) return NextResponse.json({ error: '当前发件配置已暂停。' }, { status: 409 });

    const creators = Object.fromEntries(
      ((creatorResult.data || []) as Array<Record<string, string | null>>).map((creator) => [creator.id, creator]),
    );
    const relationships = ((relationshipResult.data || []) as Array<{
      id: string;
      influencer_id: string;
      contact_email: string | null;
      contact_name: string | null;
    }>).filter((item) => item.contact_email);

    if (relationships.length === 0) {
      return NextResponse.json({ error: '名单里的达人还没有可用联系邮箱，请先在达人详情或批量导入里补充邮箱。' }, { status: 400 });
    }

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date();
    const safeScheduledAt = Number.isFinite(scheduledAt.getTime()) ? scheduledAt.toISOString() : new Date().toISOString();
    const campaignResult = await admin
      .from('email_campaigns')
      .insert({
        user_id: authData.user.id,
        list_id: body.listId,
        template_id: body.templateId,
        sender_profile_id: profile.id || null,
        name: body.name.trim().slice(0, 120),
        status: 'scheduled',
        scheduled_at: safeScheduledAt,
        next_run_at: safeScheduledAt,
        daily_send_limit: Math.max(1, Math.min(Number(profile.daily_send_limit || 50), 1000)),
        sender_name: profile.sender_name || null,
        brand_name: profile.brand_name || null,
        total_recipients: relationships.length,
      })
      .select('*')
      .single();
    if (campaignResult.error) return NextResponse.json({ error: campaignResult.error.message }, { status: 500 });

    let queued = 0;
    const skipped: string[] = [];
    for (const relationship of relationships) {
      const creator = creators[relationship.influencer_id] || {};
      try {
        await createQueuedEmailMessage({
          admin,
          userId: authData.user.id,
          campaignId: campaignResult.data.id,
          template,
          senderProfile: profile,
          recipient: {
            recipientEmail: relationship.contact_email || '',
            recipientName: relationship.contact_name || creator.nickname || creator.username || '',
            username: creator.username || '',
            platform: creator.platform || '',
            influencerId: relationship.influencer_id,
            relationshipId: relationship.id,
          },
        });
        queued += 1;
      } catch (queueError) {
        skipped.push(queueError instanceof Error ? queueError.message : '收件人生成失败');
      }
    }

    await admin
      .from('email_campaigns')
      .update({
        total_recipients: queued,
        metadata: { skipped_recipients: skipped.slice(0, 50), source_list_name: listResult.data.name },
      })
      .eq('id', campaignResult.data.id);

    return NextResponse.json({ campaignId: campaignResult.data.id, queued, skipped: skipped.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Task create failed' },
      { status: 500 },
    );
  }
}
