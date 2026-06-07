import { NextResponse } from 'next/server';
import {
  importNumber,
  normalizeImportPlatform,
  normalizeImportStatus,
} from '../../../../lib/crm-import';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const maxDuration = 300;

type ImportRow = {
  platform?: string;
  username?: string;
  nickname?: string;
  link?: string;
  fans_num?: number | string;
  view_avg?: number | string;
  region?: string;
  region_zh?: string;
  tags?: string;
  email?: string;
  note?: string;
  status?: string;
};

export async function POST(request: Request) {
  let importJobId: string | null = null;
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { listId?: string; fileName?: string; rows?: ImportRow[] };
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 1000) : [];
    if (!body.listId || rows.length === 0) {
      return NextResponse.json({ error: 'Missing listId or rows' }, { status: 400 });
    }

    const { data: list } = await admin
      .from('creator_lists')
      .select('id')
      .eq('id', body.listId)
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });

    const fileName = String(body.fileName || 'import.csv').slice(0, 255);
    const spreadsheetFile = /\.(xlsx|xls)$/i.test(fileName);
    const { data: job, error: jobError } = await admin
      .from('creator_import_jobs')
      .insert({
        user_id: authData.user.id,
        list_id: body.listId,
        file_name: fileName,
        file_type: spreadsheetFile ? 'xlsx' : 'csv',
        status: 'processing',
        total_rows: rows.length,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
    importJobId = job.id;

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const username = String(row.username ?? '').trim().replace(/^@/, '');
      const platform = normalizeImportPlatform(row.platform);
      if (!username || !platform) {
        failed += 1;
        errors.push({ row: index + 2, message: '缺少平台或用户名' });
        continue;
      }

      let influencerId: string | null = null;
      const existing = await admin
        .from('influencers')
        .select('id')
        .eq('platform', platform)
        .eq('username', username)
        .limit(1)
        .maybeSingle();
      if (existing.error) {
        failed += 1;
        errors.push({ row: index + 2, message: existing.error.message });
        continue;
      }
      influencerId = existing.data?.id ?? null;

      if (!influencerId) {
        const inserted = await admin
          .from('influencers')
          .insert({
            platform,
            username,
            nickname: row.nickname || null,
            link: row.link || null,
            fans_num: importNumber(row.fans_num),
            view_avg: importNumber(row.view_avg),
            region: row.region || null,
            region_zh: row.region_zh || null,
            tags: row.tags || null,
          })
          .select('id')
          .single();
        if (inserted.error || !inserted.data?.id) {
          failed += 1;
          errors.push({ row: index + 2, message: inserted.error?.message || '达人创建失败' });
          continue;
        }
        influencerId = inserted.data.id;
      }

      const existingMembership = await admin
        .from('saved_creators')
        .select('id')
        .eq('list_id', body.listId)
        .eq('influencer_id', influencerId)
        .maybeSingle();
      if (existingMembership.error) {
        failed += 1;
        errors.push({ row: index + 2, message: existingMembership.error.message });
        continue;
      }
      if (existingMembership.data) {
        skipped += 1;
        continue;
      }

      const saved = await admin.from('saved_creators').upsert(
        {
          user_id: authData.user.id,
          list_id: body.listId,
          influencer_id: influencerId,
          source: 'import',
        },
        { onConflict: 'list_id,influencer_id', ignoreDuplicates: true },
      );
      if (saved.error) {
        failed += 1;
        errors.push({ row: index + 2, message: saved.error.message });
        continue;
      }

      if (row.email || row.note || row.status) {
        const relationshipPayload: Record<string, unknown> = {
          user_id: authData.user.id,
          influencer_id: influencerId,
        };
        if (String(row.email || '').trim()) {
          relationshipPayload.contact_email = String(row.email).trim().toLowerCase();
        }
        if (String(row.status || '').trim()) {
          relationshipPayload.status = normalizeImportStatus(row.status);
        }
        const relationshipResult = await admin
          .from('creator_relationships')
          .upsert(
            relationshipPayload,
            { onConflict: 'user_id,influencer_id' },
          )
          .select('id')
          .single();

        if (relationshipResult.error) {
          errors.push({ row: index + 2, message: `联系信息未更新：${relationshipResult.error.message}` });
        } else if (row.note && relationshipResult.data?.id) {
          const noteResult = await admin.from('creator_notes').insert({
            user_id: authData.user.id,
            relationship_id: relationshipResult.data.id,
            body: String(row.note).trim().slice(0, 5000),
          });
          if (noteResult.error) {
            errors.push({ row: index + 2, message: `备注未导入：${noteResult.error.message}` });
          }
        }
      }

      imported += 1;
    }

    await admin
      .from('creator_import_jobs')
      .update({
        status: failed === rows.length ? 'failed' : 'completed',
        imported_rows: imported,
        skipped_rows: skipped,
        failed_rows: failed,
        error_summary: errors.slice(0, 50),
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return NextResponse.json({ imported, skipped, failed, errors: errors.slice(0, 20) });
  } catch (error) {
    if (importJobId) {
      try {
        await getSupabaseAdmin()
          .from('creator_import_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_summary: [{
              row: 0,
              message: error instanceof Error ? error.message.slice(0, 500) : 'Unexpected import failure',
            }],
          })
          .eq('id', importJobId);
      } catch {}
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 },
    );
  }
}
