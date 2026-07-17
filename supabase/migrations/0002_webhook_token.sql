alter table public.profiles
  add column webhook_token uuid not null default gen_random_uuid();

create unique index profiles_webhook_token_idx on public.profiles (webhook_token);
