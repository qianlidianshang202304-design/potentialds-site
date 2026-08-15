import { NextResponse } from 'next/server';
import {
  appOriginFromRequest,
  deliverQueuedEmailMessage,
  senderProfileFromEnv,
  type EmailSenderProfile,
} from '../../../../../lib/email-service';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

export const maxDuration = 300;

async function readBody(request: Request) {
  if (request.method === 'GET') return {};
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function authenticate(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const cronSecret = process.env.CRON_SECRET;
  const cronAuthorized = Boolean(cronSecret && token === cronSecret);
  if (cronAuthorized) return { userId: null, cronAuthorized: true };
  if (!token) return { userId: null, cronAuthorized: false };

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { userId: null, cronAuthorized: false };
  return { userId: data.user.id, cronAuthorized: false };
}

async function refreshCampaignCounts(admin: ReturnType<typeof getSupabaseAdmin>, campaignId: string) {
  const { data } = await admin
    .from('email_messages')
    .select('status,open_count,click_count')
    .eq('campaign_id', campaignId);
  const rows = (data || []) as Array<{ status: string; open_count: number | null; click_count: number | null }>;
  const total = rows.length;
  const sent = rows.filter((row) => !['queued', 'sending', 'failed', 'cancelled'].includes(row.status)).length;
  const failed = rows.filter((row) => row.status === 'failed').length;
  const queued = rows.filter((row) => row.status === 'queued').length;
  const cancelled = rows.filter((row) => row.status === 'cancelled').length;
  const opened = rows.filter((row) => (row.open_count || 0) > 0).length;
  const clicked = rows.filter((row) => (row.click_count || 0) > 0).length;
  const done = queued === 0 && (sent > 0 || (total > 0 && failed + cancelled === total));
  const allFailed = total > 0 && failed + cancelled === total && sent === 0;
  await admin
    .from('email_campaigns')
    .update({
      status: allFailed ? 'failed' : done ? 'completed' : 'scheduled',
      completed_at: done || allFailed ? new Date().toISOString() : null,
      next_run_at: done || allFailed ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      sent_count: sent,
      failed_count: failed,
      opened_count: opened,
      clicked_count: clicked,
      last_run_at: new Date().toISOString(),
    })
    .eq('id', campaignId);
  return { sent, failed, queued, opened, clicked, total };
}

export async function GET(request: Request) {
  return runTasks(request);
}

export async function POST(request: Request) {
  return runTasks(request);
}

async function runTasks(request: Request) {
  try {
    const body = await readBody(request);
    const auth = await authenticate(request);
    if (!auth.userId && !auth.cronAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const requestedCampaignId = String(body.campaignId || new URL(request.url).searchParams.get('campaignId') || '').trim();
    const batchSize = Math.max(1, Math.min(Number(body.batchSize || 10), 50));
    const now = new Date().toISOString();

    let campaignQuery = admin
      .from('email_campaigns')
      .select('*,email_sending_profiles(*)')
      .order('next_run_at', { ascending: true })
      .limit(requestedCampaignId ? 1 : 8);
    if (!requestedCampaignId) {
      campaignQuery = campaignQuery.in('status', ['scheduled', 'sending']);
    }
    if (auth.userId) campaignQuery = campaignQuery.eq('user_id', auth.userId);
    if (requestedCampaignId) {
      campaignQuery = campaignQuery.eq('id', requestedCampaignId);
    } else {
      campaignQuery = campaignQuery.lte('next_run_at', now);
    }

    const { data: campaigns, error: campaignError } = await campaignQuery;
    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });

    const appUrl = appOriginFromRequest(request);
    const results: Array<Record<string, unknown>> = [];

    for (const campaign of (campaigns || []) as Array<Record<string, unknown>>) {
      // 如果 campaign 指定了 sender_profile_id 但 join 不到 profile，说明关联丢失，直接报错而非静默回退
      const joinProfile = campaign.email_sending_profiles as EmailSenderProfile | null;
      const hasProfileId = Boolean(campaign.sender_profile_id);

      let profile: EmailSenderProfile;
      if (joinProfile) {
        profile = joinProfile;
      } else if (hasProfileId) {
        // 指定了 profile 但查不到 → 可能被删除，报错而非静默回退
        results.push({
          campaignId: campaign.id,
          sent: 0,
          failed: 0,
          paused: false,
          error: '发件配置已失效（可能被删除），请在邮箱设置中重新关联发件配置。',
        });
        continue;
      } else {
        // 没有指定 profile，用 env 兜底
        profile = senderProfileFromEnv({
          sender_name: String(campaign.sender_name || ''),
          brand_name: String(campaign.brand_name || ''),
          daily_send_limit: Number(campaign.daily_send_limit || 50),
        }) as EmailSenderProfile;
      }

      if (profile.is_enabled === false) {
        await admin.from('email_campaigns').update({ status: 'paused' }).eq('id', campaign.id);
        results.push({
          campaignId: campaign.id,
          sent: 0,
          failed: 0,
          paused: true,
          error: '发件邮箱配置已暂停，请在邮箱设置中启用后重试。',
        });
        continue;
      }

      if (String(campaign.status) === 'failed') {
        await admin
          .from('email_messages')
          .update({ status: 'queued' })
          .eq('campaign_id', campaign.id)
          .eq('user_id', campaign.user_id)
          .eq('status', 'failed');
      }

      await admin
        .from('email_campaigns')
        .update({ status: 'sending', started_at: campaign.started_at || now, last_run_at: now, completed_at: null })
        .eq('id', campaign.id);

      const { data: queuedMessages, error: messageError } = await admin
        .from('email_messages')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('user_id', campaign.user_id)
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(batchSize);
      if (messageError) throw messageError;

      let sent = 0;
      let failed = 0;
      let stoppedByLimit = false;
      let firstError: string | null = null;
      for (const message of (queuedMessages || []) as Array<{ id: string }>) {
        try {
          const result = await deliverQueuedEmailMessage({
            admin,
            userId: String(campaign.user_id),
            messageId: message.id,
            appUrl,
            senderProfile: profile,
          });
          if (result?.status === 'sent') sent += 1;
        } catch (sendError) {
          const errorMessage = sendError instanceof Error ? sendError.message : '发送失败';
          if (!firstError) firstError = errorMessage;
          if (/今日发送已达到/.test(errorMessage)) {
            stoppedByLimit = true;
            break;
          }
          failed += 1;
        }
      }

      const counts = await refreshCampaignCounts(admin, String(campaign.id));
      results.push({
        campaignId: campaign.id,
        batchSent: sent,
        batchFailed: failed,
        stoppedByLimit,
        firstError,
        ...counts,
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Task runner failed' },
      { status: 500 },
    );
  }
}
