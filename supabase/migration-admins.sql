-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.admins (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  company_name  text not null,
  created_at    timestamptz not null default now()
);

alter table public.events
  add column if not exists admin_id uuid references public.admins(id) on delete set null;

create index if not exists events_admin_id_idx on public.events(admin_id);

grant select, insert, update, delete on public.admins to service_role;

alter table public.admins enable row level security;

create policy "Service role manage admins"
  on public.admins for all
  to service_role
  using (true)
  with check (true);
