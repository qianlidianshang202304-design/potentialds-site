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

  console.log('Deleting TikTok data...');
  
  try {
    // 分批删除数据，每次删除1000条
    const batchSize = 1000;
    let deletedCount = 0;
    
    while (true) {
      const { error, count } = await supabase
        .from('influencers')
        .delete()
        .eq('platform', 'tiktok')
        .limit(batchSize)
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Error deleting TikTok data:', error);
        throw error;
      }

      const batchDeleted = count || 0;
      deletedCount += batchDeleted;
      
      console.log(`Deleted ${batchDeleted} records (total: ${deletedCount})`);
      
      if (batchDeleted < batchSize) {
        break; // 没有更多数据可删除
      }
    }

    console.log(`Successfully deleted ${deletedCount} TikTok records`);
  } catch (error) {
    console.error('Error deleting TikTok data:', error);
    process.exit(1);
  }

  console.log('TikTok data cleared successfully');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});