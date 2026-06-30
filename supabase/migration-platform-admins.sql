-- Run in Supabase SQL Editor (safe to re-run)

create table if not exists public.platform_admins (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

grant select, insert, update, delete on public.platform_admins to service_role;

alter table public.platform_admins enable row level security;

create policy "Service role manage platform_admins"
  on public.platform_admins for all
  to service_role
  using (true)
  with check (true);

notify pgrst, 'reload schema';
