const { writeUsageLog } = require("../lib/usageLogs");

async function requireModelAccess(req, res, next) {
  try {
    const model = req.body?.model;

    if (!model) {
      return res.status(400).json({
        error: {
          message: "Model is required",
          type: "invalid_request_error",
          code: "missing_model",
        },
      });
    }

    const allowedModels = req.apiToken?.allowed_models;

    if (allowedModels === null || allowedModels === undefined) {
      req.requestedModel = model;
      return next();
    }

    if (!Array.isArray(allowedModels)) {
      return res.status(500).json({
        error: {
          message: "Token model policy is invalid",
          type: "server_error",
          code: "invalid_allowed_models",
        },
      });
    }

    if (allowedModels.length === 0) {
      await writeUsageLog({
        tokenId: req.apiToken.id,
        userId: req.profile.id,
        model,
        status: "denied",
        errorCode: "model_not_allowed",
        errorMessage: "Token has empty model allowlist",
        locale: req.headers["accept-language"] || null,
      });
      return res.status(403).json({
        error: {
          message: "This token cannot access any models",
          type: "permission_error",
          code: "model_not_allowed",
        },
      });
    }

    if (!allowedModels.includes(model)) {
      await writeUsageLog({
        tokenId: req.apiToken.id,
        userId: req.profile.id,
        model,
        status: "denied",
        errorCode: "model_not_allowed",
        errorMessage: `Model ${model} not in allowlist`,
        locale: req.headers["accept-language"] || null,
      });
      return res.status(403).json({
        error: {
          message: `This token cannot access model ${model}`,
          type: "permission_error",
          code: "model_not_allowed",
        },
      });
    }

    req.requestedModel = model;
    next();
  } catch (error) {
    console.error("requireModelAccess error:", error);
    return res.status(500).json({
      error: {
        message: "Model access check failed",
        type: "server_error",
        code: "model_access_check_failed",
      },
    });
  }
}

module.exports = { requireModelAccess };
