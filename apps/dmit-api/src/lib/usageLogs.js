const { supabaseAdmin } = require("./supabase");
const { env } = require("./env");

async function writeUsageLog({
  tokenId = null,
  userId = null,
  model,
  status,
  httpStatus = null,
  latencyMs = null,
  requestId = null,
  errorCode = null,
  errorMessage = null,
  locale = null,
  upstreamProvider = "grsai",
  upstreamModel = null,
  requestLanguage = null,
  creditsCharged = null,
  creditLedgerId = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .insert({
      token_id: tokenId,
      user_id: userId,
      model: model || "unknown",
      upstream_name: env.UPSTREAM_NAME || "grsai-primary",
      upstream_provider: upstreamProvider,
      upstream_model: upstreamModel,
      request_language: requestLanguage,
      status,
      http_status: httpStatus,
      latency_ms: latencyMs,
      request_id: requestId,
      error_code: errorCode,
      error_message: errorMessage,
      locale,
      credits_charged: creditsCharged,
      credit_ledger_id: creditLedgerId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("writeUsageLog error:", error);
    return { ok: false, error };
  }

  return { ok: true, id: data.id };
}

module.exports = {
  writeUsageLog,
};
