'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Plus, Send, Trash2 } from 'lucide-react';
import DatabaseSetupNotice from '../../../components/DatabaseSetupNotice';
import { Creator, CreatorRelationship } from '../../../lib/crm-types';
import { getSupabaseSafe } from '../../../lib/supabase';
import { useSupabaseUser } from '../../../hooks/useSupabaseUser';
import { trackProductEvent } from '../../../lib/analytics-client';

type EmailTemplate = {
  id: string;
  name: string;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  updated_at: string;
};

type MessageStats = {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
};

type RecentMessage = {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  open_count: number;
  click_count: number;
  sent_at: string | null;
  created_at: string;
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

export default function EmailTemplatesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen px-6 py-20 text-center text-sm text-zinc-500">正在加载邮件中心...</main>}>
      <EmailTemplatesInner />
    </Suspense>
  );
}

function EmailTemplatesInner() {
  const searchParams = useSearchParams();
  const creatorId = searchParams.get('creator') || '';
  const { user, loading: userLoading } = useSupabaseUser();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('首次达人合作邀请');
  const [subject, setSubject] = useState('{{creator_name}}，想和你聊聊合作');
  const [html, setHtml] = useState('<p>Hi {{creator_name}},</p><p>我是 {{brand_name}} 的 {{sender_name}}，我们很喜欢你的内容，希望了解一次合作机会。</p><p>期待你的回复！</p>');
  const [creator, setCreator] = useState<Creator | null>(null);
  const [relationship, setRelationship] = useState<CreatorRelationship | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [stats, setStats] = useState<MessageStats>({ sent: 0, opened: 0, clicked: 0, replied: 0 });
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const [templateResult, messageResult, eventResult] = await Promise.all([
      supabase.from('email_templates').select('*').eq('is_archived', false).order('updated_at', { ascending: false }),
      supabase
        .from('email_messages')
        .select('id,recipient_email,recipient_name,subject,status,open_count,click_count,sent_at,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('email_events')
        .select('message_id,event_type,is_machine_generated')
        .eq('user_id', user.id),
    ]);
    if (templateResult.error && /does not exist|schema cache/i.test(templateResult.error.message)) {
      setSchemaMissing(true);
      return;
    }
    const nextTemplates = (templateResult.data as EmailTemplate[] | null) ?? [];
    setTemplates(nextTemplates);
    if (nextTemplates[0] && !selectedId) {
      setSelectedId(nextTemplates[0].id);
      setName(nextTemplates[0].name);
      setSubject(nextTemplates[0].subject_template);
      setHtml(nextTemplates[0].html_template);
    }

    const messages = (messageResult.data as RecentMessage[] | null) ?? [];
    setRecentMessages(messages);
    const events = (eventResult.data as Array<{
      message_id: string;
      event_type: string;
      is_machine_generated: boolean | null;
    }> | null) ?? [];
    const humanEvents = events.filter((event) => event.is_machine_generated !== true);
    const distinctMessages = (eventTypes: string[]) =>
      new Set(
        humanEvents
          .filter((event) => eventTypes.includes(event.event_type))
          .map((event) => event.message_id),
      ).size;
    setStats({
      sent: messages.filter((row) => !['queued', 'failed', 'cancelled'].includes(row.status)).length,
      opened: distinctMessages(['opened', 'clicked', 'replied']),
      clicked: distinctMessages(['clicked', 'replied']),
      replied: distinctMessages(['replied']),
    });

    if (creatorId) {
      const [creatorResult, relationshipResult] = await Promise.all([
        supabase.from('influencers').select('*').eq('id', creatorId).maybeSingle(),
        supabase.from('creator_relationships').select('*').eq('user_id', user.id).eq('influencer_id', creatorId).maybeSingle(),
      ]);
      setCreator((creatorResult.data as Creator | null) ?? null);
      const nextRelationship = relationshipResult.data as CreatorRelationship | null;
      setRelationship(nextRelationship);
      setRecipientEmail(nextRelationship?.contact_email ?? '');
    }
  }, [creatorId, selectedId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userLoading) void loadData();
  }, [loadData, userLoading]);

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedId(template.id);
    setName(template.name);
    setSubject(template.subject_template);
    setHtml(template.html_template);
  };

  const resetTemplate = () => {
    setSelectedId('');
    setName('首次达人合作邀请');
    setSubject('{{creator_name}}，想和你聊聊合作');
    setHtml('<p>Hi {{creator_name}},</p><p>我是 {{brand_name}} 的 {{sender_name}}，我们很喜欢你的内容，希望了解一次合作机会。</p><p>期待你的回复！</p>');
  };

  const saveTemplate = async () => {
    if (!user?.id || !name.trim() || !subject.trim() || !html.trim()) return;
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: name.trim(),
      subject_template: subject,
      html_template: html,
      text_template: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      variables: ['creator_name', 'username', 'platform', 'sender_name', 'brand_name'],
    };
    const result = selectedId
      ? await supabase.from('email_templates').update(payload).eq('id', selectedId).select('*').single()
      : await supabase.from('email_templates').insert(payload).select('*').single();
    setSaving(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    const template = result.data as EmailTemplate;
    setSelectedId(template.id);
    setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
    setMessage('模板已保存');
  };

  const archiveTemplate = async (id: string) => {
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    await supabase.from('email_templates').update({ is_archived: true }).eq('id', id);
    setTemplates((current) => current.filter((item) => item.id !== id));
    if (selectedId === id) resetTemplate();
  };

  const sendEmail = async () => {
    if (!selectedId || !recipientEmail.trim()) {
      setMessage('请先保存模板并填写收件邮箱');
      return;
    }
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage('登录状态已失效');
      return;
    }
    setSending(true);
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        templateId: selectedId,
        influencerId: creator?.id,
        relationshipId: relationship?.id,
        recipientEmail: recipientEmail.trim(),
        recipientName: creator?.nickname || creator?.username || '',
        senderName,
        brandName,
      }),
    });
    const json = await response.json();
    setSending(false);
    setMessage(response.ok ? '邮件已发送并启用打开/点击追踪' : json.error || '发送失败');
    if (response.ok) {
      setStats((current) => ({ ...current, sent: current.sent + 1 }));
      trackProductEvent('email_sent', { influencer_id: creator?.id || null });
      await loadData();
    }
  };

  const renderedSubject = subject
    .replaceAll('{{creator_name}}', creator?.nickname || creator?.username || '达人名称')
    .replaceAll('{{sender_name}}', senderName || '你的名字')
    .replaceAll('{{brand_name}}', brandName || '品牌名称');
  const renderedHtml = html
    .replaceAll('{{creator_name}}', creator?.nickname || creator?.username || '达人名称')
    .replaceAll('{{sender_name}}', senderName || '你的名字')
    .replaceAll('{{brand_name}}', brandName || '品牌名称');
  const estimatedOpenRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6">
        <Link href="/crm" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700"><ArrowLeft size={15} />返回 CRM</Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Outreach</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">邮件模板与追踪</h1>
            <p className="mt-2 text-sm text-zinc-600">创建建联模板，发送后查看估算打开率、点击和回复。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/email/tasks" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Mail size={15} />发信任务</Link>
            <button type="button" onClick={resetTemplate} className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"><Plus size={15} />新模板</button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['已发送', stats.sent],
            ['估算打开', stats.opened],
            ['估算打开率', `${estimatedOpenRate}%`],
            ['已点击', stats.clicked],
            ['已回复', stats.replied],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-200 bg-white/90 px-4 py-3">
              <div className="text-xs text-zinc-500">{label}</div>
              <div className="mt-1 text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {schemaMissing ? <div className="mt-5"><DatabaseSetupNotice /></div> : null}
        {message ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div> : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr_0.9fr]">
          <aside className="rounded-2xl border border-zinc-200 bg-white/90 p-3">
            <h2 className="px-2 py-2 text-sm font-semibold">模板</h2>
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.id} className={`rounded-xl border p-3 ${selectedId === template.id ? 'border-slate-900 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
                  <button type="button" onClick={() => selectTemplate(template)} className="w-full text-left">
                    <div className="truncate text-sm font-semibold">{template.name}</div>
                    <div className="mt-1 truncate text-xs text-zinc-500">{template.subject_template}</div>
                  </button>
                  <button type="button" onClick={() => archiveTemplate(template.id)} title="归档模板" className="mt-2 text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              {templates.length === 0 ? <div className="px-2 py-8 text-center text-xs text-zinc-400">还没有模板</div> : null}
            </div>
          </aside>

          <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5">
            <h2 className="text-lg font-semibold">编辑模板</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-zinc-500">模板名称<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" /></label>
              <label className="block text-xs font-semibold text-zinc-500">邮件主题<input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal text-slate-900" /></label>
              <label className="block text-xs font-semibold text-zinc-500">HTML 正文<textarea value={html} onChange={(event) => setHtml(event.target.value)} className="mt-1 min-h-60 w-full rounded-xl border border-zinc-200 p-3 font-mono text-xs font-normal text-slate-900" /></label>
              <p className="text-xs leading-5 text-zinc-500">变量：{'{{creator_name}}'}、{'{{sender_name}}'}、{'{{brand_name}}'}。链接会自动启用点击追踪。</p>
              <button type="button" disabled={saving} onClick={saveTemplate} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? '保存中...' : '保存模板'}</button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5">
            <div className="flex items-center gap-2"><Mail size={18} /><h2 className="text-lg font-semibold">预览与发送</h2></div>
            {creator ? <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-900">当前达人：{creator.nickname || creator.username}</div> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="发件人姓名" className="h-10 rounded-xl border border-zinc-200 px-3 text-sm" />
              <input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="品牌名称" className="h-10 rounded-xl border border-zinc-200 px-3 text-sm" />
            </div>
            <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="达人联系邮箱" className="mt-3 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm" />
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
              <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-semibold">{renderedSubject}</div>
              <iframe
                title="邮件正文预览"
                sandbox=""
                srcDoc={`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;padding:16px;font:14px/1.75 system-ui,sans-serif;color:#27272a;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#2563eb}</style><body>${renderedHtml}</body></html>`}
                className="h-60 w-full border-0 bg-white"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">打开率为估算值。Apple Mail、图片代理和安全扫描可能造成误差，点击与回复更可靠。</p>
            <button type="button" disabled={sending || !selectedId} onClick={sendEmail} className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} />{sending ? '发送中...' : '发送并追踪'}</button>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white/90">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-lg font-semibold">最近发送记录</h2>
            <p className="mt-1 text-xs text-zinc-500">展示最近 50 封邮件。打开次数包含图片代理请求，判断意向时请优先参考点击和回复。</p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-12 gap-3 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-500">
                <div className="col-span-3">收件人</div>
                <div className="col-span-4">主题</div>
                <div className="col-span-2">状态</div>
                <div className="col-span-1 text-center">打开</div>
                <div className="col-span-1 text-center">点击</div>
                <div className="col-span-1 text-right">时间</div>
              </div>
              {recentMessages.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-500">还没有发送记录。</div>
              ) : recentMessages.map((item) => (
                <div key={item.id} className="grid grid-cols-12 items-center gap-3 border-b border-zinc-100 px-5 py-4 text-sm last:border-b-0">
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
