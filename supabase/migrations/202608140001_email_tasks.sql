-- Email task dashboard and sender settings.
-- Secrets remain in deployment environment variables; this table stores only
-- user-facing sender preferences and limits.

create table if not exists public.email_sending_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '默认发件配置' check (char_length(label) between 1 and 80),
  provider text not null default 'resend' check (provider in ('resend')),
  from_email text,
  reply_to_email text,
  sender_name text,
  brand_name text,
  daily_send_limit integer not null default 50 check (daily_send_limit between 1 and 1000),
  is_enabled boolean not null default true,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_campaigns
  add column if not exists sender_profile_id uuid references public.email_sending_profiles(id) on delete set null,
  add column if not exists sender_name text,
  add column if not exists brand_name text,
  add column if not exists total_recipients integer not null default 0,
  add column if not exists sent_count integer not null default 0,
  add column if not exists failed_count integer not null default 0,
  add column if not exists opened_count integer not null default 0,
  add column if not exists clicked_count integer not null default 0,
  add column if not exists next_run_at timestamptz,
  add column if not exists last_run_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists email_sending_profiles_default_unique
  on public.email_sending_profiles (user_id)
  where is_default = true;

create index if not exists email_sending_profiles_user_idx
  on public.email_sending_profiles (user_id, is_enabled, updated_at desc);

create index if not exists email_campaigns_run_idx
  on public.email_campaigns (status, next_run_at)
  where status in ('scheduled', 'sending');

drop trigger if exists email_sending_profiles_set_updated_at on public.email_sending_profiles;
create trigger email_sending_profiles_set_updated_at before update on public.email_sending_profiles
for each row execute function public.set_updated_at();

alter table public.email_sending_profiles enable row level security;

drop policy if exists email_sending_profiles_owner on public.email_sending_profiles;
create policy email_sending_profiles_owner on public.email_sending_profiles for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
