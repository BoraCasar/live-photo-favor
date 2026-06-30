-- Run in Supabase SQL Editor (safe to re-run)

alter table public.events
  add column if not exists slideshow_transition text not null default 'cross_dissolve';

alter table public.events drop constraint if exists events_slideshow_transition_check;

alter table public.events
  add constraint events_slideshow_transition_check
  check (slideshow_transition in ('cross_dissolve', 'fade_black', 'cut'));

notify pgrst, 'reload schema';
