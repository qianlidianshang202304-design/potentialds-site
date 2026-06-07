'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookmarkPlus, ExternalLink, Mail, Plus, Save, Sparkles } from 'lucide-react';
import DatabaseSetupNotice from '../../../components/DatabaseSetupNotice';
import {
  Creator,
  CreatorList,
  CreatorRelationship,
  formatCreatorNumber,
  relationshipStatuses,
} from '../../../lib/crm-types';
import { getSupabaseSafe } from '../../../lib/supabase';
import { useSupabaseUser } from '../../../hooks/useSupabaseUser';
import { trackProductEvent } from '../../../lib/analytics-client';

type CreatorNote = {
  id: string;
  body: string;
  created_at: string;
};

export default function CreatorDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const influencerId = params.id;
  const recommendationSourceId = searchParams.get('source') || '';
  const { user, loading: userLoading } = useSupabaseUser();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [similar, setSimilar] = useState<Creator[]>([]);
  const [lists, setLists] = useState<CreatorList[]>([]);
  const [relationship, setRelationship] = useState<CreatorRelationship | null>(null);
  const [notes, setNotes] = useState<CreatorNote[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [note, setNote] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<CreatorRelationship['status']>('to_contact');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const trackedOpen = useRef<string | null>(null);
  const trackedRecommendationSet = useRef('');

  const tagList = useMemo(
    () => (creator?.tags ?? '').split(',').map((item) => item.trim()).filter(Boolean),
    [creator?.tags],
  );

  const loadData = useCallback(async () => {
    const supabase = getSupabaseSafe();
    if (!supabase || !influencerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: creatorData } = await supabase
      .from('influencers')
      .select('*')
      .eq('id', influencerId)
      .maybeSingle();

    const loadedCreator = creatorData as unknown as Creator | null;
    setCreator(loadedCreator);

    if (loadedCreator) {
      let query = supabase
        .from('influencers')
        .select('id,nickname,username,avatar,platform,region,region_zh,tags,link,fans_num,view_avg,interactive_rate_avg,like_avg,biz_count')
        .neq('id', influencerId)
        .limit(6);

      if (loadedCreator.platform) query = query.eq('platform', loadedCreator.platform);
      if (loadedCreator.region) query = query.eq('region', loadedCreator.region);
      if (loadedCreator.fans_num) {
        query = query
          .gte('fans_num', Math.max(0, loadedCreator.fans_num * 0.4))
          .lte('fans_num', loadedCreator.fans_num * 2.5);
      }
      const { data } = await query.order('fans_num', { ascending: false });
      const similarCreators = (data as Creator[] | null) ?? [];
      setSimilar(similarCreators);
      if (trackedOpen.current !== influencerId) {
        trackedOpen.current = influencerId;
        trackProductEvent('creator_opened', { influencer_id: influencerId });
      }

      if (user?.id && similarCreators.length > 0) {
        const feedbackKey = `${user.id}:${influencerId}:${similarCreators.map((item) => item.id).join(',')}`;
        if (trackedRecommendationSet.current !== feedbackKey) {
          trackedRecommendationSet.current = feedbackKey;
          await supabase.from('creator_recommendation_feedback').insert(
            similarCreators.map((item) => ({
              user_id: user.id,
              source_influencer_id: influencerId,
              recommended_influencer_id: item.id,
              action: 'shown',
              algorithm_version: 'rules-v1',
            })),
          );
        }
      }
    }

    if (!user?.id) {
      setLoading(false);
      return;
    }

    const [listsResult, relationshipResult] = await Promise.all([
      supabase.from('creator_lists').select('*').order('updated_at', { ascending: false }),
      supabase
        .from('creator_relationships')
        .select('*')
        .eq('user_id', user.id)
        .eq('influencer_id', influencerId)
        .maybeSingle(),
    ]);

    if (listsResult.error || relationshipResult.error) {
      const errorText = `${listsResult.error?.message ?? ''} ${relationshipResult.error?.message ?? ''}`;
      if (/does not exist|schema cache/i.test(errorText)) setSchemaMissing(true);
    } else {
      const nextLists = (listsResult.data as CreatorList[] | null) ?? [];
      setLists(nextLists);
      setSelectedListId((current) => current || nextLists[0]?.id || '');

      const nextRelationship = relationshipResult.data as CreatorRelationship | null;
      setRelationship(nextRelationship);
      if (nextRelationship) {
        setContactEmail(nextRelationship.contact_email ?? '');
        setStatus(nextRelationship.status);
        setNextFollowUp(nextRelationship.next_follow_up_at?.slice(0, 16) ?? '');
        const notesResult = await supabase
          .from('creator_notes')
          .select('id,body,created_at')
          .eq('relationship_id', nextRelationship.id)
          .order('created_at', { ascending: false });
        setNotes((notesResult.data as CreatorNote[] | null) ?? []);
      }
    }

    setLoading(false);
  }, [influencerId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userLoading) void loadData();
  }, [loadData, userLoading]);

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
    const list = data as CreatorList;
    setLists((current) => [list, ...current]);
    setSelectedListId(list.id);
    setNewListName('');
    setMessage('名单已创建');
    trackProductEvent('list_created', { list_id: list.id });
  };

  const saveCreator = async () => {
    if (!user?.id) {
      setMessage('请先登录后收藏达人');
      return;
    }
    if (!selectedListId) {
      setMessage('请先创建或选择一个达人名单');
      return;
    }
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const { error } = await supabase.from('saved_creators').upsert(
      {
        user_id: user.id,
        list_id: selectedListId,
        influencer_id: influencerId,
        source: recommendationSourceId
          ? 'recommendation'
          : 'search',
      },
      { onConflict: 'list_id,influencer_id' },
    );
    setMessage(error ? error.message : '达人已收藏到名单');
    if (!error) {
      trackProductEvent('creator_saved', { influencer_id: influencerId, list_id: selectedListId });
      if (recommendationSourceId) {
        await supabase.from('creator_recommendation_feedback').insert({
          user_id: user.id,
          source_influencer_id: recommendationSourceId,
          recommended_influencer_id: influencerId,
          action: 'saved',
          algorithm_version: 'rules-v1',
        });
      }
    }
  };

  const recordRecommendationOpen = async (recommendedInfluencerId: string) => {
    if (!user?.id) return;
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    await supabase.from('creator_recommendation_feedback').insert({
      user_id: user.id,
      source_influencer_id: influencerId,
      recommended_influencer_id: recommendedInfluencerId,
      action: 'opened',
      algorithm_version: 'rules-v1',
    });
  };

  const saveRelationship = async () => {
    if (!user?.id) {
      setMessage('请先登录');
      return;
    }
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      influencer_id: influencerId,
      status,
      contact_email: contactEmail.trim() || null,
      next_follow_up_at: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
    };
    const { data, error } = await supabase
      .from('creator_relationships')
      .upsert(payload, { onConflict: 'user_id,influencer_id' })
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRelationship(data as CreatorRelationship);
    setMessage('联系信息已保存');
  };

  const addNote = async () => {
    if (!user?.id || !note.trim()) return;
    let currentRelationship = relationship;
    if (!currentRelationship) {
      await saveRelationship();
      const supabase = getSupabaseSafe();
      if (!supabase) return;
      const { data } = await supabase
        .from('creator_relationships')
        .select('*')
        .eq('user_id', user.id)
        .eq('influencer_id', influencerId)
        .maybeSingle();
      currentRelationship = data as CreatorRelationship | null;
    }
    if (!currentRelationship) return;
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('creator_notes')
      .insert({ user_id: user.id, relationship_id: currentRelationship.id, body: note.trim() })
      .select('id,body,created_at')
      .single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setNotes((current) => [data as CreatorNote, ...current]);
    setNote('');
    setMessage('备注已添加');
  };

  if (loading) {
    return <main className="min-h-screen px-6 py-20 text-center text-sm text-zinc-500">正在加载达人资料...</main>;
  }

  if (!creator) {
    return <main className="min-h-screen px-6 py-20 text-center text-sm text-zinc-500">未找到该达人。</main>;
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <Link href="/creator-workbench" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <ArrowLeft size={16} />
          返回达人工作台
        </Link>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">{creator.nickname || creator.username || '未命名达人'}</h1>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                  {creator.platform || 'Unknown'}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{creator.username ? `@${creator.username}` : ''}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['粉丝', formatCreatorNumber(creator.fans_num)],
                  ['平均播放', formatCreatorNumber(creator.view_avg)],
                  ['平均点赞', formatCreatorNumber(creator.like_avg)],
                  ['地区', creator.region_zh || creator.region || '-'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-xs text-zinc-500">{label}</div>
                    <div className="mt-1 text-lg font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {tagList.slice(0, 10).map((tag) => (
                  <span key={tag} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {creator.link ? (
                <a href={creator.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold">
                  访问主页
                  <ExternalLink size={15} />
                </a>
              ) : null}
              <Link href={`/email/templates?creator=${creator.id}`} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                写邮件
                <Mail size={15} />
              </Link>
            </div>
          </div>
        </section>

        {schemaMissing ? <div className="mt-5"><DatabaseSetupNotice /></div> : null}
        {message ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div> : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5">
            <h2 className="text-lg font-semibold">收藏到达人名单</h2>
            <div className="mt-4 flex gap-2">
              <select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm">
                <option value="">选择名单</option>
                {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
              </select>
              <button type="button" onClick={saveCreator} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">
                <BookmarkPlus size={15} />
                收藏
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder="新名单名称" className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 text-sm" />
              <button type="button" onClick={createList} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold">
                <Plus size={15} />
                新建
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5">
            <h2 className="text-lg font-semibold">联系状态</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-zinc-500">
                状态
                <select value={status} onChange={(event) => setStatus(event.target.value as CreatorRelationship['status'])} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                  {relationshipStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-zinc-500">
                联系邮箱
                <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
              </label>
              <label className="text-xs font-semibold text-zinc-500 sm:col-span-2">
                下次跟进
                <input type="datetime-local" value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
              </label>
            </div>
            <button type="button" disabled={saving} onClick={saveRelationship} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              <Save size={15} />
              {saving ? '保存中...' : '保存联系信息'}
            </button>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white/90 p-5">
          <h2 className="text-lg font-semibold">跟进备注</h2>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="记录沟通内容、报价或下一步计划" className="min-h-24 flex-1 rounded-xl border border-zinc-200 p-3 text-sm" />
            <button type="button" onClick={addNote} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white">添加备注</button>
          </div>
          <div className="mt-4 space-y-2">
            {notes.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-sm leading-6 text-zinc-700">{item.body}</p>
                <p className="mt-1 text-xs text-zinc-400">{new Date(item.created_at).toLocaleString('zh-CN')}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white/90 p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" />
            <h2 className="text-lg font-semibold">相似达人推荐</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">第一版按平台、地区和粉丝量区间推荐。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <Link
                key={item.id}
                href={`/creators/${item.id}?source=${influencerId}`}
                onClick={() => void recordRecommendationOpen(item.id)}
                className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-slate-900"
              >
                <div className="font-semibold">{item.nickname || item.username || '未命名达人'}</div>
                <div className="mt-1 text-xs text-zinc-500">{item.platform} · {item.region_zh || item.region || '未知地区'}</div>
                <div className="mt-3 text-sm">粉丝 {formatCreatorNumber(item.fans_num)}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
