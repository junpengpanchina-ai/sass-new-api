const { supabaseAdmin } = require("../lib/supabase");
const { hashToken } = require("../lib/token");
const { writeUsageLog } = require("../lib/usageLogs");

async function apiTokenAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const plainToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!plainToken) {
      return res.status(401).json({
        error: {
          message: "Missing API token",
          type: "auth_error",
          code: "missing_token",
        },
      });
    }

    const tokenHash = hashToken(plainToken);

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("api_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(401).json({
        error: {
          message: "Invalid API token",
          type: "auth_error",
          code: "invalid_token",
        },
      });
    }

    if (tokenRow.status !== "active") {
      const { data: profileRow } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", tokenRow.user_id)
        .maybeSingle();
      await writeUsageLog({
        tokenId: tokenRow.id,
        userId: profileRow?.id || tokenRow.user_id,
        model: req.body?.model || "unknown",
        status: "denied",
        errorCode: "token_disabled",
        errorMessage: "API token is disabled",
        locale: req.headers["accept-language"] || null,
      });
      return res.status(403).json({
        error: {
          message: "API token is disabled",
          type: "permission_error",
          code: "token_disabled",
        },
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", tokenRow.user_id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        error: {
          message: "Token owner profile not found",
          type: "permission_error",
          code: "profile_not_found",
        },
      });
    }

    if (profile.status !== "active") {
      await writeUsageLog({
        tokenId: tokenRow.id,
        userId: profile.id,
        model: req.body?.model || "unknown",
        status: "denied",
        errorCode: "user_not_active",
        errorMessage: `User status is ${profile.status}`,
        locale: req.headers["accept-language"] || null,
      });
      return res.status(403).json({
        error: {
          message: "User is not active",
          type: "permission_error",
          code: "user_not_active",
        },
      });
    }

    req.apiToken = tokenRow;
    req.profile = profile;

    next();
  } catch (error) {
    console.error("apiTokenAuth error:", error);
    return res.status(500).json({
      error: {
        message: "Authentication failed",
        type: "server_error",
        code: "auth_middleware_failed",
      },
    });
  }
}

module.exports = { apiTokenAuth };
