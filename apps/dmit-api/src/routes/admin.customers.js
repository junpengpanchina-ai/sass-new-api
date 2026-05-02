const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

const STATUS = new Set(["new", "contacted", "paid", "delivered", "invalid"]);

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function isEmail(s) {
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const qText = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const source = typeof req.query.source === "string" ? req.query.source.trim() : "";
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, toInt(req.query.page_size, 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("customers")
      .select("id, email, name, company, telegram, source, status, note, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (qText) {
      const escaped = qText.replace(/,/g, "");
      query = query.or(`email.ilike.%${escaped}%,name.ilike.%${escaped}%,telegram.ilike.%${escaped}%`);
    }
    if (status) query = query.eq("status", status);
    if (source) query = query.eq("source", source);

    query = query.range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;

    return ok(res, data || [], { pagination: { page, page_size: pageSize, total: count || 0 } });
  } catch (e) {
    console.error("admin.customers GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch customers");
  }
});

router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || "").trim();
    if (!isEmail(email)) return fail(res, 400, "bad_request", "email is invalid");

    const status = body.status === undefined ? "new" : String(body.status);
    if (!STATUS.has(status)) return fail(res, 400, "bad_request", "status invalid");

    const payload = {
      email,
      name: body.name === undefined ? null : (body.name === null ? null : String(body.name)),
      company: body.company === undefined ? null : (body.company === null ? null : String(body.company)),
      telegram: body.telegram === undefined ? null : (body.telegram === null ? null : String(body.telegram)),
      source: body.source === undefined ? "unknown" : String(body.source),
      status,
      note: body.note === undefined ? null : (body.note === null ? null : String(body.note)),
    };

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert(payload)
      .select("id, email, name, company, telegram, source, status, note, created_at, updated_at")
      .single();

    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "customer.create",
      targetType: "customer",
      targetId: String(data.id),
      before: null,
      after: data,
    });

    return ok(res, data);
  } catch (e) {
    console.error("admin.customers POST error:", e);
    return fail(res, 500, "internal_error", "Failed to create customer");
  }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("customers")
      .select("id, email, name, company, telegram, source, status, note, created_at, updated_at")
      .eq("id", id)
      .single();
    if (beforeErr || !before) return fail(res, 404, "not_found", "Customer not found");

    const patch = {};
    if (body.status !== undefined) {
      const s = String(body.status);
      if (!STATUS.has(s)) return fail(res, 400, "bad_request", "status invalid");
      patch.status = s;
    }
    if (body.note !== undefined) patch.note = body.note === null ? null : String(body.note);
    if (body.company !== undefined) patch.company = body.company === null ? null : String(body.company);
    if (body.telegram !== undefined) patch.telegram = body.telegram === null ? null : String(body.telegram);
    if (body.name !== undefined) patch.name = body.name === null ? null : String(body.name);
    if (body.source !== undefined) patch.source = String(body.source);

    if (!Object.keys(patch).length) return fail(res, 400, "bad_request", "No fields to update");

    const { data: after, error } = await supabaseAdmin
      .from("customers")
      .update(patch)
      .eq("id", id)
      .select("id, email, name, company, telegram, source, status, note, created_at, updated_at")
      .single();
    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "customer.update",
      targetType: "customer",
      targetId: String(after.id),
      before,
      after,
    });

    return ok(res, after);
  } catch (e) {
    console.error("admin.customers PATCH error:", e);
    return fail(res, 500, "internal_error", "Failed to update customer");
  }
});

module.exports = router;

