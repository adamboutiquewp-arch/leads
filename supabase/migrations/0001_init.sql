-- ============================================================
-- Leads SaaS — schéma initial
-- ============================================================

-- --- Types ---------------------------------------------------
create type user_role as enum ('admin', 'client');
create type ad_platform as enum ('meta', 'google');
create type campaign_status as enum ('draft', 'ready', 'exported', 'live', 'paused');
create type lead_status as enum ('new', 'contacted', 'qualified', 'converted', 'lost');
create type subscription_status as enum ('pending', 'active', 'past_due', 'canceled');

-- --- Profiles (1:1 avec auth.users) ---------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'client',
  full_name text,
  company_name text,
  sector text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- Forfaits (catalogue statique) -----------------------------
create table public.forfaits (
  id text primary key,                 -- 'forfait_1' .. 'forfait_4'
  name text not null,
  price_cents integer not null,
  budget_cap_cents integer not null,   -- plafond budget pub mensuel autorisé
  sort_order integer not null default 0
);

insert into public.forfaits (id, name, price_cents, budget_cap_cents, sort_order) values
  ('forfait_1', 'Forfait 1', 5000,   20000,   1),
  ('forfait_2', 'Forfait 2', 10000,  50000,   2),
  ('forfait_3', 'Forfait 3', 20000,  120000,  3),
  ('forfait_4', 'Forfait 4', 50000,  500000,  4);

-- --- Subscriptions ----------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  forfait_id text not null references public.forfaits (id),
  budget_monthly_cents integer not null,
  status subscription_status not null default 'pending',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

-- --- Campaigns ----------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  platform ad_platform not null,
  status campaign_status not null default 'draft',
  daily_budget_cents integer,
  lifetime_budget_cents integer,
  creative_url text,
  creative_format text,                -- '1080x1080' | '1080x1920'
  export_file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_user_id_idx on public.campaigns (user_id);

-- --- Leads ------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  full_name text,
  email text,
  phone text,
  source text,                          -- 'meta' | 'google' | 'manual'
  status lead_status not null default 'new',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index leads_user_id_idx on public.leads (user_id);
create index leads_created_at_idx on public.leads (created_at desc);

-- --- Impersonation audit log --------------------------------------
create table public.impersonation_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  target_user_id uuid not null references public.profiles (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ============================================================
-- Helper: is_admin()
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.forfaits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.impersonation_logs enable row level security;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- forfaits: public read (needed on landing page pricing)
create policy "forfaits_public_read" on public.forfaits
  for select using (true);

-- subscriptions
create policy "subscriptions_select_own_or_admin" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
create policy "subscriptions_insert_own_or_admin" on public.subscriptions
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "subscriptions_update_own_or_admin" on public.subscriptions
  for update using (user_id = auth.uid() or public.is_admin());

-- campaigns
create policy "campaigns_select_own_or_admin" on public.campaigns
  for select using (user_id = auth.uid() or public.is_admin());
create policy "campaigns_insert_own_or_admin" on public.campaigns
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "campaigns_update_own_or_admin" on public.campaigns
  for update using (user_id = auth.uid() or public.is_admin());
create policy "campaigns_delete_own_or_admin" on public.campaigns
  for delete using (user_id = auth.uid() or public.is_admin());

-- leads (insertion se fait côté serveur via service_role dans le webhook, RLS bypass)
create policy "leads_select_own_or_admin" on public.leads
  for select using (user_id = auth.uid() or public.is_admin());
create policy "leads_update_own_or_admin" on public.leads
  for update using (user_id = auth.uid() or public.is_admin());

-- impersonation_logs: admin only
create policy "impersonation_logs_admin_only" on public.impersonation_logs
  for all using (public.is_admin());

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.campaigns;
