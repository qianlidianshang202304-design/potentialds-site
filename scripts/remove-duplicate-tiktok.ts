import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';

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

  console.log('Finding duplicate usernames using batch approach...');
  
  // Step 1: Get all TikTok records in batches
  const allRecords: Array<{ id: number; username: string }> = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching records ${offset} to ${offset + batchSize}...`);
    
    const { data, error } = await supabase
      .from('influencers')
      .select('id, username')
      .eq('platform', 'tiktok')
      .order('id', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching batch:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRecords.push(...data);
      offset += batchSize;
      
      if (data.length < batchSize) {
        hasMore = false;
      }
    }
  }

  console.log(`Total TikTok records: ${allRecords.length}`);

  // Step 2: Find duplicates
  const usernameMap = new Map<string, number[]>();
  
  for (const record of allRecords) {
    if (!record.username) continue;
    
    if (!usernameMap.has(record.username)) {
      usernameMap.set(record.username, []);
    }
    usernameMap.get(record.username)!.push(record.id);
  }

  // Step 3: Find IDs to delete (keep the newest, which has the highest ID)
  const idsToDelete: number[] = [];
  let duplicateCount = 0;

  for (const [username, ids] of usernameMap.entries()) {
    if (ids.length > 1) {
      duplicateCount++;
      // Sort descending, keep the first (newest), delete the rest
      ids.sort((a, b) => b - a);
      const toDelete = ids.slice(1);
      idsToDelete.push(...toDelete);
      
      if (duplicateCount <= 10) {
        console.log(`Username "${username}" has ${ids.length} records, keeping ID ${ids[0]}, deleting ${toDelete.length} records`);
      }
    }
  }

  console.log(`\nFound ${duplicateCount} usernames with duplicates`);
  console.log(`Total records to delete: ${idsToDelete.length}`);

  if (idsToDelete.length === 0) {
    console.log('No duplicates found. Done!');
    return;
  }

  // Step 4: Delete in batches
  const deleteBatchSize = 100;
  let deleted = 0;

  for (let i = 0; i < idsToDelete.length; i += deleteBatchSize) {
    const batch = idsToDelete.slice(i, i + deleteBatchSize);
    
    const { error: deleteError } = await supabase
      .from('influencers')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error('Error deleting batch:', deleteError);
      continue;
    }

    deleted += batch.length;
    console.log(`Deleted ${deleted}/${idsToDelete.length} records...`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total duplicates found: ${duplicateCount}`);
  console.log(`Records deleted: ${deleted}`);
  console.log(`Records remaining: ${allRecords.length - deleted}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});