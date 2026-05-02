const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

const CURRENCIES = new Set(["USD", "CNY"]);
const CODE_RE = /^[a-z0-9-]+$/;

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("id, code, name, description, currency, price_amount, credit_amount, active, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    return ok(res, data || []);
  } catch (e) {
    console.error("admin.plans GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch plans");
  }
});

router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { code, name, description = null, currency, price_amount, credit_amount, active = true, sort_order = 0 } = req.body || {};

    if (!code || !String(code).trim()) return fail(res, 400, "bad_request", "code is required");
    if (!CODE_RE.test(String(code))) return fail(res, 400, "bad_request", "code format invalid (lowercase letters, numbers, dash)");
    if (!name || !String(name).trim()) return fail(res, 400, "bad_request", "name is required");
    if (!currency || !CURRENCIES.has(String(currency))) return fail(res, 400, "bad_request", "currency invalid (USD/CNY)");

    const price = Number(price_amount);
    const credit = Number(credit_amount);
    const sort = Number(sort_order);

    if (!Number.isFinite(price) || price < 0) return fail(res, 400, "bad_request", "price_amount must be >= 0");
    if (!Number.isFinite(credit) || credit < 0) return fail(res, 400, "bad_request", "credit_amount must be >= 0");
    if (!Number.isFinite(sort)) return fail(res, 400, "bad_request", "sort_order must be a number");

    const payload = {
      code: String(code).trim(),
      name: String(name).trim(),
      description: description === null ? null : String(description),
      currency: String(currency),
      price_amount: Math.trunc(price),
      credit_amount: Math.trunc(credit),
      active: Boolean(active),
      sort_order: Math.trunc(sort),
    };

    const { data, error } = await supabaseAdmin
      .from("plans")
      .insert(payload)
      .select("id, code, name, description, currency, price_amount, credit_amount, active, sort_order, created_at")
      .single();

    if (error) {
      const msg = error.code === "23505" ? "code already exists" : "Failed to create plan";
      return fail(res, 400, "bad_request", msg, { supabase: error.message });
    }

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "plan.create",
      targetType: "plan",
      targetId: String(data.id),
      before: null,
      after: data,
    });

    return ok(res, data);
  } catch (e) {
    console.error("admin.plans POST error:", e);
    return fail(res, 500, "internal_error", "Failed to create plan");
  }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return fail(res, 400, "bad_request", "Invalid id");

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("plans")
      .select("id, code, name, description, currency, price_amount, credit_amount, active, sort_order, created_at")
      .eq("id", id)
      .single();

    if (beforeErr || !before) return fail(res, 404, "not_found", "Plan not found");

    const body = req.body || {};
    if ("code" in body) return fail(res, 400, "bad_request", "code is immutable in V1");

    const patch = {};
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.description !== undefined) patch.description = body.description === null ? null : String(body.description);
    if (body.currency !== undefined) {
      if (!CURRENCIES.has(String(body.currency))) return fail(res, 400, "bad_request", "currency invalid (USD/CNY)");
      patch.currency = String(body.currency);
    }
    if (body.price_amount !== undefined) {
      const v = Number(body.price_amount);
      if (!Number.isFinite(v) || v < 0) return fail(res, 400, "bad_request", "price_amount must be >= 0");
      patch.price_amount = Math.trunc(v);
    }
    if (body.credit_amount !== undefined) {
      const v = Number(body.credit_amount);
      if (!Number.isFinite(v) || v < 0) return fail(res, 400, "bad_request", "credit_amount must be >= 0");
      patch.credit_amount = Math.trunc(v);
    }
    if (body.active !== undefined) patch.active = Boolean(body.active);
    if (body.sort_order !== undefined) {
      const v = Number(body.sort_order);
      if (!Number.isFinite(v)) return fail(res, 400, "bad_request", "sort_order must be a number");
      patch.sort_order = Math.trunc(v);
    }

    const { data: after, error } = await supabaseAdmin
      .from("plans")
      .update(patch)
      .eq("id", id)
      .select("id, code, name, description, currency, price_amount, credit_amount, active, sort_order, created_at")
      .single();

    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "plan.update",
      targetType: "plan",
      targetId: String(after.id),
      before,
      after,
    });

    return ok(res, after);
  } catch (e) {
    console.error("admin.plans PATCH error:", e);
    return fail(res, 500, "internal_error", "Failed to update plan");
  }
});

module.exports = router;

