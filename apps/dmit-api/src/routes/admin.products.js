const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

const CURRENCIES = new Set(["USD", "CNY"]);
const CATEGORIES = new Set(["text", "image", "video"]);
const CODE_RE = /^[a-z0-9-]+$/;

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toBoolQuery(v) {
  if (v === undefined) return null;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return null;
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const qText = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const active = toBoolQuery(req.query.active);
    const featured = toBoolQuery(req.query.featured);
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, toInt(req.query.page_size, 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("products")
      .select(
        "id, code, name, upstream_name, upstream_model, category, sell_price, cost_price, currency, active, featured, sort_order, description, created_at, updated_at",
        { count: "exact" }
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (qText) {
      // supabase-js or() syntax
      const escaped = qText.replace(/,/g, "");
      query = query.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
    }
    if (category) query = query.eq("category", category);
    if (active !== null) query = query.eq("active", active);
    if (featured !== null) query = query.eq("featured", featured);

    query = query.range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;

    return ok(res, data || [], { pagination: { page, page_size: pageSize, total: count || 0 } });
  } catch (e) {
    console.error("admin.products GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch products");
  }
});

router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const code = String(body.code || "").trim();
    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    const currency = String(body.currency || "").trim();

    if (!code) return fail(res, 400, "bad_request", "code is required");
    if (!CODE_RE.test(code)) return fail(res, 400, "bad_request", "code format invalid (lowercase letters, numbers, dash)");
    if (!name) return fail(res, 400, "bad_request", "name is required");
    if (!CATEGORIES.has(category)) return fail(res, 400, "bad_request", "category invalid (text/image/video)");
    if (!CURRENCIES.has(currency)) return fail(res, 400, "bad_request", "currency invalid (USD/CNY)");

    const sellPrice = Number(body.sell_price);
    const costPrice = body.cost_price === null || body.cost_price === undefined ? null : Number(body.cost_price);
    const sortOrder = body.sort_order === undefined ? 0 : Number(body.sort_order);

    if (!Number.isFinite(sellPrice) || sellPrice < 0) return fail(res, 400, "bad_request", "sell_price must be >= 0");
    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) return fail(res, 400, "bad_request", "cost_price must be >= 0");
    if (!Number.isFinite(sortOrder)) return fail(res, 400, "bad_request", "sort_order must be a number");

    const payload = {
      code,
      name,
      upstream_name: body.upstream_name !== undefined ? String(body.upstream_name) : null,
      upstream_model: body.upstream_model !== undefined ? String(body.upstream_model) : null,
      category,
      sell_price: Math.trunc(sellPrice),
      cost_price: costPrice === null ? null : Math.trunc(costPrice),
      currency,
      active: body.active === undefined ? true : Boolean(body.active),
      featured: body.featured === undefined ? false : Boolean(body.featured),
      sort_order: Math.trunc(sortOrder),
      description: body.description !== undefined ? (body.description === null ? null : String(body.description)) : null,
    };

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert(payload)
      .select(
        "id, code, name, upstream_name, upstream_model, category, sell_price, cost_price, currency, active, featured, sort_order, description, created_at, updated_at"
      )
      .single();

    if (error) {
      const msg = error.code === "23505" ? "code already exists" : "Failed to create product";
      return fail(res, 400, "bad_request", msg, { supabase: error.message });
    }

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "product.create",
      targetType: "product",
      targetId: data.id,
      before: null,
      after: data,
    });

    return ok(res, data);
  } catch (e) {
    console.error("admin.products POST error:", e);
    return fail(res, 500, "internal_error", "Failed to create product");
  }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    if ("code" in body) return fail(res, 400, "bad_request", "code is immutable in V1");

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("products")
      .select(
        "id, code, name, upstream_name, upstream_model, category, sell_price, cost_price, currency, active, featured, sort_order, description, created_at, updated_at"
      )
      .eq("id", id)
      .single();
    if (beforeErr || !before) return fail(res, 404, "not_found", "Product not found");

    const patch = {};
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.upstream_name !== undefined) patch.upstream_name = body.upstream_name === null ? null : String(body.upstream_name);
    if (body.upstream_model !== undefined) patch.upstream_model = body.upstream_model === null ? null : String(body.upstream_model);
    if (body.category !== undefined) {
      const c = String(body.category);
      if (!CATEGORIES.has(c)) return fail(res, 400, "bad_request", "category invalid (text/image/video)");
      patch.category = c;
    }
    if (body.currency !== undefined) {
      const cur = String(body.currency);
      if (!CURRENCIES.has(cur)) return fail(res, 400, "bad_request", "currency invalid (USD/CNY)");
      patch.currency = cur;
    }
    if (body.sell_price !== undefined) {
      const v = Number(body.sell_price);
      if (!Number.isFinite(v) || v < 0) return fail(res, 400, "bad_request", "sell_price must be >= 0");
      patch.sell_price = Math.trunc(v);
    }
    if (body.cost_price !== undefined) {
      if (body.cost_price === null) {
        patch.cost_price = null;
      } else {
        const v = Number(body.cost_price);
        if (!Number.isFinite(v) || v < 0) return fail(res, 400, "bad_request", "cost_price must be >= 0");
        patch.cost_price = Math.trunc(v);
      }
    }
    if (body.active !== undefined) patch.active = Boolean(body.active);
    if (body.featured !== undefined) patch.featured = Boolean(body.featured);
    if (body.sort_order !== undefined) {
      const v = Number(body.sort_order);
      if (!Number.isFinite(v)) return fail(res, 400, "bad_request", "sort_order must be a number");
      patch.sort_order = Math.trunc(v);
    }
    if (body.description !== undefined) patch.description = body.description === null ? null : String(body.description);

    if (!Object.keys(patch).length) return fail(res, 400, "bad_request", "No fields to update");

    const { data: after, error } = await supabaseAdmin
      .from("products")
      .update(patch)
      .eq("id", id)
      .select(
        "id, code, name, upstream_name, upstream_model, category, sell_price, cost_price, currency, active, featured, sort_order, description, created_at, updated_at"
      )
      .single();
    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "product.update",
      targetType: "product",
      targetId: after.id,
      before,
      after,
    });

    return ok(res, after);
  } catch (e) {
    console.error("admin.products PATCH error:", e);
    return fail(res, 500, "internal_error", "Failed to update product");
  }
});

module.exports = router;

