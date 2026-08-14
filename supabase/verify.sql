-- PotentialDS schema verification.
-- Run after all migrations. Every row should report `ok = true`.

with expected_tables(name) as (
  values
    ('creator_lists'),
    ('saved_creators'),
    ('creator_relationships'),
    ('creator_notes'),
    ('creator_activities'),
    ('creator_import_jobs'),
    ('creator_recommendation_feedback'),
    ('email_templates'),
    ('email_campaigns'),
    ('email_messages'),
    ('email_events'),
    ('email_links'),
    ('email_unsubscribes'),
    ('email_sending_profiles'),
    ('analytics_events'),
    ('security_events'),
    ('security_rate_limits'),
    ('security_allowlist')
),
expected_columns(table_name, column_name) as (
  values
    ('creator_lists', 'user_id'),
    ('creator_lists', 'name'),
    ('saved_creators', 'list_id'),
    ('saved_creators', 'influencer_id'),
    ('saved_creators', 'source'),
    ('creator_relationships', 'status'),
    ('creator_relationships', 'contact_email'),
    ('creator_relationships', 'next_follow_up_at'),
    ('creator_notes', 'relationship_id'),
    ('creator_notes', 'body'),
    ('creator_activities', 'activity_type'),
    ('creator_activities', 'metadata'),
    ('creator_import_jobs', 'field_mapping'),
    ('creator_import_jobs', 'error_summary'),
    ('creator_recommendation_feedback', 'recommended_influencer_id'),
    ('creator_recommendation_feedback', 'action'),
    ('email_templates', 'subject_template'),
    ('email_templates', 'html_template'),
    ('email_campaigns', 'daily_send_limit'),
    ('email_campaigns', 'sender_profile_id'),
    ('email_campaigns', 'total_recipients'),
    ('email_campaigns', 'sent_count'),
    ('email_campaigns', 'opened_count'),
    ('email_campaigns', 'next_run_at'),
    ('email_sending_profiles', 'from_email'),
    ('email_sending_profiles', 'sender_name'),
    ('email_sending_profiles', 'brand_name'),
    ('email_sending_profiles', 'daily_send_limit'),
    ('email_sending_profiles', 'is_enabled'),
    ('email_messages', 'provider_message_id'),
    ('email_messages', 'tracking_token'),
    ('email_messages', 'open_count'),
    ('email_messages', 'click_count'),
    ('email_events', 'provider_event_id'),
    ('email_events', 'is_machine_generated'),
    ('email_events', 'ip_hash'),
    ('email_links', 'target_url'),
    ('email_links', 'click_count'),
    ('email_unsubscribes', 'source_message_id'),
    ('analytics_events', 'entry_path'),
    ('analytics_events', 'traffic_source'),
    ('analytics_events', 'utm_campaign'),
    ('security_events', 'event_type'),
    ('security_events', 'risk_score'),
    ('security_events', 'reasons'),
    ('security_rate_limits', 'route_group'),
    ('security_rate_limits', 'request_count'),
    ('security_allowlist', 'match_type'),
    ('security_allowlist', 'expires_at')
)
select
  'table:' || expected_tables.name as check_name,
  to_regclass('public.' || expected_tables.name) is not null as ok
from expected_tables

union all

select
  'rls:' || expected_tables.name as check_name,
  coalesce(pg_class.relrowsecurity, false) as ok
from expected_tables
left join pg_class on pg_class.oid = to_regclass('public.' || expected_tables.name)

union all

select
  'column:' || expected_columns.table_name || '.' || expected_columns.column_name as check_name,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = expected_columns.table_name
      and column_name = expected_columns.column_name
  ) as ok
from expected_columns

union all

select
  'policy:' || policy_name as check_name,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public' and policyname = policy_name
  ) as ok
from (
  values
    ('creator_lists_owner'),
    ('saved_creators_owner'),
    ('creator_relationships_owner'),
    ('creator_notes_owner'),
    ('creator_activities_owner'),
    ('creator_import_jobs_owner'),
    ('creator_recommendation_feedback_owner'),
    ('email_templates_owner'),
    ('email_campaigns_owner'),
    ('email_messages_owner_read'),
    ('email_events_owner_read'),
    ('email_links_owner_read'),
    ('email_unsubscribes_owner_read'),
    ('email_sending_profiles_owner')
) as expected_policies(policy_name)

union all

select
  'function:' || function_name as check_name,
  to_regprocedure(function_signature) is not null as ok
from (
  values
    ('set_updated_at', 'public.set_updated_at()'),
    (
      'increment_security_rate_limit',
      'public.increment_security_rate_limit(text,text,timestamp with time zone)'
    ),
    ('purge_expired_telemetry', 'public.purge_expired_telemetry()')
) as expected_functions(function_name, function_signature)

order by check_name;
