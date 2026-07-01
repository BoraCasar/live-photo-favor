-- Photo display order for admin drag-and-drop (run in Supabase SQL Editor)

alter table public.photos
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (partition by event_id order by created_at asc) - 1 as rn
  from public.photos
)
update public.photos p
set sort_order = ranked.rn
from ranked
where p.id = ranked.id;
