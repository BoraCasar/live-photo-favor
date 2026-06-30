-- Run in Supabase SQL Editor (safe to re-run)

alter table public.admins
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_expires_at timestamptz;

alter table public.admins drop constraint if exists admins_subscription_status_check;

alter table public.admins
  add constraint admins_subscription_status_check
  check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'inactive'));

-- Grandfather existing suppliers (safe to re-run)
update public.admins
set subscription_status = 'active'
where subscription_status = 'inactive';

notify pgrst, 'reload schema';
