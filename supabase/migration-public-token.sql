-- Add public_token for UUID-based guest links (run in Supabase SQL Editor)

alter table public.events
  add column if not exists public_token uuid unique default gen_random_uuid();

update public.events
set public_token = gen_random_uuid()
where public_token is null;

alter table public.events
  alter column public_token set not null;

create unique index if not exists events_public_token_idx on public.events (public_token);

-- subdomain no longer required for new events
alter table public.events
  alter column subdomain drop not null;
