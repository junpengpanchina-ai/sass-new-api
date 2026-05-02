-- ============================================================
-- Ops Backend Schema V1（Products / Customers / Ops Orders）
-- 目标：极简运营后台，可卖、可记、可发货
--
-- 执行：Supabase SQL Editor（建议在 supabase-schema-v1.sql 之后执行）
-- ============================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- updated_at helper (self-contained; safe to run multiple times)
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

-- -----------------------------------------------------------------------------
-- 1) products（卖什么：上游模型/产品映射 + 定价）
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  upstream_name text,
  upstream_model text,
  category text not null default 'text'
    check (category in ('text', 'image', 'video')),
  sell_price integer not null default 0,
  cost_price integer,
  currency text not null default 'USD'
    check (currency in ('USD', 'CNY')),
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_active on public.products (active);
create index if not exists idx_products_featured on public.products (featured);
create index if not exists idx_products_sort_order on public.products (sort_order);
create index if not exists idx_products_category on public.products (category);

drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) customers（客户池）
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id bigserial primary key,
  email text not null,
  name text,
  company text,
  telegram text,
  source text not null default 'unknown',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'paid', 'delivered', 'invalid')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_email on public.customers (email);
create index if not exists idx_customers_status on public.customers (status);
create index if not exists idx_customers_source on public.customers (source);
create index if not exists idx_customers_created_at on public.customers (created_at desc);

drop trigger if exists trg_customers_set_updated_at on public.customers;
create trigger trg_customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) ops_orders（手动售卖/发货订单）
-- -----------------------------------------------------------------------------
create table if not exists public.ops_orders (
  id bigserial primary key,
  customer_id bigint references public.customers (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  amount integer not null default 0,
  currency text not null default 'USD'
    check (currency in ('USD', 'CNY')),
  payment_status text not null default 'created'
    check (payment_status in ('created', 'paid', 'failed', 'cancelled')),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'delivered', 'cancelled')),
  delivery_content text,
  note text,
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ops_orders_customer_id on public.ops_orders (customer_id);
create index if not exists idx_ops_orders_product_id on public.ops_orders (product_id);
create index if not exists idx_ops_orders_payment_status on public.ops_orders (payment_status);
create index if not exists idx_ops_orders_delivery_status on public.ops_orders (delivery_status);
create index if not exists idx_ops_orders_created_at on public.ops_orders (created_at desc);

drop trigger if exists trg_ops_orders_set_updated_at on public.ops_orders;
create trigger trg_ops_orders_set_updated_at
  before update on public.ops_orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS：V1 运营后台数据全部走 DMIT service role 写入。
-- 开启 RLS 但不配置任何 JWT policy（避免误开放）。
-- -----------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.ops_orders enable row level security;

-- -----------------------------------------------------------------------------
-- 4) ops_settings（运营后台配置：如文档链接）
-- -----------------------------------------------------------------------------
create table if not exists public.ops_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ops_settings_set_updated_at on public.ops_settings;
create trigger trg_ops_settings_set_updated_at
  before update on public.ops_settings
  for each row execute function public.set_updated_at();

alter table public.ops_settings enable row level security;

