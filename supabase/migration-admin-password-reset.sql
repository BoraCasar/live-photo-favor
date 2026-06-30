-- Run in Supabase SQL Editor (safe to re-run)

alter table public.admins
  add column if not exists password_reset_token_hash text,
  add column if not exists password_reset_expires_at timestamptz;

notify pgrst, 'reload schema';
