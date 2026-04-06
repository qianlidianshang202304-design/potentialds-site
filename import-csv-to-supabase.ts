import fs from 'node:fs';
import path from 'node:path';
import csv from 'csv-parser';
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
  [key: string]: any;
};

function parseFanCount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  
  // Handle Chinese units like "万" (10,000)
  if (s.includes('万')) {
    const normalized = s.replace(/[^\d.]/g, '');
    if (!normalized) return null;
    const n = Number(normalized);
    if (Number.isFinite(n)) {
      return Math.trunc(n * 10000); // Convert 万 to actual number
    }
  }
  
  // Regular number parsing
  const normalized = s.replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.trunc(n) : null;
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

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

  const csvPath = 'D:/达人库/1. TT/【机密】美区全量达人清单 - 0119更新 50w.csv';

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
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
  const fieldMapping: Record<string, string> = {
    // Common field mappings
    'Platform': 'platform',
    'Avatar': 'avatar',
    'Total Star': 'total_star',
    'Nickname': 'nickname',
    'Username': 'username',
    'Link': 'link',
    'Tags': 'tags',
    'Region': 'region',
    'Region (ZH)': 'region_zh',
    'Region Cover': 'region_cover',
    'Fans Num': 'fans_num',
    'View Avg': 'view_avg',
    'Interactive Rate Avg': 'interactive_rate_avg',
    'Like Avg': 'like_avg',
    'Biz Count': 'biz_count',
    // TT-specific fields
    '粉丝数': 'fans_num',
    '播放量': 'view_avg',
    '互动率': 'interactive_rate_avg',
    '点赞数': 'like_avg',
    '昵称': 'nickname',
    '用户名': 'username',
    '链接': 'link',
    '标签': 'tags',
    '地区': 'region_zh',
    'handle': 'username',
    '带货分类': 'tags',
    '国家': 'region_zh',
  };

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

      throw new Error(`Supabase insert failed: ${message}`);
    }
    if (attempts >= 10) {
      throw new Error('Supabase insert failed after 10 retries (schema mismatch)');
    }
    buffer.length = 0;
  };

  let processed = 0;

  console.log('Reading CSV file:', csvPath);
  
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', async (row) => {
        processed += 1;
        
        const item: InfluencerInsert = {
          platform: 'tiktok', // Set platform to TikTok
        };

        // Map fields based on fieldMapping
        for (const [excelKey, value] of Object.entries(row)) {
          const mappedKey = fieldMapping[excelKey] || excelKey.toLowerCase().replace(/\s+/g, '_');
          
          // Skip fields that don't need to be imported
          if (['关联带货视频', '预估视频销量', '预估视频销售额', '达人Tiktok链接', '达人Tabcut链接', 'youtubetitle', 'youtube_id', 'instagram', 'twitter_name', 'twitter_id', '补全状态', '12月', '11月', '10月', '9月', '7月', '6月', '5月', '旧邮箱'].includes(excelKey)) {
            continue;
          }
          
          // Handle different data types
          if (mappedKey === 'fans_num') {
            item[mappedKey] = parseFanCount(value);
          } else if (['view_avg', 'like_avg', 'biz_count'].includes(mappedKey)) {
            item[mappedKey] = toInteger(value);
          } else if (['total_star', 'interactive_rate_avg'].includes(mappedKey)) {
            item[mappedKey] = toNumber(value);
          } else if (typeof value === 'string') {
            item[mappedKey] = value.trim();
          } else {
            item[mappedKey] = value;
          }
        }

        // Ensure region is set to 'us' for US data
        if (!item.region) {
          item.region = 'us';
        }
        if (!item.region_zh) {
          item.region_zh = '美国';
        }

        buffer.push(item);
        if (buffer.length >= batchSize) {
          await flush();
          process.stdout.write(`Processed ${processed} rows...\n`);
        }
      })
      .on('end', async () => {
        await flush();
        process.stdout.write(`Done. processed=${processed}\n`);
        resolve(undefined);
      })
      .on('error', (error) => {
        process.stderr.write(`Error reading CSV: ${error.message}\n`);
        reject(error);
      });
  });
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
