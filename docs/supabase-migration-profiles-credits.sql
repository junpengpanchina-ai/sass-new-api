-- profiles 额度列（与 credit_ledger / usage_logs 扣费闭环对齐）
-- 在 Supabase SQL Editor 执行；可重复执行（IF NOT EXISTS）

alter table public.profiles
  add column if not exists credits_balance bigint not null default 0,
  add column if not exists credits_total_recharged bigint not null default 0,
  add column if not exists credits_total_used bigint not null default 0;
