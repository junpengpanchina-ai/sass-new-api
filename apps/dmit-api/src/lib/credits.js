const { supabaseAdmin } = require("./supabase");
const { tryRpcDeductChatCredits } = require("./creditRpc");

const DEFAULT_CHAT_COST = 1;

function chatCostCredits() {
  const n = Number.parseInt(process.env.CHAT_COMPLETION_CREDIT_COST || "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CHAT_COST;
}

async function fetchCreditsBalance(userId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("fetchCreditsBalance error:", error);
    throw error;
  }

  const raw = data?.credits_balance;
  const n = raw === null || raw === undefined ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

async function checkCredits(userId, requiredCredits) {
  const balance = await fetchCreditsBalance(userId);
  return {
    ok: balance >= requiredCredits,
    balance,
  };
}

/**
 * 上游已成功：记一笔 credit_deduct，减 profiles 余额，回填 usage_logs。
 * 若某步失败会打日志；调用方仍可对客户端返回 200（上游已消耗）。
 */
async function chargeCredits({ userId, tokenId, usageLogId, amount, requestId }) {
  const cost = Number(amount);
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error("chargeCredits: invalid amount");
  }

  const rpcTry = await tryRpcDeductChatCredits({
    userId,
    tokenId,
    usageLogId,
    amount: cost,
    requestId,
  });

  if (rpcTry.fromRpc) {
    const r = rpcTry.result || {};
    const creditLedgerId = Number(r.credit_ledger_id);
    const balanceAfter = Number(r.balance_after);
    if (Number.isFinite(creditLedgerId) && Number.isFinite(balanceAfter)) {
      return {
        creditLedgerId,
        creditsCharged: Number(r.credits_charged ?? cost),
        balanceAfter,
      };
    }
    console.warn("chargeCredits: RPC returned invalid payload, falling back", r);
  }

  const { data: profileRow, error: profileReadError } = await supabaseAdmin
    .from("profiles")
    .select("credits_balance, credits_total_used")
    .eq("id", userId)
    .single();

  if (profileReadError || !profileRow) {
    console.error("chargeCredits profile read:", profileReadError);
    throw profileReadError || new Error("profile not found");
  }

  const prevBalance = Number(profileRow.credits_balance ?? 0);
  const prevUsed = Number(profileRow.credits_total_used ?? 0);
  const nextBalance = prevBalance - cost;

  if (nextBalance < 0) {
    console.error("chargeCredits: balance would go negative", { userId, prevBalance, cost });
    throw new Error("insufficient_credits_race");
  }

  const { data: ledgerRow, error: ledgerError } = await supabaseAdmin
    .from("credit_ledger")
    .insert({
      user_id: userId,
      order_id: null,
      token_id: tokenId,
      kind: "credit_deduct",
      amount: cost,
      credits: cost,
      balance_after: nextBalance,
      reason: "chat_completion",
      request_id: requestId,
      usage_log_id: usageLogId,
      metadata: {
        request_id: requestId,
        usage_log_id: usageLogId,
      },
    })
    .select("id")
    .single();

  if (ledgerError || !ledgerRow?.id) {
    console.error("chargeCredits ledger insert:", ledgerError);
    throw ledgerError || new Error("ledger insert failed");
  }

  const { error: profileUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({
      credits_balance: nextBalance,
      credits_total_used: prevUsed + cost,
    })
    .eq("id", userId);

  if (profileUpdateError) {
    console.error("chargeCredits profile update:", profileUpdateError);
    throw profileUpdateError;
  }

  const { error: usagePatchError } = await supabaseAdmin
    .from("usage_logs")
    .update({
      credits_charged: cost,
      credit_ledger_id: ledgerRow.id,
    })
    .eq("id", usageLogId);

  if (usagePatchError) {
    console.error("chargeCredits usage_logs patch:", usagePatchError);
    throw usagePatchError;
  }

  return { creditLedgerId: ledgerRow.id, creditsCharged: cost, balanceAfter: nextBalance };
}

module.exports = {
  chatCostCredits,
  fetchCreditsBalance,
  checkCredits,
  chargeCredits,
};
