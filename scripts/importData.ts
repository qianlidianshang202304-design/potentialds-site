import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { TextDecoder } from 'node:util';

import csv from 'csv-parser';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';
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

function stripBom() {
  let handled = false;
  return new Transform({
    transform(chunk, _encoding, callback) {
      if (!handled) {
        handled = true;
        const s = (typeof chunk === 'string' ? chunk : chunk.toString('utf8')).replace(/^\uFEFF/, '');
        callback(null, s);
        return;
      }
      callback(null, chunk);
    },
  });
}

function isValidUtf8(buffer: Buffer) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function detectEncoding(filePath: string) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(64 * 1024);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const sample = buffer.subarray(0, bytesRead);
    if (sample.length >= 3 && sample[0] === 0xef && sample[1] === 0xbb && sample[2] === 0xbf) return 'utf8';
    return isValidUtf8(sample) ? 'utf8' : 'gbk';
  } finally {
    fs.closeSync(fd);
  }
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

  const args = parseArgs(process.argv);
  const fileArg = args.file;
  const csvPath =
    typeof fileArg === 'string'
      ? fileArg
      : 'D:\\达人库\\2. IG\\20260319 美国4.6w+ 22w\\WOTO达人美国IGapi - 副本.csv';

  const encodingArg = args.encoding;
  const encoding = typeof encodingArg === 'string' ? encodingArg : 'utf8';

  const limitArg = args.limit;
  const limit = typeof limitArg === 'string' ? Number(limitArg) : null;
  const dryRun = args['dry-run'] === true;
  const reset = args.reset === true;

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const influencers = supabase.from('influencers') as unknown as {
    insert: (values: Record<string, unknown>[]) => Promise<{ error: unknown }>;
    delete: () => {
      not: (column: string, operator: string, value: null) => Promise<{ error: unknown }>;
    };
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

  if (reset) {
    const candidates = ['id', 'nickname', 'username', 'link', 'platform'];
    let cleared = false;
    for (const column of candidates) {
      const attempt = await influencers.delete().not(column, 'is', null);
      if (!attempt.error) {
        cleared = true;
        process.stdout.write('Cleared influencers table\n');
        break;
      }
      const message = (attempt.error as { message?: string }).message ?? JSON.stringify(attempt.error);
      const match = message.match(/Could not find the '([^']+)' column/);
      if (match && match[1] === column) {
        continue;
      }
      throw new Error(`Supabase clear failed: ${message}`);
    }
    if (!cleared) {
      throw new Error('Supabase clear failed: could not find a usable column to delete by. Please TRUNCATE influencers in Supabase SQL editor.');
    }
  }

  const input = fs.createReadStream(csvPath);
  const effectiveEncoding = encoding === 'auto' ? detectEncoding(csvPath) : encoding;
  process.stdout.write(`Using encoding: ${effectiveEncoding}\n`);
  const decoded = input.pipe(iconv.decodeStream(effectiveEncoding)) as unknown as NodeJS.ReadWriteStream;
  const parser = csv({
    mapHeaders: ({ header }) => header?.trim(),
  });
  const stream = decoded.pipe(stripBom()).pipe(parser);

  try {
    for await (const row of stream as AsyncIterable<Record<string, string>>) {
      processed += 1;
      if (limit !== null && processed > limit) {
        stream.destroy();
        break;
      }

      const item: InfluencerInsert = {
        platform: row.Platform ?? null,
        avatar: row.Avatar ?? null,
        total_star: toNumber(row['Total Star']),
        nickname: row.Nickname ?? null,
        username: row.Username ?? null,
        link: row.Link ?? null,
        tags: row.Tags ?? null,
        region: row.Region ?? null,
        region_zh: row['Region (ZH)'] ?? null,
        region_cover: row['Region Cover'] ?? null,
        fans_num: toInteger(row['Fans Num']),
        view_avg: toInteger(row['View Avg']),
        interactive_rate_avg: toNumber(row['Interactive Rate Avg']),
        like_avg: toInteger(row['Like Avg']),
        biz_count: toInteger(row['Biz Count']),
      };

      buffer.push(item);
      if (buffer.length >= batchSize) {
        await flush();
      }
    }
  } finally {
    stream.destroy();
    (decoded as unknown as { destroy?: () => void })?.destroy?.();
    input.destroy();
  }

  await flush();
  process.stdout.write(`Done. processed=${processed}${dryRun ? ' (dry-run)' : ''}\n`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
