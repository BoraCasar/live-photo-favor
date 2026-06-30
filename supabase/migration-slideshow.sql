-- Run in Supabase SQL Editor (safe to re-run)

alter table public.events
  add column if not exists slideshow_interval_seconds numeric(5,2) not null default 5;

alter table public.events drop constraint if exists events_slideshow_interval_seconds_check;

do $$
begin
  alter table public.events
    add constraint events_slideshow_interval_seconds_check
    check (slideshow_interval_seconds >= 1 and slideshow_interval_seconds <= 120);
exception
  when duplicate_object then null;
end $$;

-- Reload PostgREST schema cache so the API sees the new column immediately
notify pgrst, 'reload schema';
