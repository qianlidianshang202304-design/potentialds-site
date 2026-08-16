'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FolderPlus,
  Inbox,
  Mail,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  Send,
  Settings,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import DatabaseSetupNotice from '../../../components/DatabaseSetupNotice';
import LineChart, { type ChartPoint } from '../../../components/LineChart';
import { getSupabaseSafe } from '../../../lib/supabase';
import { useSupabaseUser } from '../../../hooks/useSupabaseUser';

type SenderProfile = {
  id: string;
  label: string;
  provider?: string | null;
  from_email: string | null;
  reply_to_email: string | null;
  sender_name: string | null;
  brand_name: string | null;
  daily_send_limit: number;
  is_enabled: boolean;
  is_default: boolean;
  notes: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  smtp_secure?: boolean | null;
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
  template_id: string | null;
  template_name: string | null;
  status: string;
  open_count: number | null;
  click_count: number | null;
  sender_email: string | null;
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
  failed: '发送失败',
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

const isSentMessage = (status: string) => !['queued', 'sending', 'failed', 'cancelled'].includes(status);

function pct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function shortDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '-';
}

// 把 UTC ISO 时间戳转换为"北京时间（UTC+8）的 YYYY-MM-DD"字符串
// 用于解决：Supabase 存 UTC，直接 slice(0,10) 会有跨日偏差
function beijingDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // UTC + 8 小时
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = beijing.getUTCFullYear();
  const m = (beijing.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = beijing.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function groupMailStats<T extends string>(
  rows: RecentMessage[],
  keyFor: (row: RecentMessage) => T,
  labelFor: (key: T) => string = (key) => key,
) {
  const grouped = new Map<T, { key: T; label: string; sent: number; opened: number }>();
  for (const row of rows) {
    const key = keyFor(row);
    const current = grouped.get(key) || { key, label: labelFor(key), sent: 0, opened: 0 };
    if (isSentMessage(row.status)) current.sent += 1;
    if ((row.open_count || 0) > 0) current.opened += 1;
    grouped.set(key, current);
  }
  return Array.from(grouped.values())
    .map((item) => ({ ...item, openRate: pct(item.opened, item.sent) }))
    .sort((a, b) => b.sent - a.sent || b.opened - a.opened);
}

export default function EmailTasksPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const [data, setData] = useState<TasksData>(initialData);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const formInitialized = useRef(false);
  const [testing, setTesting] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [senderFilter, setSenderFilter] = useState('all');
  const [inboxFilter, setInboxFilter] = useState<string>('all');
  const [chartStartDate, setChartStartDate] = useState('');
  const [chartEndDate, setChartEndDate] = useState('');
  const [taskName, setTaskName] = useState('新的达人建联任务');
  const [listId, setListId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [profileForm, setProfileForm] = useState({
    id: '',
    label: '默认发件配置',
    provider: 'smtp',
    fromEmail: '',
    replyToEmail: '',
    senderName: '',
    brandName: '',
    dailySendLimit: 50,
    isEnabled: true,
    isDefault: true,
    notes: '',
    smtpHost: '',
    smtpPort: 465,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
  });
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

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

  const createList = async () => {
    const trimmedName = newListName.trim();
    if (!trimmedName || !user?.id) return;
    setCreatingList(true);
    try {
      const supabase = getSupabaseSafe();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('creator_lists')
        .insert({ user_id: user.id, name: trimmedName })
        .select('*')
        .single();
      if (error) {
        setMessage(`创建名单失败：${error.message}`);
        return;
      }
      const created = data as { id: string; name: string };
      setData((current) => ({ ...current, lists: [created, ...current.lists] }));
      setListId(created.id);
      setNewListName('');
      setMessage(`名单「${created.name}」已创建。`);
    } finally {
      setCreatingList(false);
    }
  };

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
      if (defaultProfile && !profileForm.id && !formInitialized.current) {
        formInitialized.current = true;
        setProfileForm({
          id: defaultProfile.id,
          label: defaultProfile.label || '默认发件配置',
          provider: defaultProfile.provider || 'smtp',
          fromEmail: defaultProfile.from_email || '',
          replyToEmail: defaultProfile.reply_to_email || '',
          senderName: defaultProfile.sender_name || '',
          brandName: defaultProfile.brand_name || '',
          dailySendLimit: defaultProfile.daily_send_limit || 50,
          isEnabled: defaultProfile.is_enabled !== false,
          isDefault: defaultProfile.is_default !== false,
          notes: defaultProfile.notes || '',
          smtpHost: defaultProfile.smtp_host || '',
          smtpPort: defaultProfile.smtp_port || 465,
          smtpUser: defaultProfile.smtp_user || '',
          smtpPassword: defaultProfile.smtp_password || '',
          smtpSecure: defaultProfile.smtp_secure !== false,
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

  const senderOptions = useMemo(() => {
    const emails = new Set<string>();
    data.profiles.forEach((profile) => {
      if (profile.from_email) emails.add(profile.from_email);
    });
    data.recentMessages.forEach((item) => {
      if (item.sender_email) emails.add(item.sender_email);
    });
    return Array.from(emails).sort();
  }, [data.profiles, data.recentMessages]);

  const filteredMessages = useMemo(() => data.recentMessages.filter((item) => {
    const localDate = beijingDate(item.sent_at || item.created_at);
    const dateOk = !dateFilter || localDate === dateFilter;
    const senderOk = senderFilter === 'all' || item.sender_email === senderFilter;
    return dateOk && senderOk;
  }), [data.recentMessages, dateFilter, senderFilter]);

  const summary = useMemo(() => {
    const sent = filteredMessages.reduce((sum, item) => sum + (isSentMessage(item.status) ? 1 : 0), 0);
    const opened = filteredMessages.reduce((sum, item) => sum + ((item.open_count || 0) > 0 ? 1 : 0), 0);
    const queued = data.campaigns.reduce((sum, item) => sum + item.stats.queued, 0);
    const activeTasks = data.campaigns.filter((item) => ['scheduled', 'sending'].includes(item.status)).length;
    const uniqueSenders = new Set<string>();
    filteredMessages.forEach((m) => { if (m.sender_email) uniqueSenders.add(m.sender_email); });
    const senderCount = senderFilter === 'all'
      ? data.profiles.filter((item) => item.is_enabled).length
      : uniqueSenders.size || 1;
    return {
      sent,
      opened,
      queued,
      activeTasks,
      senderCount,
      openRate: pct(opened, sent),
    };
  }, [filteredMessages, data.campaigns, data.profiles, senderFilter]);

  // 收件箱统计独立筛选：用全量消息在日期+发件箱基础上再叠加收件人筛选
  const inboxFilteredMessages = useMemo(() => filteredMessages.filter((item) => {
    if (inboxFilter === 'all') return true;
    return item.recipient_email === inboxFilter;
  }), [filteredMessages, inboxFilter]);

  const senderStats = useMemo(() => groupMailStats(
    filteredMessages,
    (row) => (row.sender_email || '服务器默认') as string,
  ), [filteredMessages]);

  // 模板统计（"邮件标题"改为"邮件模板"：按 template_id 聚合，没 template 的回退到标题）
  const templateStats = useMemo(() => groupMailStats(
    filteredMessages,
    (row) => (row.template_name ? `📧 ${row.template_name}` : `📄 ${row.subject || '未命名邮件'}`) as string,
  ), [filteredMessages]);

  const inboxStats = useMemo(() => groupMailStats(
    inboxFilteredMessages,
    (row) => row.recipient_email,
    (email) => email,
  ), [inboxFilteredMessages]);

  const inboxOptions = useMemo(() => {
    const set = new Set<string>();
    filteredMessages.forEach((row) => {
      if (row.recipient_email) set.add(row.recipient_email);
    });
    return Array.from(set).sort();
  }, [filteredMessages]);

  // 折线图数据：按日期聚合发信量与打开率
  const chartData = useMemo<ChartPoint[]>(() => {
    const allMessages = data.recentMessages;
    if (allMessages.length === 0) return [];

    const filtered = allMessages.filter((item) => {
      const localDate = beijingDate(item.sent_at || item.created_at);
      if (chartStartDate && localDate < chartStartDate) return false;
      if (chartEndDate && localDate > chartEndDate) return false;
      return true;
    });

    const byDate = new Map<string, { sent: number; opened: number }>();
    for (const msg of filtered) {
      const d = beijingDate(msg.sent_at || msg.created_at);
      if (!d) continue;
      const cur = byDate.get(d) || { sent: 0, opened: 0 };
      if (isSentMessage(msg.status)) cur.sent++;
      if ((msg.open_count || 0) > 0) cur.opened++;
      byDate.set(d, cur);
    }

    return Array.from(byDate.entries())
      .map(([date, v]) => ({
        date,
        sent: v.sent,
        opened: v.opened,
        openRate: pct(v.opened, v.sent),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.recentMessages, chartStartDate, chartEndDate]);

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
    setMessage('正在发送邮件，请稍候…（每封邮件约需 2-5 秒）');
    try {
      const response = await authFetch('/api/email/tasks/run', {
        method: 'POST',
        body: JSON.stringify({ campaignId, batchSize: 10 }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '发送失败');
      const first = json.results?.[0];
      if (!first) {
        setMessage('暂无需要发送的邮件。');
      } else if (first.error) {
        setMessage(first.error);
      } else if (first.firstError) {
        setMessage(`发送完成（含错误）：成功 ${first.sent || 0} 封，失败 ${first.failed || 0} 封。\n错误详情：${first.firstError}`);
      } else if ((first.failed || 0) > 0) {
        setMessage(`部分发送失败：成功 ${first.sent || 0} 封，失败 ${first.failed || 0} 封。`);
      } else {
        setMessage(`✅ 已发送 ${first.sent || 0} 封，剩余 ${first.queued || 0} 封等待发送。`);
      }
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
      if (json.profile?.id) {
        setProfileForm((current) => ({ ...current, id: json.profile.id }));
        const profile = json.profile as SenderProfile;
        setData((current) => {
          const exists = current.profiles.some((p) => p.id === profile.id);
          return {
            ...current,
            profiles: exists
              ? current.profiles.map((p) => p.id === profile.id ? profile : p)
              : [...current.profiles, profile],
          };
        });
      }
      setMessage('发件配置已保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发件配置保存失败');
    } finally {
      setBusy(false);
    }
  };

  const testProfile = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const response = await authFetch('/api/email/settings/test', {
        method: 'POST',
        body: JSON.stringify(profileForm),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '测试失败');
      setMessage('✅ 测试邮件发送成功，请检查收件箱。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '测试失败');
    } finally {
      setTesting(false);
    }
  };

  const toggleProfile = async (profile: SenderProfile, isEnabled: boolean) => {
    setBusy(true);
    try {
      const response = await authFetch('/api/email/settings', {
        method: 'POST',
        body: JSON.stringify({
          id: profile.id,
          label: profile.label,
          provider: profile.provider || 'smtp',
          fromEmail: profile.from_email || '',
          replyToEmail: profile.reply_to_email || '',
          senderName: profile.sender_name || '',
          brandName: profile.brand_name || '',
          dailySendLimit: profile.daily_send_limit || 50,
          isEnabled,
          isDefault: profile.is_default,
          notes: profile.notes || '',
          smtpHost: profile.smtp_host || '',
          smtpPort: profile.smtp_port || 465,
          smtpUser: profile.smtp_user || '',
          smtpPassword: profile.smtp_password || '',
          smtpSecure: profile.smtp_secure !== false,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '邮箱状态更新失败');
      setMessage(isEnabled ? '邮箱已启用。' : '邮箱已暂停。');
      setData((current) => ({
        ...current,
        profiles: current.profiles.map((p) =>
          p.id === profile.id ? { ...p, is_enabled: isEnabled } : p
        ),
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '邮箱状态更新失败');
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

  const clearCompletedTasks = async () => {
    if (!window.confirm('确认清除所有已完成/已取消/发送失败的任务吗？相关邮件记录将一并删除。')) return;
    setBusy(true);
    try {
      const response = await authFetch('/api/email/tasks', { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '清除失败');
      setMessage(`已清除 ${json.deleted || 0} 个任务。`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '清除失败');
    } finally {
      setBusy(false);
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!window.confirm('确认删除该邮箱配置？删除后不可恢复。')) return;
    setBusy(true);
    try {
      const response = await authFetch(`/api/email/settings?id=${encodeURIComponent(profileId)}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '删除失败');
      if (profileForm.id === profileId) {
        setProfileForm({
          id: '',
          label: '默认发件配置',
          provider: 'smtp',
          fromEmail: '',
          replyToEmail: '',
          senderName: '',
          brandName: '',
          dailySendLimit: 50,
          isEnabled: true,
          isDefault: true,
          notes: '',
          smtpHost: '',
          smtpPort: 465,
          smtpUser: '',
          smtpPassword: '',
          smtpSecure: true,
        });
      }
      setMessage('邮箱配置已删除。');
      setData((current) => ({
        ...current,
        profiles: current.profiles.filter((p) => p.id !== profileId),
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除失败');
    } finally {
      setBusy(false);
    }
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
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Email Operation</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">发信任务面板</h1>
            <p className="mt-2 text-sm text-zinc-600">邮件面板、任务设置和邮箱设置统一在这一页。</p>
          </div>
          <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold lg:self-auto">
            <RefreshCw size={15} />
            刷新
          </button>
        </div>

        {schemaMissing ? <div className="mt-5"><DatabaseSetupNotice /></div> : null}
        {message ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div> : null}

        <section id="mail-panel" className="mt-6 rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-200/40">
          <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              <h2 className="text-lg font-semibold">邮件面板</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                时间筛选器
                <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                发信邮箱筛选器
                <select value={senderFilter} onChange={(event) => setSenderFilter(event.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                  <option value="all">全部邮箱</option>
                  {senderOptions.map((email) => <option key={email} value={email}>{email}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="grid border-b border-zinc-100 sm:grid-cols-4">
            {[
              ['发件箱', senderFilter === 'all' ? '全部' : senderFilter],
              ['总发信量', summary.sent],
              ['发件邮箱数', summary.senderCount],
              ['打开率', `${summary.openRate}%`],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-zinc-100 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <div className="text-xs font-semibold text-zinc-500">{label}</div>
                <div className="mt-2 truncate text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-0 xl:grid-cols-2">
            <div className="border-b border-zinc-100 xl:border-b-0 xl:border-r">
              <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-zinc-500">
                <div className="col-span-6">发件邮箱名</div>
                <div className="col-span-2 text-zinc-500">发信日期</div>
                <div className="col-span-2 text-center">发信数</div>
                <div className="col-span-2 text-right">打开率</div>
              </div>
              {senderStats.length === 0 ? (
                <div className="px-5 py-10 text-sm text-zinc-500">暂无发件邮箱数据。</div>
              ) : senderStats.slice(0, 8).map((item) => (
                <div key={item.key} className="grid grid-cols-12 gap-3 border-t border-zinc-100 px-5 py-3 text-sm">
                  <div className="col-span-6 truncate font-semibold">{item.label}</div>
                  <div className="col-span-2 text-zinc-500">{dateFilter || '全部'}</div>
                  <div className="col-span-2 text-center">{item.sent}</div>
                  <div className="col-span-2 text-right font-semibold">{item.openRate}%</div>
                </div>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-zinc-500">
                <div className="col-span-8">邮件模板</div>
                <div className="col-span-2 text-center">发信数</div>
                <div className="col-span-2 text-right">打开率</div>
              </div>
              {templateStats.length === 0 ? (
                <div className="px-5 py-10 text-sm text-zinc-500">暂无邮件模板数据。</div>
              ) : templateStats.slice(0, 8).map((item: { key: string; label: string; sent: number; openRate: number }) => (
                <div key={item.key} className="grid grid-cols-12 gap-3 border-t border-zinc-100 px-5 py-3 text-sm">
                  <div className="col-span-8 truncate font-semibold">{item.label}</div>
                  <div className="col-span-2 text-center">{item.sent}</div>
                  <div className="col-span-2 text-right font-semibold">{item.openRate}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === 收件箱查询：独立区块，单独的筛选器 === */}
        <section className="mt-5 rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-200/40">
          <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Inbox size={18} />
              <h2 className="text-lg font-semibold">收件箱查询</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">打开率按单个收件邮箱单独统计</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                时间筛选器
                <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                发信邮箱筛选器
                <select value={senderFilter} onChange={(event) => setSenderFilter(event.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                  <option value="all">全部邮箱</option>
                  {senderOptions.map((email) => <option key={email} value={email}>{email}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                收件箱筛选器
                <select value={inboxFilter} onChange={(event) => setInboxFilter(event.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900 min-w-[220px]">
                  <option value="all">全部收件邮箱</option>
                  {inboxOptions.map((email) => <option key={email} value={email}>{email}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="grid border-b border-zinc-100 sm:grid-cols-4">
            {[
              ['发件箱', senderFilter === 'all' ? '全部' : senderFilter],
              ['收件箱', inboxFilter === 'all' ? '全部' : inboxFilter],
              ['发送总数', inboxStats.reduce((s, i) => s + i.sent, 0)],
              ['总打开率', `${pct(inboxStats.reduce((s, i) => s + i.opened, 0), inboxStats.reduce((s, i) => s + i.sent, 0))}%`],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-zinc-100 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <div className="text-xs font-semibold text-zinc-500">{label}</div>
                <div className="mt-2 truncate text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-zinc-500">
            <div className="col-span-5">收件邮箱</div>
            <div className="col-span-2 text-center">发送</div>
            <div className="col-span-2 text-center">打开</div>
            <div className="col-span-3 text-right">打开率</div>
          </div>
          <div className="divide-y divide-zinc-100">
            {inboxStats.length === 0 ? (
              <div className="px-5 py-10 text-sm text-zinc-500">暂无收件箱数据。</div>
            ) : inboxStats.map((item) => (
              <div key={item.key} className="grid grid-cols-12 gap-3 px-5 py-3 text-sm">
                <div className="col-span-5 truncate font-semibold">{item.label}</div>
                <div className="col-span-2 text-center tabular-nums">{item.sent}</div>
                <div className="col-span-2 text-center tabular-nums">{item.opened}</div>
                <div className="col-span-3 text-right font-semibold tabular-nums">
                  {item.openRate}%
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${item.openRate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === 趋势折线图 === */}
        <section className="mt-5 rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-200/40">
          <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              <h2 className="text-lg font-semibold">发信趋势</h2>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">发信量 + 打开率 按日聚合</span>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                开始日期
                <input type="date" value={chartStartDate} onChange={(e) => setChartStartDate(e.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
              </label>
              <span className="text-zinc-400">—</span>
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                结束日期
                <input type="date" value={chartEndDate} onChange={(e) => setChartEndDate(e.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
              </label>
              <button type="button" onClick={() => { setChartStartDate(''); setChartEndDate(''); }} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">重置</button>
            </div>
          </div>
          <div className="px-5 py-4">
            <LineChart data={chartData} height={240} />
          </div>
        </section>

        <section id="mailbox-settings" className="mt-5">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-200/40">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <h2 className="text-lg font-semibold">邮箱设置</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  formInitialized.current = true;
                  setProfileForm({
                    id: '',
                    label: '默认发件配置',
                    provider: 'smtp',
                    fromEmail: '',
                    replyToEmail: '',
                    senderName: '',
                    brandName: '',
                    dailySendLimit: 50,
                    isEnabled: true,
                    isDefault: false,
                    notes: '',
                    smtpHost: '',
                    smtpPort: 465,
                    smtpUser: '',
                    smtpPassword: '',
                    smtpSecure: true,
                  });
                  setExpandedProfileId('new');
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700"
              >
                <Plus size={13} />
                新建配置
              </button>
            </div>

            {data.profiles.length === 0 && expandedProfileId !== 'new' ? (
              <div className="px-4 py-12 text-sm text-zinc-500">还没有邮箱配置。点击右上角"新建配置"添加。</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {data.profiles.map((profile) => {
                  const isExpanded = expandedProfileId === profile.id;
                  const fillForm = () => setProfileForm({
                    id: profile.id,
                    label: profile.label || '默认发件配置',
                    provider: profile.provider || 'smtp',
                    fromEmail: profile.from_email || '',
                    replyToEmail: profile.reply_to_email || '',
                    senderName: profile.sender_name || '',
                    brandName: profile.brand_name || '',
                    dailySendLimit: profile.daily_send_limit || 50,
                    isEnabled: profile.is_enabled !== false,
                    isDefault: profile.is_default !== false,
                    notes: profile.notes || '',
                    smtpHost: profile.smtp_host || '',
                    smtpPort: profile.smtp_port || 465,
                    smtpUser: profile.smtp_user || '',
                    smtpPassword: profile.smtp_password || '',
                    smtpSecure: profile.smtp_secure !== false,
                  });
                  return (
                  <div key={profile.id}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (isExpanded) { setExpandedProfileId(null); }
                          else { fillForm(); setExpandedProfileId(profile.id); }
                        }}
                        className="flex items-center gap-2 truncate text-left font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xs text-zinc-400">{isExpanded ? '▼' : '▶'}</span>
                        {profile.from_email || profile.label}
                        {profile.is_enabled ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">启用</span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">暂停</span>
                        )}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">{profile.sender_name || profile.brand_name || '-'}</span>
                        <span className="text-zinc-300">|</span>
                        <span className="text-xs text-zinc-500">每日上限: {profile.daily_send_limit}</span>
                        <button type="button" disabled={busy || profile.is_enabled} onClick={() => void toggleProfile(profile, true)} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-40">
                          启用
                        </button>
                        <button type="button" disabled={busy || !profile.is_enabled} onClick={() => void toggleProfile(profile, false)} className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 disabled:opacity-40">
                          暂停
                        </button>
                        <button type="button" disabled={busy} onClick={() => void deleteProfile(profile.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 disabled:opacity-40" title="删除邮箱配置">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-4">
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-zinc-500">
                            配置名称
                            <input value={profileForm.label} onChange={(event) => setProfileForm((current) => ({ ...current, label: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                          </label>
                          <label className="block text-xs font-semibold text-zinc-500">
                            发信箱
                            <input value={profileForm.fromEmail} onChange={(event) => setProfileForm((current) => ({ ...current, fromEmail: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                          </label>
                          <label className="block text-xs font-semibold text-zinc-500">
                            回复邮箱
                            <input value={profileForm.replyToEmail} onChange={(event) => setProfileForm((current) => ({ ...current, replyToEmail: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-500">
                              发件人
                              <input value={profileForm.senderName} onChange={(event) => setProfileForm((current) => ({ ...current, senderName: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-500">
                              品牌
                              <input value={profileForm.brandName} onChange={(event) => setProfileForm((current) => ({ ...current, brandName: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-500">
                              发信方式
                              <select value={profileForm.provider} onChange={(event) => setProfileForm((current) => ({ ...current, provider: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                                <option value="smtp">SMTP（邮箱账号）</option>
                                <option value="resend">Resend（API）</option>
                              </select>
                            </label>
                            <label className="block text-xs font-semibold text-zinc-500">
                              每日上限
                              <input type="number" min={1} max={1000} value={profileForm.dailySendLimit} onChange={(event) => setProfileForm((current) => ({ ...current, dailySendLimit: Number(event.target.value) }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                            </label>
                          </div>
                          {profileForm.provider === 'smtp' ? (
                            <>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-xs font-semibold text-zinc-500">
                                  SMTP 服务器地址
                                  <input value={profileForm.smtpHost} onChange={(event) => setProfileForm((current) => ({ ...current, smtpHost: event.target.value }))} placeholder="smtp.qq.com" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                                </label>
                                <label className="block text-xs font-semibold text-zinc-500">
                                  端口
                                  <input type="number" min={1} max={65535} value={profileForm.smtpPort} onChange={(event) => setProfileForm((current) => ({ ...current, smtpPort: Number(event.target.value) }))} placeholder="465" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                                </label>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-xs font-semibold text-zinc-500">
                                  SMTP 用户名（邮箱）
                                  <input value={profileForm.smtpUser} onChange={(event) => setProfileForm((current) => ({ ...current, smtpUser: event.target.value }))} placeholder="you@example.com" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                                </label>
                                <label className="block text-xs font-semibold text-zinc-500">
                                  授权码
                                  <input type="password" value={profileForm.smtpPassword} onChange={(event) => setProfileForm((current) => ({ ...current, smtpPassword: event.target.value }))} placeholder="邮箱授权码" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                                </label>
                              </div>
                              <label className="flex items-center gap-2 text-xs text-zinc-600">
                                <input type="checkbox" checked={profileForm.smtpSecure} onChange={(event) => setProfileForm((current) => ({ ...current, smtpSecure: event.target.checked }))} className="h-4 w-4 rounded border-zinc-300" />
                                使用 SSL/TLS 安全连接（推荐开启，端口 465）
                              </label>
                            </>
                          ) : (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                              Resend 需要在服务器环境变量中配置 <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code>。请在 <code>.env.local</code> 中添加。
                            </div>
                          )}
                          <button type="button" onClick={() => setProfileForm((current) => ({ ...current, isEnabled: !current.isEnabled }))} className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${profileForm.isEnabled ? 'bg-emerald-600 text-white' : 'border border-zinc-300 bg-white text-zinc-700'}`}>
                            <Power size={15} />
                            {profileForm.isEnabled ? '启用中' : '已暂停'}
                          </button>
                          <div className="grid grid-cols-3 gap-2">
                            <button type="button" disabled={busy} onClick={saveProfile} className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                              保存
                            </button>
                            <button type="button" disabled={busy || testing || !profileForm.fromEmail} onClick={testProfile} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50">
                              <Send size={13} />
                              {testing ? '测试中...' : '测试发送'}
                            </button>
                            <button type="button" disabled={busy} onClick={() => setExpandedProfileId(null)} className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 disabled:opacity-50">
                              收起
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

                {expandedProfileId === 'new' && (
                  <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Plus size={16} />
                      <span className="text-sm font-semibold">新建邮箱配置</span>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-zinc-500">
                        配置名称
                        <input value={profileForm.label} onChange={(event) => setProfileForm((current) => ({ ...current, label: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                      </label>
                      <label className="block text-xs font-semibold text-zinc-500">
                        发信箱
                        <input value={profileForm.fromEmail} onChange={(event) => setProfileForm((current) => ({ ...current, fromEmail: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                      </label>
                      <label className="block text-xs font-semibold text-zinc-500">
                        回复邮箱
                        <input value={profileForm.replyToEmail} onChange={(event) => setProfileForm((current) => ({ ...current, replyToEmail: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-zinc-500">
                          发件人
                          <input value={profileForm.senderName} onChange={(event) => setProfileForm((current) => ({ ...current, senderName: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-500">
                          品牌
                          <input value={profileForm.brandName} onChange={(event) => setProfileForm((current) => ({ ...current, brandName: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-zinc-500">
                          发信方式
                          <select value={profileForm.provider} onChange={(event) => setProfileForm((current) => ({ ...current, provider: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                            <option value="smtp">SMTP（邮箱账号）</option>
                            <option value="resend">Resend（API）</option>
                          </select>
                        </label>
                        <label className="block text-xs font-semibold text-zinc-500">
                          每日上限
                          <input type="number" min={1} max={1000} value={profileForm.dailySendLimit} onChange={(event) => setProfileForm((current) => ({ ...current, dailySendLimit: Number(event.target.value) }))} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                        </label>
                      </div>
                      {profileForm.provider === 'smtp' ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-500">
                              SMTP 服务器地址
                              <input value={profileForm.smtpHost} onChange={(event) => setProfileForm((current) => ({ ...current, smtpHost: event.target.value }))} placeholder="smtp.qq.com" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-500">
                              端口
                              <input type="number" min={1} max={65535} value={profileForm.smtpPort} onChange={(event) => setProfileForm((current) => ({ ...current, smtpPort: Number(event.target.value) }))} placeholder="465" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-500">
                              SMTP 用户名（邮箱）
                              <input value={profileForm.smtpUser} onChange={(event) => setProfileForm((current) => ({ ...current, smtpUser: event.target.value }))} placeholder="you@example.com" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-500">
                              授权码
                              <input type="password" value={profileForm.smtpPassword} onChange={(event) => setProfileForm((current) => ({ ...current, smtpPassword: event.target.value }))} placeholder="邮箱授权码" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900" />
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-zinc-600">
                            <input type="checkbox" checked={profileForm.smtpSecure} onChange={(event) => setProfileForm((current) => ({ ...current, smtpSecure: event.target.checked }))} className="h-4 w-4 rounded border-zinc-300" />
                            使用 SSL/TLS 安全连接（推荐开启，端口 465）
                          </label>
                        </>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                          Resend 需要在服务器环境变量中配置 <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code>。请在 <code>.env.local</code> 中添加。
                        </div>
                      )}
                      <button type="button" onClick={() => setProfileForm((current) => ({ ...current, isEnabled: !current.isEnabled }))} className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${profileForm.isEnabled ? 'bg-emerald-600 text-white' : 'border border-zinc-300 bg-white text-zinc-700'}`}>
                        <Power size={15} />
                        {profileForm.isEnabled ? '启用中' : '已暂停'}
                      </button>
                      <div className="grid grid-cols-3 gap-2">
                        <button type="button" disabled={busy} onClick={saveProfile} className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                          保存
                        </button>
                        <button type="button" disabled={busy || testing || !profileForm.fromEmail} onClick={testProfile} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50">
                          <Send size={13} />
                          {testing ? '测试中...' : '测试发送'}
                        </button>
                        <button type="button" disabled={busy} onClick={() => setExpandedProfileId(null)} className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 disabled:opacity-50">
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section id="task-settings" className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-200/40">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} />
                <h2 className="text-lg font-semibold">任务设置</h2>
              </div>
              <button
                type="button"
                disabled={busy || data.campaigns.length === 0}
                onClick={() => void clearCompletedTasks()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 disabled:opacity-50"
              >
                <Trash2 size={13} />
                清除任务
              </button>
            </div>
            <div className="divide-y divide-zinc-100">
              <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-500">
                <div className="col-span-1">日期</div>
                <div className="col-span-2">任务名称</div>
                <div className="col-span-1 text-center">发信</div>
                <div className="col-span-1 text-center">已发</div>
                <div className="col-span-1 text-center">待发</div>
                <div className="col-span-2">进度</div>
                <div className="col-span-1 text-center">打开率</div>
                <div className="col-span-3 text-center">操作</div>
              </div>
              {data.campaigns.length === 0 ? (
                <div className="px-5 py-14 text-center text-sm text-zinc-500">还没有发信任务。</div>
              ) : data.campaigns.map((campaign) => (
                <div key={campaign.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
                  <div className="col-span-1 text-xs text-zinc-500">{shortDate(campaign.scheduled_at || campaign.created_at)}</div>
                  <div className="col-span-2 min-w-0">
                    <div className="truncate text-sm font-semibold">{campaign.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{statusLabels[campaign.status] || campaign.status}</div>
                  </div>
                  <div className="col-span-1 text-center font-semibold text-sm">{campaign.total_recipients}</div>
                  <div className="col-span-1 text-center font-semibold text-sm">{campaign.stats.sent}</div>
                  <div className="col-span-1 text-center font-semibold text-sm">{campaign.stats.queued}</div>
                  <div className="col-span-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div className={`h-full rounded-full ${campaign.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-900'}`} style={{ width: `${campaign.stats.progress}%` }} />
                    </div>
                    <div className={`mt-0.5 text-xs ${campaign.status === 'completed' ? 'text-emerald-600 font-semibold' : 'text-zinc-500'}`}>{campaign.stats.progress}%</div>
                  </div>
                  <div className="col-span-1 text-center text-sm font-semibold">{campaign.stats.openRate}%</div>
                  <div className="col-span-3 flex items-center justify-center gap-1.5">
                    {['scheduled', 'sending', 'failed'].includes(campaign.status) ? (
                      <button type="button" title={campaign.status === 'failed' ? '重试发送' : '开始发送'} disabled={busy} onClick={() => void runTask(campaign.id)} className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-white disabled:opacity-50">
                        <Play size={12} />
                      </button>
                    ) : null}
                    {campaign.status === 'paused' ? (
                      <button type="button" title="恢复任务" disabled={busy} onClick={() => void updateTask(campaign.id, 'resume')} className="grid h-7 w-7 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700 disabled:opacity-50">
                        <Send size={12} />
                      </button>
                    ) : null}
                    {['scheduled', 'sending'].includes(campaign.status) ? (
                      <button type="button" title="停止任务" disabled={busy} onClick={() => void updateTask(campaign.id, 'pause')} className="grid h-7 w-7 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700 disabled:opacity-50">
                        <Pause size={12} />
                      </button>
                    ) : null}
                    {!['completed', 'cancelled', 'failed'].includes(campaign.status) ? (
                      <button type="button" title="取消任务" disabled={busy} onClick={() => void updateTask(campaign.id, 'cancel')} className="grid h-7 w-7 place-items-center rounded-md border border-zinc-200 bg-white text-red-600 disabled:opacity-50">
                        <Square size={12} />
                      </button>
                    ) : campaign.status === 'failed' ? (
                      <span className="inline-flex h-7 items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 text-xs font-semibold text-red-700">
                        <CheckCircle2 size={12} />
                        失败
                      </span>
                    ) : (
                      <span className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={12} />
                        已完成
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/40">
            <div className="flex items-center gap-2">
              <Plus size={18} />
              <h2 className="text-lg font-semibold">新增任务</h2>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-zinc-500">
                任务名称
                <input value={taskName} onChange={(event) => setTaskName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm font-normal text-slate-900" />
              </label>
              <div className="block text-xs font-semibold text-zinc-500">
                达人名单
                <div className="mt-1">
                  <select value={listId} onChange={(event) => setListId(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                    <option value="">选择名单</option>
                    {data.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                  </select>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newListName}
                    onChange={(event) => setNewListName(event.target.value)}
                    placeholder="或创建新名单..."
                    className="h-9 flex-1 rounded-lg border border-zinc-200 px-3 text-sm font-normal text-slate-900"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void createList();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!newListName.trim() || creatingList}
                    onClick={() => void createList()}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 disabled:opacity-50"
                  >
                    <FolderPlus size={13} />
                    {creatingList ? '创建中' : '创建'}
                  </button>
                </div>
              </div>
              <label className="block text-xs font-semibold text-zinc-500">
                邮件标题
                <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                  <option value="">选择模板</option>
                  {data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-zinc-500">
                邮件正文
                <textarea readOnly value={data.templates.find((template) => template.id === templateId)?.subject_template || ''} className="mt-1 min-h-20 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-normal text-slate-900" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Link href="/email/templates" className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">插入用户名</Link>
                <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
                  <Download size={13} />
                  下载模板
                </button>
                <Link href="/crm/import" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
                  <Upload size={13} />
                  上传模板
                </Link>
              </div>
              <label className="block text-xs font-semibold text-zinc-500">
                发件配置
                <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                  <option value="">服务器默认</option>
                  {data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                </select>
              </label>
              <button type="button" disabled={busy || !listId || !templateId} onClick={createTask} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                <Mail size={15} />
                创建任务
              </button>
            </div>
          </aside>
        </section>

        
      </div>
    </main>
  );
}
