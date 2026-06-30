-- ============================================================
-- Live Photo Favor — Fix permissions (run in Supabase SQL Editor)
-- ============================================================

-- 1. Grant table access to Supabase API roles
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.events to anon, authenticated, service_role;
grant select, insert, update, delete on public.photos to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- 2. Service role policies (admin API + server routes)
drop policy if exists "Service role manage events" on public.events;
create policy "Service role manage events"
  on public.events
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manage photos" on public.photos;
create policy "Service role manage photos"
  on public.photos
  for all
  to service_role
  using (true)
  with check (true);

-- 3. Allow server-side admin to list all events (including inactive)
drop policy if exists "Service role read all events" on public.events;
create policy "Service role read all events"
  on public.events
  for select
  to service_role
  using (true);
