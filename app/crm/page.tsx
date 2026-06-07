'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, List, Mail, Upload } from 'lucide-react';
import DatabaseSetupNotice from '../../components/DatabaseSetupNotice';
import {
  Creator,
  CreatorRelationship,
  RelationshipStatus,
  formatCreatorNumber,
  relationshipStatuses,
} from '../../lib/crm-types';
import { getSupabaseSafe } from '../../lib/supabase';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';

export default function CrmPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const [relationships, setRelationships] = useState<CreatorRelationship[]>([]);
  const [creators, setCreators] = useState<Record<string, Creator>>({});
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const result = await supabase
      .from('creator_relationships')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (result.error) {
      if (/does not exist|schema cache/i.test(result.error.message)) setSchemaMissing(true);
      setLoading(false);
      return;
    }
    const rows = (result.data as CreatorRelationship[] | null) ?? [];
    const ids = rows.map((row) => row.influencer_id);
    let creatorRows: Creator[] = [];
    if (ids.length > 0) {
      const { data } = await supabase.from('influencers').select('*').in('id', ids);
      creatorRows = (data as Creator[] | null) ?? [];
    }
    setRelationships(rows);
    setCreators(Object.fromEntries(creatorRows.map((creator) => [creator.id, creator])));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userLoading) void loadData();
  }, [loadData, userLoading]);

  const columns = useMemo(
    () => relationshipStatuses.map((status) => ({
      ...status,
      items: relationships.filter((item) => item.status === status.value),
    })),
    [relationships],
  );

  const updateStatus = async (relationshipId: string, status: RelationshipStatus) => {
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const { error } = await supabase
      .from('creator_relationships')
      .update({ status })
      .eq('id', relationshipId);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRelationships((current) => current.map((item) => item.id === relationshipId ? { ...item, status } : item));
  };

  if (userLoading || loading) {
    return <main className="min-h-screen px-6 py-20 text-center text-sm text-zinc-500">正在加载 CRM...</main>;
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-12 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Creator CRM</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">达人建联看板</h1>
            <p className="mt-2 text-sm text-zinc-600">从待联系到已合作，集中查看每个达人当前进度。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/my-creators" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"><List size={15} />名单视图</Link>
            <Link href="/crm/import" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"><Upload size={15} />批量导入</Link>
            <Link href="/email/templates" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Mail size={15} />邮件模板</Link>
          </div>
        </div>

        {schemaMissing ? <div className="mt-5"><DatabaseSetupNotice /></div> : null}
        {message ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div> : null}

        <section className="mt-6 overflow-x-auto pb-4">
          <div className="grid min-w-[1800px] grid-cols-9 gap-3">
            {columns.map((column) => (
              <div key={column.value} className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3">
                <div className="flex items-center justify-between px-1 py-1">
                  <h2 className="text-sm font-semibold">{column.label}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500">{column.items.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {column.items.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-xs text-zinc-400">暂无达人</div> : null}
                  {column.items.map((relationship) => {
                    const creator = creators[relationship.influencer_id];
                    return (
                      <article key={relationship.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                        <Link href={`/creators/${relationship.influencer_id}`} className="block truncate text-sm font-semibold hover:underline">
                          {creator?.nickname || creator?.username || `达人 #${relationship.influencer_id}`}
                        </Link>
                        <p className="mt-1 text-xs text-zinc-500">{creator?.platform || '-'} · 粉丝 {formatCreatorNumber(creator?.fans_num)}</p>
                        {relationship.contact_email ? <p className="mt-2 truncate text-xs text-zinc-600">{relationship.contact_email}</p> : null}
                        {relationship.next_follow_up_at ? <p className="mt-2 text-xs text-amber-700">跟进：{new Date(relationship.next_follow_up_at).toLocaleDateString('zh-CN')}</p> : null}
                        <select value={relationship.status} onChange={(event) => updateStatus(relationship.id, event.target.value as RelationshipStatus)} className="mt-3 h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs">
                          {relationshipStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3">
          <p className="text-sm text-zinc-600">共 {relationships.length} 个正在跟进的达人</p>
          <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Download size={15} />
            请在名单页导出
          </button>
        </div>
      </div>
    </main>
  );
}
