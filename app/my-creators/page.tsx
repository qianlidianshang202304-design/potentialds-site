'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FolderPlus, LayoutDashboard, Trash2, Upload } from 'lucide-react';
import DatabaseSetupNotice from '../../components/DatabaseSetupNotice';
import { Creator, CreatorList, CreatorRelationship, formatCreatorNumber, relationshipStatusLabel } from '../../lib/crm-types';
import { getSupabaseSafe } from '../../lib/supabase';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { trackProductEvent } from '../../lib/analytics-client';

type SavedRow = {
  id: string;
  list_id: string;
  influencer_id: string;
  created_at: string;
};

export default function MyCreatorsPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const [lists, setLists] = useState<CreatorList[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [creators, setCreators] = useState<Record<string, Creator>>({});
  const [relationships, setRelationships] = useState<Record<string, CreatorRelationship>>({});
  const [selectedList, setSelectedList] = useState('all');
  const [newListName, setNewListName] = useState('');
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
    setLoading(true);
    const [listsResult, savedResult, relationshipsResult] = await Promise.all([
      supabase.from('creator_lists').select('*').order('updated_at', { ascending: false }),
      supabase.from('saved_creators').select('id,list_id,influencer_id,created_at').order('created_at', { ascending: false }),
      supabase.from('creator_relationships').select('*').eq('user_id', user.id),
    ]);

    const errorText = `${listsResult.error?.message ?? ''} ${savedResult.error?.message ?? ''}`;
    if (/does not exist|schema cache/i.test(errorText)) {
      setSchemaMissing(true);
      setLoading(false);
      return;
    }

    const savedRows = (savedResult.data as SavedRow[] | null) ?? [];
    const influencerIds = Array.from(new Set(savedRows.map((row) => row.influencer_id)));
    let creatorRows: Creator[] = [];
    if (influencerIds.length > 0) {
      const { data } = await supabase.from('influencers').select('*').in('id', influencerIds);
      creatorRows = (data as Creator[] | null) ?? [];
    }

    setLists((listsResult.data as CreatorList[] | null) ?? []);
    setSaved(savedRows);
    setCreators(Object.fromEntries(creatorRows.map((creator) => [creator.id, creator])));
    const relationshipRows = (relationshipsResult.data as CreatorRelationship[] | null) ?? [];
    setRelationships(Object.fromEntries(relationshipRows.map((item) => [item.influencer_id, item])));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userLoading) void loadData();
  }, [loadData, userLoading]);

  const visibleRows = useMemo(
    () => selectedList === 'all' ? saved : saved.filter((row) => row.list_id === selectedList),
    [saved, selectedList],
  );

  const createList = async () => {
    if (!user?.id || !newListName.trim()) return;
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('creator_lists')
      .insert({ user_id: user.id, name: newListName.trim() })
      .select('*')
      .single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setLists((current) => [data as CreatorList, ...current]);
    setNewListName('');
    setMessage('名单已创建');
  };

  const removeSaved = async (savedId: string) => {
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const { error } = await supabase.from('saved_creators').delete().eq('id', savedId);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSaved((current) => current.filter((row) => row.id !== savedId));
  };

  const exportCsv = () => {
    const rows = visibleRows.map((row) => {
      const creator = creators[row.influencer_id];
      const relationship = relationships[row.influencer_id];
      return [
        creator?.nickname ?? '',
        creator?.username ?? '',
        creator?.platform ?? '',
        creator?.fans_num ?? '',
        creator?.view_avg ?? '',
        creator?.region_zh ?? creator?.region ?? '',
        creator?.tags ?? '',
        relationship?.contact_email ?? '',
        relationship ? relationshipStatusLabel(relationship.status) : '待联系',
        relationship?.next_follow_up_at ?? '',
        creator?.link ?? '',
      ];
    });
    const headers = ['昵称', '用户名', '平台', '粉丝数', '平均播放', '地区', '标签', '联系邮箱', '联系状态', '下次跟进', '主页链接'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `potentialds-creators-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    trackProductEvent('csv_exported', { row_count: visibleRows.length, source: 'creator_list' });
  };

  if (userLoading || loading) {
    return <main className="min-h-screen px-6 py-20 text-center text-sm text-zinc-500">正在加载达人名单...</main>;
  }

  if (!user) {
    return (
      <main className="min-h-screen px-6 py-20 text-center">
        <p className="text-sm text-zinc-600">登录后才能管理达人名单。</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">去登录</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">My Creators</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">我的达人名单</h1>
            <p className="mt-2 text-sm text-zinc-600">收藏、分组、导出并持续跟进达人。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/crm/import" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold">
              <Upload size={15} />
              批量导入
            </Link>
            <Link href="/crm" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold">
              <LayoutDashboard size={15} />
              CRM 看板
            </Link>
            <button type="button" onClick={exportCsv} disabled={visibleRows.length === 0} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Download size={15} />
              导出
            </button>
          </div>
        </div>

        {schemaMissing ? <div className="mt-5"><DatabaseSetupNotice /></div> : null}
        {message ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div> : null}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedList('all')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedList === 'all' ? 'bg-slate-900 text-white' : 'border border-zinc-200 bg-white'}`}>
                全部 {saved.length}
              </button>
              {lists.map((list) => {
                const count = saved.filter((row) => row.list_id === list.id).length;
                return (
                  <button key={list.id} type="button" onClick={() => setSelectedList(list.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedList === list.id ? 'bg-slate-900 text-white' : 'border border-zinc-200 bg-white'}`}>
                    {list.name} {count}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder="新名单名称" className="h-10 w-40 rounded-xl border border-zinc-200 px-3 text-sm" />
              <button type="button" onClick={createList} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold">
                <FolderPlus size={15} />
                新建
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white/90">
          <div className="grid min-w-[760px] grid-cols-12 gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500">
            <div className="col-span-3">达人</div>
            <div className="col-span-2">数据</div>
            <div className="col-span-2">地区/标签</div>
            <div className="col-span-2">联系状态</div>
            <div className="col-span-2">下次跟进</div>
            <div className="col-span-1 text-right">操作</div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {visibleRows.length === 0 ? (
                <div className="px-4 py-14 text-center text-sm text-zinc-500">当前名单还没有达人。</div>
              ) : visibleRows.map((row) => {
                const creator = creators[row.influencer_id];
                const relationship = relationships[row.influencer_id];
                if (!creator) return null;
                return (
                  <div key={row.id} className="grid grid-cols-12 gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0">
                    <div className="col-span-3 min-w-0">
                      <Link href={`/creators/${creator.id}`} className="truncate text-sm font-semibold hover:underline">{creator.nickname || creator.username || '未命名达人'}</Link>
                      <div className="mt-1 text-xs text-zinc-500">{creator.platform} {creator.username ? `· @${creator.username}` : ''}</div>
                    </div>
                    <div className="col-span-2 text-xs text-zinc-600">
                      <div>粉丝 {formatCreatorNumber(creator.fans_num)}</div>
                      <div className="mt-1">均播 {formatCreatorNumber(creator.view_avg)}</div>
                    </div>
                    <div className="col-span-2 min-w-0 text-xs text-zinc-600">
                      <div className="truncate">{creator.region_zh || creator.region || '-'}</div>
                      <div className="mt-1 truncate">{creator.tags || '-'}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                        {relationship ? relationshipStatusLabel(relationship.status) : '待联系'}
                      </span>
                    </div>
                    <div className="col-span-2 text-xs text-zinc-600">
                      {relationship?.next_follow_up_at ? new Date(relationship.next_follow_up_at).toLocaleString('zh-CN') : '-'}
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      {creator.link ? <a href={creator.link} target="_blank" rel="noreferrer" title="访问主页" className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200"><ExternalLink size={14} /></a> : null}
                      <button type="button" title="从名单移除" onClick={() => removeSaved(row.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
