const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

const ALLOWED_STATUS = new Set(["pending", "active", "suspended"]);
const ALLOWED_ROLE = new Set(["user", "admin", "sales", "affiliate"]);

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const plan = typeof req.query.plan === "string" ? req.query.plan.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role.trim() : "";
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, toInt(req.query.page_size, 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("profiles")
      .select("id, email, role, plan, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (email) q = q.ilike("email", `%${email}%`);
    if (status) q = q.eq("status", status);
    if (plan) q = q.eq("plan", plan);
    if (role) q = q.eq("role", role);

    q = q.range(from, to);

    const { data: rows, error, count } = await q;
    if (error) throw error;

    const userIds = (rows || []).map((r) => r.id);
    const tokenCountByUserId = new Map();
    const lastUsedByUserId = new Map();

    if (userIds.length) {
      const { data: tokenAgg, error: tokenErr } = await supabaseAdmin
        .from("api_tokens")
        .select("user_id, status")
        .in("user_id", userIds)
        .neq("status", "deleted");
      if (tokenErr) throw tokenErr;
      for (const t of tokenAgg || []) {
        tokenCountByUserId.set(t.user_id, (tokenCountByUserId.get(t.user_id) || 0) + 1);
      }

      const { data: logAgg, error: logErr } = await supabaseAdmin
        .from("usage_logs")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });
      if (logErr) throw logErr;
      for (const l of logAgg || []) {
        if (!lastUsedByUserId.has(l.user_id)) lastUsedByUserId.set(l.user_id, l.created_at);
      }
    }

    const data = (rows || []).map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      plan: r.plan,
      status: r.status,
      token_count: tokenCountByUserId.get(r.id) || 0,
      last_used_at: lastUsedByUserId.get(r.id) || null,
      created_at: r.created_at,
    }));

    return ok(res, data, {
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
      },
    });
  } catch (e) {
    console.error("admin.users GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch users");
  }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role, plan, status, created_at")
      .eq("id", id)
      .single();
    if (beforeErr || !before) return fail(res, 404, "not_found", "User not found");

    const patch = {};
    if (body.status !== undefined) {
      if (!ALLOWED_STATUS.has(String(body.status))) return fail(res, 400, "bad_request", "Invalid status");
      patch.status = String(body.status);
    }
    if (body.plan !== undefined) patch.plan = String(body.plan);
    if (body.role !== undefined) {
      if (!ALLOWED_ROLE.has(String(body.role))) return fail(res, 400, "bad_request", "Invalid role");
      patch.role = String(body.role);
    }

    if (!Object.keys(patch).length) return fail(res, 400, "bad_request", "No fields to update");

    // Safety: prevent self-demotion (minimal V1 guard)
    if (before.id === req.user.id && patch.role && patch.role !== "admin") {
      return fail(res, 400, "bad_request", "Cannot change your own role from admin");
    }

    const { data: after, error } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("id, email, role, plan, status, created_at")
      .single();
    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "user.update",
      targetType: "user",
      targetId: after.id,
      before,
      after,
    });

    return ok(res, { id: after.id, status: after.status, plan: after.plan, role: after.role });
  } catch (e) {
    console.error("admin.users PATCH error:", e);
    return fail(res, 500, "internal_error", "Failed to update user");
  }
});

module.exports = router;

