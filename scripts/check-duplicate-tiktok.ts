import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');

  console.log('Connecting to Supabase...');
  console.log('URL:', supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  console.log('Checking for duplicate usernames...');
  
  // Get all TikTok records in very small batches with delay
  const allRecords: Array<{ id: string; username: string }> = [];
  let offset = 0;
  const batchSize = 500;
  let hasMore = true;
  let retryCount = 0;

  while (hasMore && retryCount < 3) {
    console.log(`Fetching records ${offset} to ${offset + batchSize}...`);
    
    try {
      const { data, error } = await supabase
        .from('influencers')
        .select('id, username')
        .eq('platform', 'tiktok')
        .order('id', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching batch:', error);
        retryCount++;
        await sleep(2000);
        continue;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRecords.push(...data);
        offset += batchSize;
        retryCount = 0;
        
        if (data.length < batchSize) {
          hasMore = false;
        }
        
        // Add small delay between batches
        await sleep(500);
      }
    } catch (err) {
      console.error('Exception fetching batch:', err);
      retryCount++;
      await sleep(2000);
    }
  }

  console.log(`\nTotal TikTok records fetched: ${allRecords.length}`);

  // Find duplicates
  const usernameMap = new Map<string, string[]>();
  
  for (const record of allRecords) {
    if (!record.username) continue;
    
    if (!usernameMap.has(record.username)) {
      usernameMap.set(record.username, []);
    }
    usernameMap.get(record.username)!.push(record.id);
  }

  // Find duplicates
  const duplicates: Array<{ username: string; ids: string[]; count: number }> = [];

  for (const [username, ids] of usernameMap.entries()) {
    if (ids.length > 1) {
      duplicates.push({ username, ids, count: ids.length });
    }
  }

  console.log(`\n=== Duplicate Check Results ===`);
  console.log(`Total records checked: ${allRecords.length}`);
  console.log(`Unique usernames: ${usernameMap.size}`);
  console.log(`Duplicate usernames found: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log(`\n=== Duplicate Details ===`);
    for (const dup of duplicates.slice(0, 20)) {
      console.log(`Username "${dup.username}" appears ${dup.count} times`);
      console.log(`  IDs: ${dup.ids.join(', ')}`);
    }
    
    if (duplicates.length > 20) {
      console.log(`... and ${duplicates.length - 20} more duplicates`);
    }
  } else {
    console.log('\nNo duplicates found! All usernames are unique.');
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
