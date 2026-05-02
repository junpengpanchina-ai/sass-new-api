-- ============================================================
-- Supabase Schema V1（Token SaaS / DMIT API / Vercel / Stripe / GRSAI）
-- 《设计与 SQL 初稿》— 仓库冻结版
-- ============================================================
-- 设计原则（摘要）
-- 1）V1 只做主链：用户资料、套餐、订单、api_tokens、额度账本、调用日志、留资、管理员审计。
-- 2）表名统一用 api_tokens；页面/文档仍可称 “tokens”（平台 API token）。
-- 3）api_token 明文不落库；额度唯一来源 credit_ledger；Stripe 到账只认 Webhook；
--    GRSAI 仅经 DMIT；核心状态一律机器字段。
-- 4）敏感写操作由 DMIT（service role）执行；JWT 侧策略说明见 docs/supabase-rls-v1.md。
--
-- 执行：Supabase SQL Editor；需已启用 Auth（auth.users）。
-- ============================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) profiles（与 auth.users 1:1）
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user'
    check (role in ('user', 'admin')),
  plan text not null default 'free',
  status text not null default 'pending'
    check (status in ('visitor', 'pending', 'paid_pending', 'active', 'suspended')),
  company text,
  telegram text,
  locale text not null default 'en',
  country text,
  timezone text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_status on public.profiles (status);
create index if not exists idx_profiles_email on public.profiles (email);

-- -----------------------------------------------------------------------------
-- 2) plans（套餐）
-- -----------------------------------------------------------------------------
create table if not exists public.plans (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  description text,
  currency text not null default 'USD',
  price_amount integer not null default 0,
  credit_amount bigint not null default 0,
  stripe_price_id text,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plans_active on public.plans (active);
create index if not exists idx_plans_sort_order on public.plans (sort_order);

-- -----------------------------------------------------------------------------
-- 3) orders（支付订单）
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_code text not null,
  provider text not null default 'stripe',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  currency text not null default 'USD',
  amount_total integer not null default 0,
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'refunded', 'canceled')),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- -----------------------------------------------------------------------------
-- 4) api_tokens（仅存 hash）
-- -----------------------------------------------------------------------------
create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  status text not null default 'active'
    check (status in ('active', 'disabled', 'deleted')),
  allowed_models jsonb,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_api_tokens_user_id on public.api_tokens (user_id);
create index if not exists idx_api_tokens_status on public.api_tokens (status);
create index if not exists idx_api_tokens_created_at on public.api_tokens (created_at desc);

-- -----------------------------------------------------------------------------
-- 5) credit_ledger（唯一账本）
-- -----------------------------------------------------------------------------
create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id bigint references public.orders (id) on delete set null,
  token_id uuid references public.api_tokens (id) on delete set null,
  kind text not null
    check (kind in ('credit_add', 'credit_deduct', 'credit_refund', 'credit_adjust')),
  amount bigint not null,
  balance_after bigint,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_ledger_user_id on public.credit_ledger (user_id);
create index if not exists idx_credit_ledger_order_id on public.credit_ledger (order_id);
create index if not exists idx_credit_ledger_created_at on public.credit_ledger (created_at desc);
create index if not exists idx_credit_ledger_kind on public.credit_ledger (kind);

