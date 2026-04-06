import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';

type InfluencerUpdate = {
  platform?: string | null;
  nickname?: string | null;
  username?: string | null;
  link?: string | null;
  tags?: string | null;
  region?: string | null;
  region_zh?: string | null;
  fans_num?: number | null;
  view_avg?: number | null;
  email?: string | null;
  uid?: string | null;
  products_30d?: number | null;
  sellers_30d?: number | null;
  sales_30d?: number | null;
  gmv_30d?: number | null;
  video_sales_30d?: number | null;
  video_gmv_30d?: number | null;
  video_avg_price_30d?: number | null;
  live_products_30d?: number | null;
  live_sales_30d?: number | null;
  live_gmv_30d?: number | null;
  live_avg_price_30d?: number | null;
  male_ratio?: number | null;
  female_ratio?: number | null;
  age_18_24?: number | null;
  age_25_34?: number | null;
  age_35_44?: number | null;
  age_45_54?: number | null;
  age_55_plus?: number | null;
  main_age_group?: string | null;
  main_age_ratio?: number | null;
  [key: string]: any;
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

function parseFanCount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  
  if (s.includes('万')) {
    const normalized = s.replace(/[^\d.]/g, '');
    if (!normalized) return null;
    const n = Number(normalized);
    if (Number.isFinite(n)) {
      return Math.trunc(n * 10000);
    }
  }
  
  const normalized = s.replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

  const args = parseArgs(process.argv);
  const fileArg = args.file;
  const csvPath =
    typeof fileArg === 'string'
      ? fileArg
      : 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.csv';

  const limitArg = args.limit;
  const limit = typeof limitArg === 'string' ? Number(limitArg) : null;
  const dryRun = args['dry-run'] === true;

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

  const batchSize = 100;
  let processed = 0;
  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  let headers: string[] = [];
  let isFirstRow = true;

  const stream = fs.createReadStream(csvPath, { encoding: 'utf8' });
  const parser = parse({
    delimiter: ',',
    quote: '"',
    escape: '"',
    skip_empty_lines: true,
    from_line: 1,
    relax_quotes: true,
    relax_column_count: true
  });

  stream.pipe(parser);

  console.log(`Reading CSV file: ${csvPath}`);

  for await (const record of parser) {
    if (isFirstRow) {
      headers = record.map((h: any) => String(h).trim());
      console.log('CSV headers:', headers.slice(0, 10));
      isFirstRow = false;
      continue;
    }

    processed += 1;
    if (limit !== null && processed > limit) {
      break;
    }

    const item: InfluencerUpdate = {
      platform: 'tiktok',
    };

    for (let i = 0; i < headers.length; i++) {
      const excelKey = headers[i];
      const value = record[i];
      
      if (['关联带货视频', '预估视频销量', '预估视频销售额', '达人Tabcut链接', 'youtube title', 'youtube_id', 'instagram', 'twitter_name', 'twitter_id', '补全状态', '12月', '11月', '10月', '9月', '7月', '6月', '5月'].includes(excelKey)) {
        continue;
      }
      
      if (excelKey === '达人昵称') {
        item.nickname = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === '达人 ID' || excelKey === 'handle') {
        item.username = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === '区域') {
        item.region_zh = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === '带货分类') {
        item.tags = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === '粉丝数') {
        item.fans_num = parseFanCount(value);
      } else if (excelKey === '平均播放量') {
        item.view_avg = parseFanCount(value);
      } else if (excelKey === '达人Tiktok链接') {
        item.link = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === '旧邮箱' || excelKey === 'email') {
        item.email = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === 'uid') {
        item.uid = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === '30天商品数') {
        item.products_30d = toNumber(value);
      } else if (excelKey === '30天卖家数') {
        item.sellers_30d = toNumber(value);
      } else if (excelKey === '30天总销售数') {
        item.sales_30d = toNumber(value);
      } else if (excelKey === '30天总GMV') {
        item.gmv_30d = toNumber(value);
      } else if (excelKey === '30天视频销售数') {
        item.video_sales_30d = toNumber(value);
      } else if (excelKey === '30天视频GMV') {
        item.video_gmv_30d = toNumber(value);
      } else if (excelKey === '30天视频平均价格') {
        item.video_avg_price_30d = toNumber(value);
      } else if (excelKey === '30天直播商品数') {
        item.live_products_30d = toNumber(value);
      } else if (excelKey === '30天直播销售数') {
        item.live_sales_30d = toNumber(value);
      } else if (excelKey === '30天直播GMV') {
        item.live_gmv_30d = toNumber(value);
      } else if (excelKey === '30天直播平均价格') {
        item.live_avg_price_30d = toNumber(value);
      } else if (excelKey === '男性占比') {
        item.male_ratio = toNumber(value);
      } else if (excelKey === '女性占比') {
        item.female_ratio = toNumber(value);
      } else if (excelKey === '18-24') {
        item.age_18_24 = toNumber(value);
      } else if (excelKey === '25-34') {
        item.age_25_34 = toNumber(value);
      } else if (excelKey === '35-44') {
        item.age_35_44 = toNumber(value);
      } else if (excelKey === '45-54') {
        item.age_45_54 = toNumber(value);
      } else if (excelKey === '55+') {
        item.age_55_plus = toNumber(value);
      } else if (excelKey === '主要年龄层') {
        item.main_age_group = typeof value === 'string' ? value.trim() : null;
      } else if (excelKey === '主要占比') {
        item.main_age_ratio = toNumber(value);
      }
    }

    if (item.region_zh) {
      if (item.region_zh.includes('美国') || item.region_zh.includes('美')) {
        item.region = 'us';
      } else if (item.region_zh.includes('英国') || item.region_zh.includes('英')) {
        item.region = 'uk';
      } else if (item.region_zh.includes('加拿大') || item.region_zh.includes('加')) {
        item.region = 'ca';
      } else if (item.region_zh.includes('澳大利亚') || item.region_zh.includes('澳')) {
        item.region = 'au';
      } else if (item.region_zh.includes('新西兰') || item.region_zh.includes('新')) {
        item.region = 'nz';
      } else if (item.region_zh.includes('新加坡') || item.region_zh.includes('新')) {
        item.region = 'sg';
      } else if (item.region_zh.includes('日本') || item.region_zh.includes('日')) {
        item.region = 'jp';
      } else if (item.region_zh.includes('韩国') || item.region_zh.includes('韩')) {
        item.region = 'kr';
      } else if (item.region_zh.includes('德国') || item.region_zh.includes('德')) {
        item.region = 'de';
      } else if (item.region_zh.includes('法国') || item.region_zh.includes('法')) {
        item.region = 'fr';
      } else if (item.region_zh.includes('意大利') || item.region_zh.includes('意')) {
        item.region = 'it';
      } else if (item.region_zh.includes('西班牙') || item.region_zh.includes('西')) {
        item.region = 'es';
      } else if (item.region_zh.includes('俄罗斯') || item.region_zh.includes('俄')) {
        item.region = 'ru';
      } else if (item.region_zh.includes('印度') || item.region_zh.includes('印')) {
        item.region = 'in';
      } else if (item.region_zh.includes('巴西') || item.region_zh.includes('巴')) {
        item.region = 'br';
      } else if (item.region_zh.includes('墨西哥') || item.region_zh.includes('墨')) {
        item.region = 'mx';
      } else if (item.region_zh.includes('加拿大') || item.region_zh.includes('加')) {
        item.region = 'ca';
      } else {
        item.region = 'other';
      }
    } else {
      item.region = 'us';
      item.region_zh = '美国';
    }
    
    if (item.username && !item.link) {
      item.link = `https://www.tiktok.com/@${item.username}`;
    }
    
    if (!item.nickname && item.username) {
      item.nickname = item.username;
    }

    if (!item.username || item.username.trim() === '') {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log('Dry run: would process', item.username);
      continue;
    }

    try {
      const { data: existingRecord, error: selectError } = await supabase
        .from('influencers')
        .select('id')
        .eq('platform', 'tiktok')
        .eq('username', item.username)
        .limit(1);

      if (selectError) {
        console.error('Error checking existing record:', selectError);
        continue;
      }

      const updateFields = [
        'nickname', 'fans_num', 'view_avg', 'region', 'region_zh', 'tags', 'link',
        'email', 'uid', 'products_30d', 'sellers_30d', 'sales_30d', 'gmv_30d',
        'video_sales_30d', 'video_gmv_30d', 'video_avg_price_30d',
        'live_products_30d', 'live_sales_30d', 'live_gmv_30d', 'live_avg_price_30d',
        'male_ratio', 'female_ratio', 'age_18_24', 'age_25_34', 'age_35_44',
        'age_45_54', 'age_55_plus', 'main_age_group', 'main_age_ratio'
      ];

      const updateData: Record<string, unknown> = {};
      for (const key of updateFields) {
        if (item[key] !== undefined && item[key] !== null) {
          updateData[key] = item[key];
        }
      }

      if (existingRecord && existingRecord.length > 0) {
        const { error: updateError } = await supabase
          .from('influencers')
          .update(updateData)
          .eq('id', existingRecord[0].id);

        if (updateError) {
          console.error('Error updating record:', updateError);
        } else {
          updated += 1;
        }
      } else {
        const { error: insertError } = await supabase
          .from('influencers')
          .insert({
            platform: 'tiktok',
            ...updateData
          });

        if (insertError) {
          console.error('Error inserting record:', insertError);
        } else {
          inserted += 1;
        }
      }
    } catch (error) {
      console.error('Error processing record:', error);
    }

    if (processed % 1000 === 0) {
      console.log(`Processed: ${processed}, Updated: ${updated}, Inserted: ${inserted}, Skipped: ${skipped}`);
    }
  }

  console.log('\n=== Final Summary ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (no username): ${skipped}`);
  console.log(`${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});