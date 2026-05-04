-- ============================================================
-- Credits 原子操作 RPC（仅 service_role / 服务端调用）
-- 前置：profiles 额度列（supabase-migration-profiles-credits.sql）
--       credit_ledger 扩展列（supabase-migration-credit-ledger-extras.sql，推荐）
-- 执行：Supabase SQL Editor
-- ============================================================

-- 管理员加额：单行锁 profiles → 插 credit_add → 更新 profiles（单事务）
create or replace function public.rpc_grant_admin_credits(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_request_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_balance bigint;
  v_prev_recharged bigint;
  v_next_balance bigint;
  v_ledger_id bigint;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select coalesce(credits_balance, 0), coalesce(credits_total_recharged, 0)
    into v_prev_balance, v_prev_recharged
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  v_next_balance := v_prev_balance + p_amount;

  insert into public.credit_ledger (
    user_id,
    order_id,
    token_id,
    kind,
    amount,
    credits,
    balance_after,
    reason,
    request_id,
    usage_log_id,
    metadata
  )
  values (
    p_user_id,
    null,
    null,
    'credit_add',
    p_amount,
    p_amount,
    v_next_balance,
    coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'admin_credit_grant'),
    p_request_id,
    null,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_id;

  update public.profiles
  set
    credits_balance = v_next_balance,
    credits_total_recharged = v_prev_recharged + p_amount
  where id = p_user_id;

  return jsonb_build_object(
    'credit_ledger_id', v_ledger_id,
    'credits_balance_before', v_prev_balance,
    'credits_balance_after', v_next_balance,
    'amount', p_amount
  );
end;
$$;

-- 网关聊天扣费：锁 profiles → 校验余额 → 插 credit_deduct → 更新 profiles → 回填 usage_logs
create or replace function public.rpc_deduct_chat_credits(
  p_user_id uuid,
  p_token_id uuid,
  p_usage_log_id bigint,
  p_amount bigint,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_balance bigint;
  v_prev_used bigint;
  v_next_balance bigint;
  v_ledger_id bigint;
  v_rc int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select coalesce(credits_balance, 0), coalesce(credits_total_used, 0)
    into v_prev_balance, v_prev_used
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  if v_prev_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  v_next_balance := v_prev_balance - p_amount;

  insert into public.credit_ledger (
    user_id,
    order_id,
    token_id,
    kind,
    amount,
    credits,
    balance_after,
    reason,
    request_id,
    usage_log_id,
    metadata
  )
  values (
    p_user_id,
    null,
    p_token_id,
    'credit_deduct',
    p_amount,
    p_amount,
    v_next_balance,
    'chat_completion',
    p_request_id,
    p_usage_log_id,
    jsonb_build_object('request_id', p_request_id, 'usage_log_id', p_usage_log_id)
  )
  returning id into v_ledger_id;

  update public.profiles
  set
    credits_balance = v_next_balance,
    credits_total_used = v_prev_used + p_amount
  where id = p_user_id;

  update public.usage_logs
  set
    credits_charged = p_amount,
    credit_ledger_id = v_ledger_id
  where id = p_usage_log_id
    and user_id is not distinct from p_user_id;

  get diagnostics v_rc = row_count;
  if v_rc = 0 then
    raise exception 'usage_log_not_found' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'credit_ledger_id', v_ledger_id,
    'credits_charged', p_amount,
    'balance_after', v_next_balance
  );
end;
$$;

revoke all on function public.rpc_grant_admin_credits(uuid, bigint, text, text, jsonb) from public;
revoke all on function public.rpc_deduct_chat_credits(uuid, uuid, bigint, bigint, text) from public;
revoke all on function public.rpc_grant_admin_credits(uuid, bigint, text, text, jsonb) from anon;
revoke all on function public.rpc_deduct_chat_credits(uuid, uuid, bigint, bigint, text) from anon;
revoke all on function public.rpc_grant_admin_credits(uuid, bigint, text, text, jsonb) from authenticated;
revoke all on function public.rpc_deduct_chat_credits(uuid, uuid, bigint, bigint, text) from authenticated;

grant execute on function public.rpc_grant_admin_credits(uuid, bigint, text, text, jsonb) to service_role;
grant execute on function public.rpc_deduct_chat_credits(uuid, uuid, bigint, bigint, text) to service_role;
