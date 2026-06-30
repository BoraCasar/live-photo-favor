-- Run in Supabase SQL Editor after migration-slideshow.sql (safe to re-run)
-- Allows decimal intervals (e.g. 1.5s) and lowers minimum to 1 second.

alter table public.events drop constraint if exists events_slideshow_interval_seconds_check;

alter table public.events
  alter column slideshow_interval_seconds type numeric(5,2)
  using slideshow_interval_seconds::numeric(5,2);

alter table public.events
  alter column slideshow_interval_seconds set default 5;

alter table public.events
  add constraint events_slideshow_interval_seconds_check
  check (slideshow_interval_seconds >= 1 and slideshow_interval_seconds <= 120);

notify pgrst, 'reload schema';
