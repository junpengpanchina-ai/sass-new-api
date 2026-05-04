const express = require("express");
const crypto = require("crypto");
const { apiTokenAuth } = require("../middleware/apiTokenAuth");
const { requireModelAccess } = require("../middleware/requireModelAccess");
const { forwardChatCompletion } = require("../lib/upstream");
const { writeUsageLog } = require("../lib/usageLogs");
const { chatCostCredits, checkCredits, chargeCredits } = require("../lib/credits");

const DEFAULT_MODEL_IDS = ["gpt-4o-mini", "nano-banana-pro"];

const router = express.Router();

router.get("/models", apiTokenAuth, async (req, res) => {
  try {
    const allowedModels = req.apiToken.allowed_models;

    const models =
      allowedModels === null || allowedModels === undefined
        ? DEFAULT_MODEL_IDS.map((id) => ({
            id,
            object: "model",
            owned_by: "yourbrand",
          }))
        : allowedModels.map((id) => ({
            id,
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

  try {
    const payload = req.body;
    const model = req.requestedModel;
    const locale = req.headers["accept-language"] || null;
    const cost = chatCostCredits();

    const creditCheck = await checkCredits(req.profile.id, cost);
    if (!creditCheck.ok) {
      await writeUsageLog({
        tokenId: req.apiToken.id,
        userId: req.profile.id,
        model,
        status: "denied",
        httpStatus: 402,
        latencyMs: Date.now() - startedAt,
        requestId,
        errorCode: "insufficient_credits",
        errorMessage: `Required ${cost} credits, balance ${creditCheck.balance}`,
        locale,
        creditsCharged: 0,
      });

      return res.status(402).json({
        error: {
          message: "Insufficient credits",
          type: "insufficient_credits",
          code: "insufficient_credits",
          message_en: "Insufficient credits to run this request.",
          message_zh: "额度不足，无法完成本次调用。",
          request_id: requestId,
          details: { required: cost, balance: creditCheck.balance },
        },
      });
    }

    const upstreamResult = await forwardChatCompletion(payload);
    const latencyMs = Date.now() - startedAt;

    if (!upstreamResult.ok) {
      await writeUsageLog({
        tokenId: req.apiToken.id,
        userId: req.profile.id,
        model,
        status: "error",
        httpStatus: upstreamResult.status,
        latencyMs,
        requestId,
        errorCode: "upstream_error",
        errorMessage: JSON.stringify(upstreamResult.data).slice(0, 500),
        locale,
      });

      return res.status(upstreamResult.status >= 400 ? upstreamResult.status : 502).json({
        error: {
          message: "Upstream request failed",
          type: "upstream_error",
          code: "upstream_error",
          request_id: requestId,
          details: upstreamResult.data,
        },
      });
    }

    const { id: usageLogId, error: usageInsertError } = await writeUsageLog({
      tokenId: req.apiToken.id,
      userId: req.profile.id,
      model,
      status: "ok",
      httpStatus: upstreamResult.status,
      latencyMs,
      requestId,
      locale,
    });

    if (usageInsertError || !usageLogId) {
      console.error("POST /v1/chat/completions: usage log insert failed after upstream ok", usageInsertError);
    } else {
      try {
        await chargeCredits({
          userId: req.profile.id,
          tokenId: req.apiToken.id,
          usageLogId,
          amount: cost,
          requestId,
        });
      } catch (chargeErr) {
        console.error("POST /v1/chat/completions: chargeCredits failed after upstream ok", chargeErr);
      }
    }

    return res.status(200).json(upstreamResult.data);
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    await writeUsageLog({
      tokenId: req.apiToken?.id || null,
      userId: req.profile?.id || null,
      model: req.body?.model || "unknown",
      status: "error",
      httpStatus: 500,
      latencyMs,
      requestId,
      errorCode: "gateway_internal_error",
      errorMessage: error.message,
      locale: req.headers["accept-language"] || null,
    });

    console.error("POST /v1/chat/completions error:", error);

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
