import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const tables = {
  creator_lists: 'id,user_id,name',
  saved_creators: 'id,user_id,list_id,influencer_id,source',
  creator_relationships: 'id,user_id,influencer_id,status,contact_email,next_follow_up_at',
  creator_notes: 'id,user_id,relationship_id,body',
  creator_activities: 'id,user_id,influencer_id,activity_type,metadata',
  creator_import_jobs: 'id,user_id,status,field_mapping,error_summary',
  creator_recommendation_feedback: 'id,user_id,recommended_influencer_id,action',
  email_templates: 'id,user_id,subject_template,html_template',
  email_campaigns: 'id,user_id,status,daily_send_limit',
  email_messages: 'id,user_id,status,provider_message_id,tracking_token,open_count,click_count',
  email_events: 'id,message_id,event_type,provider_event_id,is_machine_generated,ip_hash',
  email_links: 'id,message_id,target_url,click_count',
  email_unsubscribes: 'id,user_id,email,source_message_id',
  analytics_events: 'id,event_name,entry_path,traffic_source,utm_campaign',
  security_events: 'id,event_type,risk_score,reasons',
  security_rate_limits: 'bucket_key_hash,route_group,request_count',
  security_allowlist: 'id,match_type,match_value,expires_at',
} as const;

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before verification.');
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const failures: string[] = [];

  for (const [table, columns] of Object.entries(tables)) {
    const { error } = await client.from(table).select(columns, { count: 'exact', head: true });
    if (error) {
      failures.push(`${table}: ${error.message}`);
      console.error(`FAIL ${table}: ${error.message}`);
    } else {
      console.log(`OK   ${table}`);
    }
  }

  const verificationKey = `schema-check-${crypto.randomUUID()}`;
  const { error: rpcError } = await client.rpc('increment_security_rate_limit', {
    p_bucket_key_hash: verificationKey,
    p_route_group: 'schema_verification',
    p_window_started_at: new Date(0).toISOString(),
  });
  if (rpcError) {
    failures.push(`increment_security_rate_limit: ${rpcError.message}`);
    console.error(`FAIL increment_security_rate_limit: ${rpcError.message}`);
  } else {
    console.log('OK   increment_security_rate_limit');
    await client
      .from('security_rate_limits')
      .delete()
      .eq('bucket_key_hash', verificationKey)
      .eq('route_group', 'schema_verification');
  }

  if (failures.length > 0) {
    throw new Error(`Schema verification failed (${failures.length} checks).`);
  }
  console.log(`Verified ${Object.keys(tables).length} tables, critical fields and the distributed rate-limit function.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
