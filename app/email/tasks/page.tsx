'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Download,
  Mail,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  Send,
  Settings,
  Square,
  Upload,
} from 'lucide-react';
import DatabaseSetupNotice from '../../../components/DatabaseSetupNotice';
import { getSupabaseSafe } from '../../../lib/supabase';
import { useSupabaseUser } from '../../../hooks/useSupabaseUser';

type SenderProfile = {
  id: string;
  label: string;
  from_email: string | null;
  reply_to_email: string | null;
  sender_name: string | null;
  brand_name: string | null;
  daily_send_limit: number;
  is_enabled: boolean;
  is_default: boolean;
  notes: string | null;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject_template: string;
};

type CreatorList = {
  id: string;
  name: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  daily_send_limit: number;
  total_recipients: number;
  sender_name: string | null;
  brand_name: string | null;
  stats: {
    queued: number;
    sent: number;
    failed: number;
    cancelled: number;
    opened: number;
    clicked: number;
    openRate: number;
    progress: number;
  };
};

type RecentMessage = {
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

type TasksData = {
  campaigns: Campaign[];
  profiles: SenderProfile[];
  templates: EmailTemplate[];
  lists: CreatorList[];
  recentMessages: RecentMessage[];
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  scheduled: '待发送',
  sending: '发送中',
  paused: '已暂停',
  completed: '已完成',
  cancelled: '已取消',
};

const messageStatusLabels: Record<string, string> = {
  queued: '排队中',
  sending: '发送中',
  sent: '已发送',
  delivered: '已送达',
  opened: '已打开',
  clicked: '已点击',
  replied: '已回复',
  bounced: '退信',
  complained: '投诉',
  unsubscribed: '已退订',
  failed: '失败',
  cancelled: '已取消',
};

const initialData: TasksData = {
  campaigns: [],
  profiles: [],
  templates: [],
  lists: [],
  recentMessages: [],
};

export default function EmailTasksPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const [data, setData] = useState<TasksData>(initialData);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [senderFilter, setSenderFilter] = useState('all');
  const [taskName, setTaskName] = useState('新的达人建联任务');
  const [listId, setListId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [profileForm, setProfileForm] = useState({
    id: '',
    label: '默认发件配置',
    fromEmail: '',
    replyToEmail: '',
    senderName: '',
    brandName: '',
    dailySendLimit: 50,
    isEnabled: true,
    isDefault: true,
    notes: '',
  });

  const authFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const supabase = getSupabaseSafe();
    if (!supabase) throw new Error('Supabase 尚未配置。');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('登录状态已失效，请重新登录。');
    return fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.headers || {}),
        authorization: `Bearer ${token}`,
      },
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await authFetch('/api/email/tasks');
      const json = await response.json();
      if (!response.ok) {
        if (/does not exist|schema cache/i.test(json.error || '')) setSchemaMissing(true);
        setMessage(json.error || '邮件任务加载失败');
        return;
      }
      setData(json as TasksData);
      setListId((current) => current || json.lists?.[0]?.id || '');
      setTemplateId((current) => current || json.templates?.[0]?.id || '');
      setProfileId((current) => current || json.profiles?.[0]?.id || '');
      const defaultProfile = (json.profiles || [])[0] as SenderProfile | undefined;
      if (defaultProfile && !profileForm.id) {
        setProfileForm({
          id: defaultProfile.id,
          label: defaultProfile.label || '默认发件配置',
          fromEmail: defaultProfile.from_email || '',
          replyToEmail: defaultProfile.reply_to_email || '',
          senderName: defaultProfile.sender_name || '',
          brandName: defaultProfile.brand_name || '',
          dailySendLimit: defaultProfile.daily_send_limit || 50,
          isEnabled: defaultProfile.is_enabled !== false,
          isDefault: defaultProfile.is_default !== false,
          notes: defaultProfile.notes || '',
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '邮件任务加载失败');
    } finally {
      setLoading(false);
    }
  }, [authFetch, profileForm.id, user?.id]);

  useEffect(() => {
    if (!userLoading) void loadData();
  }, [loadData, userLoading]);

  const summary = useMemo(() => {
    const sent = data.campaigns.reduce((sum, item) => sum + item.stats.sent, 0);
    const opened = data.campaigns.reduce((sum, item) => sum + item.stats.opened, 0);
    const queued = data.campaigns.reduce((sum, item) => sum + item.stats.queued, 0);
    const activeTasks = data.campaigns.filter((item) => ['scheduled', 'sending'].includes(item.status)).length;
    return {
      sent,
      opened,
      queued,
      activeTasks,
      senderCount: data.profiles.filter((item) => item.is_enabled).length || 1,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    };
  }, [data.campaigns, data.profiles]);

  const filteredMessages = useMemo(() => data.recentMessages.filter((item) => {
    const dateOk = !dateFilter || (item.sent_at || item.created_at).slice(0, 10) === dateFilter;
    const senderOk = senderFilter === 'all' || item.campaign_id === senderFilter;
    return dateOk && senderOk;
  }), [data.recentMessages, dateFilter, senderFilter]);

  const createTask = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await authFetch('/api/email/tasks', {
        method: 'POST',
        body: JSON.stringify({
          name: taskName,
          listId,
          templateId,
          senderProfileId: profileId || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '任务创建失败');
      setMessage(`任务已创建：${json.queued} 个收件人进入待发送队列。`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '任务创建失败');
    } finally {
      setBusy(false);
    }
  };

  const runTask = async (campaignId: string) => {
    setBusy(true);
    try {
      const response = await authFetch('/api/email/tasks/run', {
        method: 'POST',
        body: JSON.stringify({ campaignId, batchSize: 10 }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '发送失败');
      const first = json.results?.[0];
      setMessage(first ? `已发送 ${first.sent || 0} 封，剩余 ${first.queued || 0} 封。` : '暂无需要发送的邮件。');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发送失败');
    } finally {
      setBusy(false);
    }
  };

  const updateTask = async (campaignId: string, action: string) => {
    setBusy(true);
    try {
      const response = await authFetch(`/api/email/tasks/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '任务更新失败');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '任务更新失败');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const response = await authFetch('/api/email/settings', {
        method: 'POST',
        body: JSON.stringify(profileForm),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '发件配置保存失败');
      setMessage('发件配置已保存。');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发件配置保存失败');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['platform', 'username', 'nickname', 'email', 'status', 'note'];
    const sample = ['tiktok', 'creator_name', '达人昵称', 'creator@example.com', '待联系', '建联备注'];
    const csv = [headers, sample].map((row) => row.map((value) => `"${value}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'potentialds-email-task-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (userLoading || loading) {
    return <main className="min-h-screen px-6 py-20 text-center text-sm text-zinc-500">正在加载邮件任务...</main>;
  }

  if (!user) {
    return (
      <main className="min-h-screen px-6 py-20 text-center">
        <p className="text-sm text-zinc-600">登录后才能使用邮件任务。</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">去登录</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-12 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Email Tasks</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">发信任务面板</h1>
            <p className="mt-2 text-sm text-zinc-600">新增任务、暂停发送，并查看每封邮件的估算打开情况。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold">
              <RefreshCw size={15} />
              刷新
            </button>
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold">
              <Download size={15} />
              下载模板
            </button>
            <Link href="/crm/import" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              <Upload size={15} />
              上传名单
            </Link>
          </div>
        </div>

        {schemaMissing ? <div className="mt-5"><DatabaseSetupNotice /></div> : null}
        {message ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div> : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['总发信量', summary.sent],
            ['待发送', summary.queued],
            ['发件配置', summary.senderCount],
            ['进行中任务', summary.activeTasks],
            ['估算打开率', `${summary.openRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white/90 px-5 py-4 shadow-sm shadow-zinc-200/30">
              <div className="text-xs text-zinc-500">{label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
            </div>
          ))}
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-sm shadow-zinc-200/30">
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} />
                <h2 className="text-lg font-semibold">当前任务情况</h2>
              </div>
              <div className="text-xs text-zinc-500">每次手动发送最多处理 10 封，定时任务会继续处理剩余队列。</div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-3 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-500">
                  <div className="col-span-3">任务</div>
                  <div className="col-span-1 text-center">总量</div>
                  <div className="col-span-1 text-center">已发送</div>
                  <div className="col-span-1 text-center">未发送</div>
                  <div className="col-span-2">进度</div>
                  <div className="col-span-1 text-center">打开率</div>
                  <div className="col-span-1">状态</div>
                  <div className="col-span-2 text-right">操作</div>
                </div>
                {data.campaigns.length === 0 ? (
                  <div className="px-5 py-14 text-center text-sm text-zinc-500">还没有发信任务。</div>
                ) : data.campaigns.map((campaign) => (
                  <div key={campaign.id} className="grid grid-cols-12 items-center gap-3 border-b border-zinc-100 px-5 py-4 text-sm last:border-b-0">
                    <div className="col-span-3 min-w-0">
                      <div className="truncate font-semibold">{campaign.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {new Date(campaign.scheduled_at || campaign.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="col-span-1 text-center font-semibold">{campaign.total_recipients}</div>
                    <div className="col-span-1 text-center font-semibold">{campaign.stats.sent}</div>
                    <div className="col-span-1 text-center font-semibold">{campaign.stats.queued}</div>
                    <div className="col-span-2">
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${campaign.stats.progress}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{campaign.stats.progress}%</div>
                    </div>
                    <div className="col-span-1 text-center font-semibold">{campaign.stats.openRate}%</div>
                    <div className="col-span-1">
                      <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                        {statusLabels[campaign.status] || campaign.status}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1.5">
                      {['scheduled', 'sending'].includes(campaign.status) ? (
                        <button type="button" title="暂停任务" disabled={busy} onClick={() => void updateTask(campaign.id, 'pause')} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 disabled:opacity-50">
                          <Pause size={14} />
                        </button>
                      ) : null}
                      {campaign.status === 'paused' ? (
                        <button type="button" title="恢复任务" disabled={busy} onClick={() => void updateTask(campaign.id, 'resume')} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 disabled:opacity-50">
                          <Play size={14} />
                        </button>
                      ) : null}
                      {['scheduled', 'sending'].includes(campaign.status) ? (
                        <button type="button" title="发送一批" disabled={busy} onClick={() => void runTask(campaign.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white disabled:opacity-50">
                          <Send size={14} />
                        </button>
                      ) : null}
                      {!['completed', 'cancelled'].includes(campaign.status) ? (
                        <button type="button" title="取消任务" disabled={busy} onClick={() => void updateTask(campaign.id, 'cancel')} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 bg-white text-red-600 disabled:opacity-50">
                          <Square size={13} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm shadow-zinc-200/30">
              <div className="flex items-center gap-2">
                <Plus size={18} />
                <h2 className="text-lg font-semibold">新增任务</h2>
              </div>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-zinc-500">
                  任务名称
                  <input value={taskName} onChange={(event) => setTaskName(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
                </label>
                <label className="block text-xs font-semibold text-zinc-500">
                  达人名单
                  <select value={listId} onChange={(event) => setListId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                    <option value="">选择名单</option>
                    {data.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-zinc-500">
                  邮件标题/模板
                  <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                    <option value="">选择模板</option>
                    {data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-zinc-500">
                  发件配置
                  <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                    <option value="">服务器默认</option>
                    {data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                  </select>
                </label>
                <button type="button" disabled={busy || !listId || !templateId} onClick={createTask} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  <Mail size={15} />
                  创建任务
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm shadow-zinc-200/30">
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <h2 className="text-lg font-semibold">邮箱设置</h2>
              </div>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-zinc-500">
                  配置名称
                  <input value={profileForm.label} onChange={(event) => setProfileForm((current) => ({ ...current, label: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
                </label>
                <label className="block text-xs font-semibold text-zinc-500">
                  发信邮箱
                  <input value={profileForm.fromEmail} onChange={(event) => setProfileForm((current) => ({ ...current, fromEmail: event.target.value }))} placeholder="留空使用服务器默认邮箱" className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-zinc-500">
                    发件人
                    <input value={profileForm.senderName} onChange={(event) => setProfileForm((current) => ({ ...current, senderName: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
                  </label>
                  <label className="block text-xs font-semibold text-zinc-500">
                    品牌
                    <input value={profileForm.brandName} onChange={(event) => setProfileForm((current) => ({ ...current, brandName: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-zinc-500">
                  每日上限
                  <input type="number" min={1} max={1000} value={profileForm.dailySendLimit} onChange={(event) => setProfileForm((current) => ({ ...current, dailySendLimit: Number(event.target.value) }))} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
                </label>
                <button type="button" onClick={() => setProfileForm((current) => ({ ...current, isEnabled: !current.isEnabled }))} className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${profileForm.isEnabled ? 'bg-emerald-600 text-white' : 'border border-zinc-300 bg-white text-zinc-700'}`}>
                  <Power size={15} />
                  {profileForm.isEnabled ? '启用中' : '已暂停'}
                </button>
                <button type="button" disabled={busy} onClick={saveProfile} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  保存设置
                </button>
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-sm shadow-zinc-200/30">
          <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Mail size={18} />
              <h2 className="text-lg font-semibold">发信情况</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm" />
              <select value={senderFilter} onChange={(event) => setSenderFilter(event.target.value)} className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm">
                <option value="all">全部任务</option>
                {data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-12 gap-3 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-500">
                <div className="col-span-3">收件箱</div>
                <div className="col-span-4">邮件标题</div>
                <div className="col-span-2">状态</div>
                <div className="col-span-1 text-center">打开</div>
                <div className="col-span-1 text-center">点击</div>
                <div className="col-span-1 text-right">时间</div>
              </div>
              {filteredMessages.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-500">暂无匹配记录。</div>
              ) : filteredMessages.map((item, index) => (
                <div key={`${item.recipient_email}-${item.created_at}-${index}`} className="grid grid-cols-12 items-center gap-3 border-b border-zinc-100 px-5 py-4 text-sm last:border-b-0">
                  <div className="col-span-3 min-w-0">
                    <div className="truncate font-semibold">{item.recipient_name || item.recipient_email}</div>
                    {item.recipient_name ? <div className="mt-1 truncate text-xs text-zinc-500">{item.recipient_email}</div> : null}
                  </div>
                  <div className="col-span-4 truncate text-zinc-700">{item.subject}</div>
                  <div className="col-span-2">
                    <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                      {messageStatusLabels[item.status] || item.status}
                    </span>
                  </div>
                  <div className="col-span-1 text-center font-semibold">{item.open_count || 0}</div>
                  <div className="col-span-1 text-center font-semibold">{item.click_count || 0}</div>
                  <div className="col-span-1 text-right text-xs text-zinc-500">
                    {new Date(item.sent_at || item.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
