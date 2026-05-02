const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const tokenId = typeof req.query.token_id === "string" ? req.query.token_id.trim() : "";
    const userId = typeof req.query.user_id === "string" ? req.query.user_id.trim() : "";
    const model = typeof req.query.model === "string" ? req.query.model.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const upstreamName = typeof req.query.upstream_name === "string" ? req.query.upstream_name.trim() : "";

    const fromTs = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toTs = typeof req.query.to === "string" ? req.query.to.trim() : "";

    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, toInt(req.query.page_size, 50)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("usage_logs")
      .select(
        "id, created_at, user_id, token_id, model, upstream_name, status, http_status, latency_ms, error_code, error_message, request_id",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (tokenId) q = q.eq("token_id", tokenId);
    if (userId) q = q.eq("user_id", userId);
    if (model) q = q.eq("model", model);
    if (status) q = q.eq("status", status);
    if (upstreamName) q = q.eq("upstream_name", upstreamName);

    if (fromTs) q = q.gte("created_at", fromTs);
    if (toTs) q = q.lte("created_at", toTs);

    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    return ok(res, data || [], { pagination: { page, page_size: pageSize, total: count || 0 } });
  } catch (e) {
    console.error("admin.usageLogs GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch usage logs");
  }
});

module.exports = router;

