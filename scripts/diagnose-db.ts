import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('=== Database Connection Diagnosis ===\n');
  
  // Check environment variables
  console.log('1. Checking environment variables...');
  if (!supabaseUrl) {
    console.error('   ❌ Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }
  console.log('   ✅ SUPABASE_URL found');
  console.log(`   URL: ${supabaseUrl}`);
  
  if (!supabaseServiceKey) {
    console.error('   ❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  console.log('   ✅ Service key found');
  console.log(`   Key length: ${supabaseServiceKey.length} characters`);
  
  // Try to connect
  console.log('\n2. Attempting to connect to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  
  try {
    // Test simple query
    console.log('\n3. Testing simple query...');
    const startTime = Date.now();
    const { data, error, count } = await supabase
      .from('influencers')
      .select('*', { count: 'exact', head: true });
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('   ❌ Query failed:', error);
      throw error;
    }
    
    console.log(`   ✅ Query successful (${duration}ms)`);
    console.log(`   Total records: ${count}`);
    
    // Test TikTok records
    console.log('\n4. Checking TikTok records...');
    const { data: tiktokData, error: tiktokError, count: tiktokCount } = await supabase
      .from('influencers')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'tiktok');
    
    if (tiktokError) {
      console.error('   ❌ TikTok query failed:', tiktokError);
    } else {
      console.log(`   ✅ TikTok query successful`);
      console.log(`   TikTok records: ${tiktokCount}`);
    }
    
    // Test table structure
    console.log('\n5. Checking table structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('influencers')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('   ❌ Failed to get sample data:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('   ✅ Sample data retrieved');
      console.log('   Available columns:', Object.keys(sampleData[0]).join(', '));
    }
    
    console.log('\n=== Diagnosis Complete ===');
    console.log('Database connection is working normally.');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error);
    console.log('\nPossible causes:');
    console.log('1. Network connectivity issues');
    console.log('2. Supabase server is down or experiencing issues');
    console.log('3. Invalid credentials');
    console.log('4. Database is under heavy load');
    console.log('\nRecommendations:');
    console.log('- Check your internet connection');
    console.log('- Visit https://status.supabase.com/ for service status');
    console.log('- Verify your .env.local file has correct credentials');
    console.log('- Wait a few minutes and try again');
    process.exit(1);
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
