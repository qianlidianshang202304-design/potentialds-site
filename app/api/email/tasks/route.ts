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
  id?: string;
  campaign_id: string | null;
  template_id: string | null;
  status: string;
  open_count: number | null;
  click_count: number | null;
  sender_email: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  sent_at: string | null;
  created_at: string;
  template_name?: string | null;
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

    // 并行查询：campaigns + profiles + templates + lists + 最近50条消息 + 按campaign聚合统计
    const [campaignResult, profileResult, templateResult, listResult, messageResult, statsResult] = await Promise.all([
      admin
        .from('email_campaigns')
        .select('id,name,status,scheduled_at,started_at,completed_at,next_run_at,last_run_at,daily_send_limit,sender_profile_id,sender_name,brand_name,total_recipients,sent_count,failed_count,opened_count,clicked_count,created_at,updated_at,list_id,template_id')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(50),
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
      // 只拉最近 200 条消息用于展示和统计（含 template_id）
      admin
        .from('email_messages')
        .select('id,campaign_id,template_id,status,open_count,click_count,sender_email,recipient_email,recipient_name,subject,sent_at,created_at')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(200),
      // 用数据库 count 查询获取每个 campaign 的实时统计（比拉全量消息在 JS 中算快得多）
      admin
        .from('email_messages')
        .select('campaign_id,status')
        .eq('user_id', authData.user.id)
        .in('status', ['queued', 'sending', 'sent', 'failed', 'cancelled']),
    ]);

    const firstError = campaignResult.error || profileResult.error || templateResult.error || listResult.error || messageResult.error || statsResult.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

    // 在 JS 中按 campaign_id + status 聚合统计（只处理状态字段，数据量远小于拉全量字段）
    const statsMap = new Map<string, { queued: number; sent: number; failed: number; cancelled: number; total: number }>();
    for (const row of (statsResult.data || []) as Array<{ campaign_id: string | null; status: string }>) {
      const cid = row.campaign_id || '_none';
      const s = statsMap.get(cid) || { queued: 0, sent: 0, failed: 0, cancelled: 0, total: 0 };
      s.total++;
      if (row.status === 'queued') s.queued++;
      else if (row.status === 'sent') s.sent++;
      else if (row.status === 'failed') s.failed++;
      else if (row.status === 'cancelled') s.cancelled++;
      statsMap.set(cid, s);
    }

    const messages = ((messageResult.data || []) as MessageRow[]);

    // 构造模板映射：campaign.template_id + templateResult 数据共同匹配 template_id
    const templateById = new Map<string, string>();
    for (const t of (templateResult.data || []) as Array<{ id: string; name: string }>) {
      templateById.set(String(t.id), t.name);
    }
    const campaignTemplateMap = new Map<string, string | null>();
    for (const campaign of (campaignResult.data || []) as Array<{ id: unknown; template_id?: unknown }>) {
      if (campaign.template_id) {
        campaignTemplateMap.set(String(campaign.id), String(campaign.template_id));
      }
    }
    // 为每条消息补上 template_id（campaign 回退）与 template_name
    const templateName = (tid: string | null): string | null => {
      if (!tid) return null;
      return templateById.get(tid) ?? null;
    };
    for (const msg of messages) {
      if (!msg.template_id && msg.campaign_id) {
        msg.template_id = campaignTemplateMap.get(msg.campaign_id) ?? null;
      }
      msg.template_name = templateName(msg.template_id);
    }

    const campaigns = ((campaignResult.data || []) as Array<Record<string, unknown>>).map((campaign) => {
      const cid = String(campaign.id);
      const s = statsMap.get(cid) || { queued: 0, sent: 0, failed: 0, cancelled: 0, total: 0 };
      // 从最近消息中计算打开/点击数（近似值，campaign 表本身也有 opened_count/clicked_count 字段）
      const campaignMessages = messages.filter((m) => m.campaign_id === cid);
      const opened = campaignMessages.filter((m) => (m.open_count || 0) > 0).length;
      const clicked = campaignMessages.filter((m) => (m.click_count || 0) > 0).length;
      return {
        ...campaign,
        stats: {
          queued: s.queued,
          sent: s.sent,
          failed: s.failed,
          cancelled: s.cancelled,
          opened,
          clicked,
          openRate: s.sent > 0 ? Math.round((opened / s.sent) * 100) : 0,
          progress: s.total > 0 ? Math.round(((s.sent + s.failed + s.cancelled) / s.total) * 100) : 0,
        },
      };
    });

    return NextResponse.json({
      campaigns,
      profiles: profileResult.data || [],
      templates: templateResult.data || [],
      lists: listResult.data || [],
      recentMessages: messages,
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

export async function DELETE(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const specificId = searchParams.get('id');

    if (specificId) {
      const existing = await admin
        .from('email_campaigns')
        .select('id')
        .eq('id', specificId)
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (existing.error || !existing.data) return NextResponse.json({ error: '任务不存在。' }, { status: 404 });

      await admin.from('email_events').delete().eq('user_id', authData.user.id).eq('campaign_id', specificId);
      await admin.from('email_messages').delete().eq('user_id', authData.user.id).eq('campaign_id', specificId);
      await admin.from('email_campaigns').delete().eq('id', specificId).eq('user_id', authData.user.id);
      return NextResponse.json({ deleted: 1 });
    }

    const deletableStatuses = ['completed', 'cancelled', 'failed'];
    const { data: campaignList, error: listError } = await admin
      .from('email_campaigns')
      .select('id')
      .eq('user_id', authData.user.id)
      .in('status', deletableStatuses);
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

    const ids = (campaignList || []).map((row) => row.id);
    if (ids.length === 0) return NextResponse.json({ deleted: 0 });

    await admin.from('email_events').delete().eq('user_id', authData.user.id).in('campaign_id', ids);
    await admin.from('email_messages').delete().eq('user_id', authData.user.id).in('campaign_id', ids);
    const { count } = await admin
      .from('email_campaigns')
      .delete({ count: 'exact' })
      .eq('user_id', authData.user.id)
      .in('id', ids);
    return NextResponse.json({ deleted: count || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 },
    );
  }
}
