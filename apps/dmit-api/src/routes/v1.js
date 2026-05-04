const express = require("express");
const crypto = require("crypto");
const { env } = require("../lib/env");
const { writeUsageLog } = require("../lib/usageLogs");
const { ensureEnoughCredits, chargeCredits } = require("../lib/credits");
const { apiTokenAuth } = require("../middleware/apiTokenAuth");
const { requireModelAccess } = require("../middleware/requireModelAccess");

const router = express.Router();

function getUpstreamBaseUrl() {
  const base = env.UPSTREAM_BASE_URL || env.GRSAI_BASE_URL;
  if (!base) throw new Error("Missing UPSTREAM_BASE_URL or GRSAI_BASE_URL");
  return base.replace(/\/$/, "");
}

function getUpstreamApiKey() {
  const key = env.UPSTREAM_API_KEY || env.GRSAI_API_KEY;
  if (!key) throw new Error("Missing UPSTREAM_API_KEY or GRSAI_API_KEY");
  return key;
}

router.get("/models", apiTokenAuth, async (req, res) => {
  try {
    const allowedModels = req.apiToken?.allowed_models || [];

    const models = allowedModels.map((model) => ({
      id: model,
      object: "model",
      owned_by: "yourbrand",
    }));

    return res.json({
      object: "list",
      data: models,
    });
  } catch (error) {
    console.error("GET /v1/models error:", error);
    return res.status(500).json({
      error: {
        message: "Failed to fetch models",
        type: "server_error",
        code: "models_fetch_failed",
      },
    });
  }
});

router.post("/chat/completions", apiTokenAuth, requireModelAccess, async (req, res) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const model = req.body?.model || "unknown";
  const locale = req.headers["accept-language"] || null;

  try {
    const tokenId = req.apiToken?.id;
    const userId = req.apiToken?.user_id;

    if (!tokenId || !userId) {
      await writeUsageLog({
        tokenId: tokenId || null,
        userId: userId || null,
        model,
        status: "error",
        httpStatus: 401,
        latencyMs: Date.now() - startedAt,
        requestId,
        errorCode: "invalid_token_context",
        errorMessage: "Missing token or user context",
        locale,
      });

      return res.status(401).json({
        error: {
          message: "Invalid API token context",
          type: "auth_error",
          code: "invalid_token_context",
          request_id: requestId,
        },
      });
    }

    // 1. 调用前先查余额，不够就不打上游
    const creditCheck = await ensureEnoughCredits(userId, 1);

    if (!creditCheck.ok) {
      await writeUsageLog({
        tokenId,
        userId,
        model,
        status: "rejected",
        httpStatus: 402,
        latencyMs: Date.now() - startedAt,
        requestId,
        errorCode: "insufficient_credits",
        errorMessage: "Insufficient credits",
        locale,
        creditsCharged: 0,
      });

      return res.status(402).json({
        error: {
          message: "Insufficient credits",
          type: "billing_error",
          code: "insufficient_credits",
          request_id: requestId,
          credits_balance: creditCheck.creditsBalance,
          required_credits: creditCheck.requiredCredits,
        },
      });
    }

    // 2. 调用 GRSAI 上游
    const upstreamUrl = `${getUpstreamBaseUrl()}/chat/completions`;

    const upstreamResp = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getUpstreamApiKey()}`,
        "Content-Type": "application/json",
        "Accept-Language": locale || "zh-CN",
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstreamResp.text();
    let upstreamData;
    try {
      upstreamData = JSON.parse(text);
    } catch (_) {
      upstreamData = { raw: text };
    }

    const latencyMs = Date.now() - startedAt;

    // 3. 上游失败：只记日志，不扣费
    if (!upstreamResp.ok) {
      await writeUsageLog({
        tokenId,
        userId,
        model,
        status: "upstream_error",
        httpStatus: upstreamResp.status,
        latencyMs,
        requestId,
        errorCode: "upstream_error",
        errorMessage: typeof upstreamData === "object" ? JSON.stringify(upstreamData).slice(0, 1000) : String(upstreamData),
        locale,
        creditsCharged: 0,
      });

      return res.status(upstreamResp.status).json(upstreamData);
    }

    // 4. 上游成功后扣 1 credit
    const charge = await chargeCredits({
      userId,
      tokenId,
      amount: 1,
      reason: "chat completion",
      requestId,
      metadata: {
        model,
        locale,
        upstream: "grsai",
        stage: "credits_v1",
      },
    });

    // 5. 写 usage_logs，带上扣费结果
    await writeUsageLog({
      tokenId,
      userId,
      model,
      status: "ok",
      httpStatus: upstreamResp.status,
      latencyMs,
      requestId,
      locale,
      upstreamProvider: "grsai",
      creditsCharged: charge.creditsCharged,
      creditLedgerId: charge.ledger?.id || null,
    });

    return res.status(200).json(upstreamData);
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    console.error("POST /v1/chat/completions error:", error);

    try {
      await writeUsageLog({
        tokenId: req.apiToken?.id || null,
        userId: req.apiToken?.user_id || null,
        model,
        status: "error",
        httpStatus: 500,
        latencyMs,
        requestId,
        errorCode: "gateway_internal_error",
        errorMessage: error.message,
        locale,
      });
    } catch (logError) {
      console.error("failed to write error usage log:", logError);
    }

    return res.status(500).json({
      error: {
        message: "Gateway internal error",
        type: "server_error",
        code: "gateway_internal_error",
        request_id: requestId,
      },
    });
  }
});

module.exports = router;
