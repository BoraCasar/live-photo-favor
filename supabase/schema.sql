-- ============================================================
-- Live Photo Favor — Supabase Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── events ────────────────────────────────────────────────
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  subdomain       text unique not null,
  client_name     text not null,
  event_date      date not null,
  primary_color   text not null default '#8B5CF6',
  logo_url        text,
  welcome_message text,
  slideshow_interval_seconds numeric(5,2) not null default 5,
  slideshow_transition text not null default 'cross_dissolve',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ─── photos ────────────────────────────────────────────────
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  storage_key text not null,
  guest_name  text,
  caption     text,
  approved    boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists photos_event_id_idx on public.photos(event_id);
create index if not exists photos_approved_idx on public.photos(approved);

-- ─── Row Level Security ─────────────────────────────────────

alter table public.events enable row level security;
alter table public.photos enable row level security;

-- Table grants (required for Supabase API roles)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.events to anon, authenticated, service_role;
grant select, insert, update, delete on public.photos to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Anyone can read active events (needed by middleware + home page)
create policy "Public read active events"
  on public.events for select
  using (is_active = true);

-- Server/admin (service role) can manage everything
create policy "Service role manage events"
  on public.events for all
  to service_role
  using (true)
  with check (true);

-- Anyone can read approved photos (needed by gallery)
create policy "Public read approved photos"
  on public.photos for select
  using (approved = true);

-- Anyone can insert photos (guest uploads — enforced at API level too)
create policy "Guests can insert photos"
  on public.photos for insert
  with check (true);

-- Server/admin (service role) can manage photos (moderation, etc.)
create policy "Service role manage photos"
  on public.photos for all
  to service_role
  using (true)
  with check (true);

-- ─── Realtime ──────────────────────────────────────────────
-- Enable Realtime for the photos table so the gallery updates live.
-- Go to: Supabase Dashboard → Database → Replication → 0 tables
-- and toggle ON the "photos" table, OR run:
alter publication supabase_realtime add table public.photos;