-- -----------------------------------------------------------------------------
-- 6) usage_logs（责任链；扩展列可空，便于后续接 GRSAI / 多语言而不改主链）
-- -----------------------------------------------------------------------------
create table if not exists public.usage_logs (
  id bigserial primary key,
  token_id uuid references public.api_tokens (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  model text not null,
  upstream_name text not null,
  status text not null
    check (status in ('ok', 'error', 'denied')),
  http_status integer,
  latency_ms integer,
  request_id text,
  error_code text,
  error_message text,
  locale text,
  upstream_provider text default 'grsai',
  upstream_model text,
  request_language text,
  credits_charged bigint,
  credit_ledger_id bigint references public.credit_ledger (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_logs_user_id on public.usage_logs (user_id);
create index if not exists idx_usage_logs_token_id on public.usage_logs (token_id);
create index if not exists idx_usage_logs_model on public.usage_logs (model);
create index if not exists idx_usage_logs_status on public.usage_logs (status);
create index if not exists idx_usage_logs_created_at on public.usage_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- 7) leads（留资）
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id bigserial primary key,
  email text not null,
  name text,
  company text,
  telegram text,
  message text,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_email on public.leads (email);
create index if not exists idx_leads_source on public.leads (source);
create index if not exists idx_leads_created_at on public.leads (created_at desc);

-- -----------------------------------------------------------------------------
-- 8) admin_audit_logs（管理员审计）
-- -----------------------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  admin_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_admin_user_id on public.admin_audit_logs (admin_user_id);
create index if not exists idx_admin_audit_logs_action on public.admin_audit_logs (action);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_plans_set_updated_at on public.plans;
create trigger trg_plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_api_tokens_set_updated_at on public.api_tokens;
create trigger trg_api_tokens_set_updated_at
  before update on public.api_tokens
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 注册用户自动建 profile
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    role,
    plan,
    status
  )
  values (
    new.id,
    coalesce(new.email, ''),
    'user',
    'free',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 禁止普通用户自行修改 role / plan / status（service role 仍可直接写）
-- -----------------------------------------------------------------------------
create or replace function public.profiles_prevent_self_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from auth.uid() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.plan is distinct from old.plan
     or new.status is distinct from old.status then
    raise exception 'Forbidden: cannot change role, plan, or status on own profile';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_self_privilege on public.profiles;
create trigger trg_profiles_prevent_self_privilege
  before update on public.profiles
  for each row execute function public.profiles_prevent_self_privilege_change();

-- =============================================================================
-- RLS（V1）
-- =============================================================================
-- 避免「policy 里查 profiles」导致 RLS 递归：管理员判定用 security definer。
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.orders enable row level security;
alter table public.api_tokens enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.usage_logs enable row level security;
alter table public.leads enable row level security;
alter table public.admin_audit_logs enable row level security;

-- profiles：本人可读/可更新（敏感字段由触发器拦截；推荐前端改用 PATCH /api/me）
-- V1 不按 RLS 放开 admin 全局读写 — admin 走 /api/admin/* + service role（见 docs/supabase-rls-v1.md）
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- plans：anon + authenticated 可读上架套餐；仅后端写
drop policy if exists plans_select_active on public.plans;
create policy plans_select_active on public.plans
  for select to anon, authenticated
  using (active = true);

-- orders：仅看自己的订单
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated
  using (auth.uid() = user_id);

-- api_tokens：仅看自己的元数据；创建/改状态仅 DMIT（service role）
drop policy if exists api_tokens_select_own on public.api_tokens;
create policy api_tokens_select_own on public.api_tokens
  for select to authenticated
  using (auth.uid() = user_id);

-- credit_ledger：仅看自己的流水
drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select to authenticated
  using (auth.uid() = user_id);

-- usage_logs：仅看自己的日志
drop policy if exists usage_logs_select_own on public.usage_logs;
create policy usage_logs_select_own on public.usage_logs
  for select to authenticated
  using (auth.uid() = user_id);

-- leads：不对匿名/登录用户开放 insert/select（统一走 DMIT 或 Next Route Handler + service role）
-- （无 policy = JWT 角色不可读写；service role 绕过 RLS）

-- admin_audit_logs：仅管理员可读（业务管理仍推荐 /api/admin/*）
drop policy if exists admin_audit_logs_select_admin on public.admin_audit_logs;
create policy admin_audit_logs_select_admin on public.admin_audit_logs
  for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 种子：套餐（可按 Stripe 实价再改 price_amount / stripe_price_id）
-- -----------------------------------------------------------------------------
insert into public.plans (code, name, description, currency, price_amount, credit_amount, active, sort_order)
values
  ('starter', 'Starter', 'For early testing and small usage', 'USD', 2900, 100000, true, 1),
  ('pro', 'Pro', 'For teams and continuous usage', 'USD', 9900, 500000, true, 2),
  ('channel', 'Channel', 'For reseller and white-label cooperation', 'USD', 0, 0, true, 3)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 首次管理员：注册后在 SQL Editor 执行（替换邮箱）
-- -----------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'you@example.com';
