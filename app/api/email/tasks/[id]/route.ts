import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

const allowedActions = new Set(['pause', 'resume', 'cancel', 'complete']);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json() as { action?: string };
    const action = String(body.action || '');
    if (!allowedActions.has(action)) return NextResponse.json({ error: '未知任务操作。' }, { status: 400 });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {};
    if (action === 'pause') update.status = 'paused';
    if (action === 'resume') {
      update.status = 'scheduled';
      update.next_run_at = now;
    }
    if (action === 'cancel') {
      update.status = 'cancelled';
      update.completed_at = now;
    }
    if (action === 'complete') {
      update.status = 'completed';
      update.completed_at = now;
    }

    const result = await admin
      .from('email_campaigns')
      .update(update)
      .eq('id', id)
      .eq('user_id', authData.user.id)
      .select('*')
      .single();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

    if (action === 'cancel') {
      await admin
        .from('email_messages')
        .update({ status: 'cancelled' })
        .eq('campaign_id', id)
        .eq('user_id', authData.user.id)
        .eq('status', 'queued');
    }

    return NextResponse.json({ campaign: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Task update failed' },
      { status: 500 },
    );
  }
}
