const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { generatePlainToken, hashToken } = require("../lib/token");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

const ALLOWED_STATUS = new Set(["active", "disabled", "deleted"]);

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, toInt(req.query.page_size, 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Filter by email requires a join; we do it in two steps (V1 ok).
    let userIds = null;
    if (email) {
      const { data: users, error: userErr } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact" })
        .ilike("email", `%${email}%`)
        .limit(500);
      if (userErr) throw userErr;
      userIds = (users || []).map((u) => u.id);
      if (!userIds.length) {
        return ok(res, [], { pagination: { page, page_size: pageSize, total: 0 } });
      }
    }

    let q = supabaseAdmin
      .from("api_tokens")
      .select("id, user_id, name, status, allowed_models, last_used_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);
    if (userIds) q = q.in("user_id", userIds);

    q = q.range(from, to);
    const { data: tokens, error, count } = await q;
    if (error) throw error;

    const ids = Array.from(new Set((tokens || []).map((t) => t.user_id)));
    const emailByUserId = new Map();
    if (ids.length) {
      const { data: profiles, error: pErr } = await supabaseAdmin.from("profiles").select("id, email").in("id", ids);
      if (pErr) throw pErr;
      for (const p of profiles || []) emailByUserId.set(p.id, p.email);
    }

    const data = (tokens || []).map((t) => ({
      id: t.id,
      user_id: t.user_id,
      user_email: emailByUserId.get(t.user_id) || null,
      name: t.name,
      status: t.status,
      allowed_models: t.allowed_models,
      last_used_at: t.last_used_at,
      created_at: t.created_at,
    }));

    return ok(res, data, { pagination: { page, page_size: pageSize, total: count || 0 } });
  } catch (e) {
    console.error("admin.tokens GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch tokens");
  }
});

router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { user_id, name, allowed_models = null } = req.body || {};
    if (!user_id || !String(user_id).trim()) return fail(res, 400, "bad_request", "user_id is required");
    if (!name || !String(name).trim()) return fail(res, 400, "bad_request", "name is required");

    const { data: user, error: userErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", String(user_id))
      .single();
    if (userErr || !user) return fail(res, 404, "not_found", "User not found");

    const plainToken = generatePlainToken().replace(/^tsk_/, "tk_live_");
    const tokenHash = hashToken(plainToken);

    const payload = {
      user_id: user.id,
      name: String(name).trim(),
      token_hash: tokenHash,
      status: "active",
      allowed_models,
    };

    const { data, error } = await supabaseAdmin
      .from("api_tokens")
      .insert(payload)
      .select("id, user_id, name, status, allowed_models, created_at")
      .single();

    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "token.create",
      targetType: "token",
      targetId: data.id,
      before: null,
      after: data,
    });

    return ok(res, data, { plain_token: plainToken });
  } catch (e) {
    console.error("admin.tokens POST error:", e);
    return fail(res, 500, "internal_error", "Failed to create token");
  }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("api_tokens")
      .select("id, user_id, name, status, allowed_models, last_used_at, created_at")
      .eq("id", id)
      .single();
    if (beforeErr || !before) return fail(res, 404, "not_found", "Token not found");

    const patch = {};
    if (body.status !== undefined) {
      const s = String(body.status);
      if (!ALLOWED_STATUS.has(s) || s === "deleted") return fail(res, 400, "bad_request", "Invalid status");
      patch.status = s;
    }
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.allowed_models !== undefined) patch.allowed_models = body.allowed_models;

    if (!Object.keys(patch).length) return fail(res, 400, "bad_request", "No fields to update");

    const { data: after, error } = await supabaseAdmin
      .from("api_tokens")
      .update(patch)
      .eq("id", id)
      .select("id, user_id, name, status, allowed_models, last_used_at, created_at")
      .single();
    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "token.update",
      targetType: "token",
      targetId: after.id,
      before,
      after,
    });

    return ok(res, after);
  } catch (e) {
    console.error("admin.tokens PATCH error:", e);
    return fail(res, 500, "internal_error", "Failed to update token");
  }
});

router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("api_tokens")
      .select("id, user_id, name, status, allowed_models, last_used_at, created_at")
      .eq("id", id)
      .single();
    if (beforeErr || !before) return fail(res, 404, "not_found", "Token not found");

    const { data: after, error } = await supabaseAdmin
      .from("api_tokens")
      .update({ status: "deleted" })
      .eq("id", id)
      .select("id, status")
      .single();
    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "token.delete",
      targetType: "token",
      targetId: id,
      before,
      after,
    });

    return ok(res, after);
  } catch (e) {
    console.error("admin.tokens DELETE error:", e);
    return fail(res, 500, "internal_error", "Failed to delete token");
  }
});

router.post("/:id/reset", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: oldToken, error: oldErr } = await supabaseAdmin
      .from("api_tokens")
      .select("id, user_id, name, status, allowed_models")
      .eq("id", id)
      .single();
    if (oldErr || !oldToken) return fail(res, 404, "not_found", "Token not found");

    // V1 strategy: delete old, create new (audit clarity)
    const { error: delErr } = await supabaseAdmin.from("api_tokens").update({ status: "deleted" }).eq("id", id);
    if (delErr) throw delErr;

    const plainToken = generatePlainToken().replace(/^tsk_/, "tk_live_");
    const tokenHash = hashToken(plainToken);
    const newName = `${oldToken.name}-reset`;

    const { data: created, error: createErr } = await supabaseAdmin
      .from("api_tokens")
      .insert({
        user_id: oldToken.user_id,
        name: newName,
        token_hash: tokenHash,
        status: "active",
        allowed_models: oldToken.allowed_models,
      })
      .select("id, user_id, name, status, allowed_models, created_at")
      .single();
    if (createErr) throw createErr;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "token.reset",
      targetType: "token",
      targetId: created.id,
      before: { old_token_id: oldToken.id },
      after: { new_token_id: created.id, user_id: created.user_id },
    });

    return ok(
      res,
      { old_token_id: oldToken.id, new_token_id: created.id, status: "active" },
      { plain_token: plainToken }
    );
  } catch (e) {
    console.error("admin.tokens RESET error:", e);
    return fail(res, 500, "internal_error", "Failed to reset token");
  }
});

module.exports = router;

