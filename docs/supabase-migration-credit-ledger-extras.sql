-- credit_ledger 与 usage_logs / request 对齐的可选列（与 DMIT chargeCredits 写入字段一致）
-- 若表上已有这些列可跳过；纯 v1 无下列字段时需执行一次，否则带扩展字段的 insert 会报错

alter table public.credit_ledger
  add column if not exists credits bigint,
  add column if not exists request_id text,
  add column if not exists usage_log_id bigint references public.usage_logs (id) on delete set null;

create index if not exists idx_credit_ledger_usage_log_id on public.credit_ledger (usage_log_id);
