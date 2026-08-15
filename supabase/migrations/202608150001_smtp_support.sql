-- SMTP support for email sending profiles.

alter table public.email_sending_profiles
  add column if not exists smtp_host text,
  add column if not exists smtp_port integer,
  add column if not exists smtp_user text,
  add column if not exists smtp_password text,
  add column if not exists smtp_secure boolean not null default true;

alter table public.email_sending_profiles
  drop constraint if exists email_sending_profiles_provider_check;

alter table public.email_sending_profiles
  add constraint email_sending_profiles_provider_check
  check (provider in ('resend', 'smtp'));
