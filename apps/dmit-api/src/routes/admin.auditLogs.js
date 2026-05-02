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
    const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
    const targetType = typeof req.query.target_type === "string" ? req.query.target_type.trim() : "";
    const targetId = typeof req.query.target_id === "string" ? req.query.target_id.trim() : "";
    const adminUserId = typeof req.query.admin_user_id === "string" ? req.query.admin_user_id.trim() : "";

    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, toInt(req.query.page_size, 50)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("admin_audit_logs")
      .select("id, created_at, admin_user_id, action, target_type, target_id, before, after, ip, user_agent", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (action) q = q.eq("action", action);
    if (targetType) q = q.eq("target_type", targetType);
    if (targetId) q = q.eq("target_id", targetId);
    if (adminUserId) q = q.eq("admin_user_id", adminUserId);

    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    return ok(res, data || [], { pagination: { page, page_size: pageSize, total: count || 0 } });
  } catch (e) {
    console.error("admin.auditLogs GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch audit logs");
  }
});

module.exports = router;

