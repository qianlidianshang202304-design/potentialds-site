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
      : 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';

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
    if (dryRun) {
      console.log('Dry run: would insert', buffer.length, 'rows');
      if (buffer.length > 0) {
        console.log('First row sample:', buffer[0]);
      }
      buffer.length = 0;
      return;
    }
    
    // Try to insert with only known columns
    const knownColumns = ['platform', 'nickname', 'username', 'fans_num', 'view_avg', 'region', 'region_zh', 'tags', 'link'];
    
    const filteredBuffer = buffer.map(item => {
      const filtered: Record<string, unknown> = {};
      for (const key of knownColumns) {
        if (item[key] !== undefined && item[key] !== null) {
          filtered[key] = item[key];
        }
      }
      return filtered;
    });
    
    console.log('Attempting to insert', filteredBuffer.length, 'rows with known columns');
    if (filteredBuffer.length > 0) {
      console.log('First filtered row:', filteredBuffer[0]);
    }
    
    try {
      const { error } = await influencers.insert(filteredBuffer);
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      console.log('Insert successful!');
    } catch (error) {
      console.error('Insert failed:', error);
      throw error;
    }
    
    buffer.length = 0;
  };

  let processed = 0;

  // 读取Excel文件
  process.stdout.write(`Reading Excel file: ${excelPath}\n`);
  
  try {
    // 直接使用XLSX的readFile方法
    console.log('Attempting to read Excel file...');
    const workbook = XLSX.readFile(excelPath);
    
    console.log('Workbook loaded successfully');
    console.log('Number of sheets:', workbook.SheetNames.length);
    console.log('Sheet names:', workbook.SheetNames);
    
    if (workbook.SheetNames.length === 0) {
      throw new Error('No sheets found in Excel file');
    }
    
    // 直接获取第一个工作表（不使用名称）
    const firstSheetName = workbook.SheetNames[0];
    console.log('First sheet name:', firstSheetName);
    
    // 遍历所有工作表对象
    for (const sheetKey in workbook.Sheets) {
      if (workbook.Sheets.hasOwnProperty(sheetKey)) {
        console.log('Found sheet with key:', sheetKey);
        
        try {
          const worksheet = workbook.Sheets[sheetKey];
          if (!worksheet) {
            console.log(`Sheet ${sheetKey} not found, skipping`);
            continue;
          }
          
          // 尝试读取数据
          console.log('Attempting to read data from sheet:', sheetKey);
          
          // 尝试使用不同的选项读取
          const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: true,
            range: undefined
          });
          
          console.log('Rows count:', rows.length);
          
          if (rows.length === 0) {
            console.log('No data found in sheet, skipping');
            continue;
          }
          
          // 处理表头
          const headers = rows[0] as string[];
          console.log('Headers:', headers.slice(0, 10)); // 只显示前10个表头
          
          // 处理数据行
          for (let i = 1; i < rows.length; i++) {
            processed += 1;
            if (limit !== null && processed > limit) {
              break;
            }
            
            const row = rows[i] as string[];
            const item: InfluencerInsert = {
              platform: 'tiktok', // Set platform to TikTok
            };
            
            // 映射字段
            for (let j = 0; j < headers.length; j++) {
              const excelKey = String(headers[j]);
              const value = row[j];
              
              // Skip fields that don't need to be imported
              if (['关联带货视频', '预估视频销量', '预估视频销售额', '达人Tabcut链接', 'youtube title', 'youtube_id', 'instagram', 'twitter_name', 'twitter_id', '补全状态', '30天商品数', '30天卖家数', '30天总销售数', '30天总GMV', '30天视频销售数', '30天视频GMV', '30天视频平均价格', '30天直播商品数', '30天直播销售数', '30天直播GMV', '30天直播平均价格', '12月', '11月', '10月', '9月', '7月', '6月', '5月', '旧邮箱'].includes(excelKey)) {
                continue;
              }
              
              // Special handling for specific fields
              if (excelKey === '达人昵称') {
                item.nickname = typeof value === 'string' ? value.trim() : null;
              } else if (excelKey === '达人 ID') {
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
              }
            }

            // Set region based on region_zh
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

            buffer.push(item);
            if (buffer.length >= batchSize) {
              await flush();
              process.stdout.write(`Processed ${processed} rows...\n`);
            }
          }
          
          // 处理完一个工作表后跳出循环
          break;
        } catch (sheetError) {
          console.error(`Error processing sheet ${sheetKey}:`, sheetError);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }

  await flush();
  process.stdout.write(`Done. processed=${processed}${dryRun ? ' (dry-run)' : ''}\n`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
