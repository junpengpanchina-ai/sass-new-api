const { supabaseAdmin } = require("./supabase");

/**
 * 获取用户余额
 */
async function getCreditBalance(userId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, credits_balance, credits_total_recharged, credits_total_used")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("getCreditBalance error:", error);
    throw error;
  }

  return {
    userId: data.id,
    creditsBalance: Number(data.credits_balance || 0),
    creditsTotalRecharged: Number(data.credits_total_recharged || 0),
    creditsTotalUsed: Number(data.credits_total_used || 0),
  };
}

/**
 * 调用前余额检查
 */
async function ensureEnoughCredits(userId, requiredCredits = 1) {
  const balance = await getCreditBalance(userId);

  if (balance.creditsBalance < requiredCredits) {
    return {
      ok: false,
      code: "insufficient_credits",
      message: "Insufficient credits",
      requiredCredits,
      creditsBalance: balance.creditsBalance,
    };
  }

  return {
    ok: true,
    ...balance,
    requiredCredits,
  };
}

/**
 * 调用成功后扣费：走 Supabase RPC 事务
 */
async function chargeCredits({
  userId,
  tokenId,
  amount = 1,
  reason = "model usage",
  requestId = null,
  metadata = {},
}) {
  if (!userId) throw new Error("chargeCredits missing userId");
  if (!tokenId) throw new Error("chargeCredits missing tokenId");

  const { data, error } = await supabaseAdmin.rpc("rpc_charge_credits", {
    p_user_id: userId,
    p_token_id: tokenId,
    p_amount: amount,
    p_reason: reason,
    p_request_id: requestId,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error("rpc_charge_credits error:", error);
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || !row.ok) {
    return {
      ok: false,
      code: row?.code || "charge_failed",
      message: row?.message || "Charge failed",
      creditsBalance: Number(row?.balance_after || 0),
      requiredCredits: amount,
    };
  }

  return {
    ok: true,
    ledger: {
      id: row.ledger_id,
    },
    creditsCharged: Number(row.credits_charged || amount),
    balanceBefore: Number(row.balance_before || 0),
    balanceAfter: Number(row.balance_after || 0),
  };
}

module.exports = {
  getCreditBalance,
  ensureEnoughCredits,
  chargeCredits,
};
