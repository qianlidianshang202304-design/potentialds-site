'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react';
import DatabaseSetupNotice from '../../../components/DatabaseSetupNotice';
import { CreatorList } from '../../../lib/crm-types';
import { getSupabaseSafe } from '../../../lib/supabase';
import { useSupabaseUser } from '../../../hooks/useSupabaseUser';
import { trackProductEvent } from '../../../lib/analytics-client';

type RawRow = Record<string, unknown>;

const fieldAliases: Record<string, string[]> = {
  platform: ['platform', '平台'],
  username: ['username', '账号', '用户名', 'handle'],
  nickname: ['nickname', '昵称'],
  link: ['link', 'url', '主页链接', '链接'],
  fans_num: ['fans_num', 'followers', '粉丝数', '粉丝量'],
  view_avg: ['view_avg', 'average_views', '平均播放', '均播'],
  region: ['region', '国家代码'],
  region_zh: ['region_zh', '地区', '国家'],
  tags: ['tags', '标签', '赛道'],
  email: ['email', '邮箱', '联系邮箱'],
  note: ['note', '备注'],
  status: ['status', '联系状态'],
};

function normalizedRow(row: RawRow) {
  const result: Record<string, unknown> = {};
  const entries = Object.entries(row);
  for (const [target, aliases] of Object.entries(fieldAliases)) {
    const match = entries.find(([key]) => aliases.some((alias) => alias.toLowerCase() === key.trim().toLowerCase()));
    if (match) result[target] = match[1];
  }
  return result;
}

export default function CrmImportPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const [lists, setLists] = useState<CreatorList[]>([]);
  const [listId, setListId] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    void supabase.from('creator_lists').select('*').order('updated_at', { ascending: false }).then((result: {
      data: unknown;
      error: { message: string } | null;
    }) => {
      const { data, error } = result;
      if (error && /does not exist|schema cache/i.test(error.message)) setSchemaMissing(true);
      const nextLists = (data as CreatorList[] | null) ?? [];
      setLists(nextLists);
      setListId(nextLists[0]?.id || '');
    });
  }, [user?.id]);

  const previewColumns = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);

  const readFile = async (file: File) => {
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
    setRows(parsed.slice(0, 1000).map(normalizedRow));
    setResult(null);
  };

  const runImport = async () => {
    if (!listId || rows.length === 0) return;
    const supabase = getSupabaseSafe();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setResult('登录状态已失效，请重新登录。');
      return;
    }
    setImporting(true);
    const response = await fetch('/api/crm/import', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ listId, fileName, rows }),
    });
    const json = await response.json();
    setImporting(false);
    if (!response.ok) {
      setResult(json.error || '导入失败');
      return;
    }
    setResult(`导入完成：成功 ${json.imported} 条，跳过 ${json.skipped} 条，失败 ${json.failed} 条。`);
    trackProductEvent('import_completed', { imported: json.imported, skipped: json.skipped, failed: json.failed });
  };

  if (userLoading) {
    return <main className="min-h-screen px-6 py-20 text-center text-sm text-zinc-500">正在加载...</main>;
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6">
        <Link href="/my-creators" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700"><ArrowLeft size={15} />返回达人名单</Link>
        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white/90 p-6">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-emerald-600" size={26} />
            <div>
              <h1 className="text-2xl font-semibold">批量导入达人</h1>
              <p className="mt-1 text-sm text-zinc-600">支持 CSV 和 XLSX，最多每次导入 1,000 条。</p>
            </div>
          </div>

          {schemaMissing ? <div className="mt-5"><DatabaseSetupNotice /></div> : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-zinc-500">
              导入到名单
              <select value={listId} onChange={(event) => setListId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-normal text-slate-900">
                <option value="">选择名单</option>
                {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-zinc-500">
              文件
              <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-slate-900" />
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-6 text-zinc-600">
            自动识别字段：平台、用户名、昵称、链接、粉丝量、平均播放、地区、标签、邮箱、备注、联系状态。平台和用户名为必填。
          </div>

          {rows.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>{previewColumns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">{column}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t border-zinc-100">
                      {previewColumns.map((column) => <td key={column} className="max-w-48 truncate px-3 py-2">{String(row[column] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {result ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{result}</div> : null}

          <button type="button" disabled={!listId || rows.length === 0 || importing} onClick={runImport} className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Upload size={16} />
            {importing ? '正在导入...' : `确认导入 ${rows.length} 条`}
          </button>
        </section>
      </div>
    </main>
  );
}
