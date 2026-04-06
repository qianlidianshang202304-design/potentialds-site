import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

type InfluencerInsert = {
  platform?: string | null;
  avatar?: string | null;
  total_star?: number | null;
  nickname?: string | null;
  username?: string | null;
  link?: string | null;
  tags?: string | null;
  region?: string | null;
  region_zh?: string | null;
  region_cover?: string | null;
  fans_num?: number | null;
  view_avg?: number | null;
  interactive_rate_avg?: number | null;
  like_avg?: number | null;
  biz_count?: number | null;
};

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [key, value] = token.slice(2).split('=');
    if (value === undefined) {
      args[key] = true;
    } else {
      args[key] = value;
    }
  }
  return args;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toInteger(value: unknown) {
  const n = toNumber(value);
  if (n === null) return null;
  return Math.trunc(n);
}

function isNonIntegerNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value);
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

  const args = parseArgs(process.argv);
  const fileArg = args.file;
  const excelPath =
    typeof fileArg === 'string'
      ? fileArg
      : 'D:\\达人库\\3. YTB\\WOTO达人api 5w+ (23W)-整理.xlsx';

  const limitArg = args.limit;
  const limit = typeof limitArg === 'string' ? Number(limitArg) : null;
  const dryRun = args['dry-run'] === true;

  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');

  console.log('Connecting to Supabase...');
  console.log('URL:', supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const influencers = supabase.from('influencers') as unknown as {
    insert: (values: Record<string, unknown>[]) => Promise<{ error: unknown }>;
  };

  const batchSize = 500;
  const buffer: InfluencerInsert[] = [];
  const blockedColumns = new Set<string>();

  const buildInsertPayload = () =>
    buffer.map((item) => {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item)) {
        if (value === undefined) continue;
        if (blockedColumns.has(key)) continue;
        payload[key] = value;
      }
      return payload;
    });

  const flush = async () => {
    if (buffer.length === 0) return;
    if (dryRun) {
      buffer.length = 0;
      return;
    }
    let attempts = 0;
    while (attempts < 10) {
      attempts += 1;
      const payload = buildInsertPayload();
      const { error } = await influencers.insert(payload);
      if (!error) break;

      const message = (error as { message?: string }).message ?? JSON.stringify(error);
      const match = message.match(/Could not find the '([^']+)' column/);
      if (match) {
        const missingColumn = match[1];
        if (!blockedColumns.has(missingColumn)) {
          blockedColumns.add(missingColumn);
          process.stdout.write(`Skip unknown column: ${missingColumn}\n`);
        } else {
          throw new Error(`Supabase insert failed: ${message}`);
        }
        continue;
      }

      const typeMatch = message.match(/invalid input syntax for type (?:bigint|integer): "([^"]+)"/i);
      if (typeMatch) {
        const badValue = typeMatch[1];
        if (badValue.includes('.')) {
          const numericKeys: (keyof InfluencerInsert)[] = [
            'total_star',
            'fans_num',
            'view_avg',
            'interactive_rate_avg',
            'like_avg',
            'biz_count',
          ];
          const newlyBlocked: string[] = [];
          for (const key of numericKeys) {
            if (blockedColumns.has(String(key))) continue;
            if (buffer.some((row) => isNonIntegerNumber(row[key]))) {
              blockedColumns.add(String(key));
              newlyBlocked.push(String(key));
            }
          }
          if (newlyBlocked.length > 0) {
            process.stdout.write(`Skip non-integer numeric columns due to bigint/integer mismatch: ${newlyBlocked.join(', ')}\n`);
            continue;
          }
        }
      }

      throw new Error(`Supabase insert failed: ${message}`);
    }
    if (attempts >= 10) {
      throw new Error('Supabase insert failed after 10 retries (schema mismatch)');
    }
    buffer.length = 0;
  };

  let processed = 0;

  // 读取Excel文件
  process.stdout.write(`Reading Excel file: ${excelPath}\n`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

  process.stdout.write(`Total rows in Excel: ${rows.length}\n`);

  for (const row of rows) {
    processed += 1;
    if (limit !== null && processed > limit) {
      break;
    }

    const item: InfluencerInsert = {
      platform: (row['Platform'] as string) ?? null,
      avatar: (row['Avatar'] as string) ?? null,
      total_star: toNumber(row['Total Star']),
      nickname: (row['Nickname'] as string) ?? null,
      username: (row['Username'] as string) ?? null,
      link: (row['Link'] as string) ?? null,
      tags: (row['Tags'] as string) ?? null,
      region: (row['Region'] as string) ?? null,
      region_zh: (row['Region (ZH)'] as string) ?? null,
      region_cover: (row['Region Cover'] as string) ?? null,
      fans_num: toInteger(row['Fans Num']),
      view_avg: toInteger(row['View Avg']),
      interactive_rate_avg: toNumber(row['Interactive Rate Avg']),
      like_avg: toInteger(row['Like Avg']),
      biz_count: toInteger(row['Biz Count']),
    };

    buffer.push(item);
    if (buffer.length >= batchSize) {
      await flush();
      process.stdout.write(`Processed ${processed} rows...\n`);
    }
  }

  await flush();
  process.stdout.write(`Done. processed=${processed}${dryRun ? ' (dry-run)' : ''}\n`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
