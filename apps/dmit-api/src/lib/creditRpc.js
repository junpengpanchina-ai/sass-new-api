const { supabaseAdmin } = require("./supabase");

function isRpcUnavailableError(err) {
  if (!err) return false;
  const msg = String(err.message || err.details || err.hint || "");
  return (
    err.code === "PGRST202" ||
    err.code === "PGRST204" ||
    err.code === "42883" ||
    msg.includes("Could not find the function") ||
    msg.includes("function public.rpc_") ||
    msg.includes("does not exist")
  );
}

/**
 * @returns {Promise<{ fromRpc: true, result: object } | { fromRpc: false }>}
 */
async function tryRpcGrantAdminCredits({ userId, amount, reason, requestId, metadata }) {
  const { data, error } = await supabaseAdmin.rpc("rpc_grant_admin_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_request_id: requestId,
    p_metadata: metadata || {},
  });

  if (!error) {
    return { fromRpc: true, result: typeof data === "object" && data !== null ? data : {} };
  }
  if (isRpcUnavailableError(error)) {
    return { fromRpc: false };
  }
  throw error;
}

/**
 * @returns {Promise<{ fromRpc: true, result: object } | { fromRpc: false }>}
 */
async function tryRpcDeductChatCredits({ userId, tokenId, usageLogId, amount, requestId }) {
  const { data, error } = await supabaseAdmin.rpc("rpc_deduct_chat_credits", {
    p_user_id: userId,
    p_token_id: tokenId,
    p_usage_log_id: usageLogId,
    p_amount: amount,
    p_request_id: requestId,
  });

  if (!error) {
    return { fromRpc: true, result: typeof data === "object" && data !== null ? data : {} };
  }
  if (isRpcUnavailableError(error)) {
    return { fromRpc: false };
  }
  throw error;
}

module.exports = {
  tryRpcGrantAdminCredits,
  tryRpcDeductChatCredits,
  isRpcUnavailableError,
};
