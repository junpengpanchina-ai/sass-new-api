const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

const PAYMENT = new Set(["created", "paid", "failed", "cancelled"]);
const DELIVERY = new Set(["pending", "delivered", "cancelled"]);
const CURRENCIES = new Set(["USD", "CNY"]);

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const qText = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const paymentStatus = typeof req.query.payment_status === "string" ? req.query.payment_status.trim() : "";
    const deliveryStatus = typeof req.query.delivery_status === "string" ? req.query.delivery_status.trim() : "";
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, toInt(req.query.page_size, 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // V1 join strategy: load orders page -> hydrate customers/products -> filter q in memory (page-level).
    let query = supabaseAdmin
      .from("ops_orders")
      .select(
        "id, customer_id, product_id, amount, currency, payment_status, delivery_status, delivery_content, note, created_at, updated_at, paid_at, delivered_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (deliveryStatus) query = query.eq("delivery_status", deliveryStatus);

    query = query.range(from, to);
    const { data: orders, error, count } = await query;
    if (error) throw error;

    const customerIds = Array.from(new Set((orders || []).map((o) => o.customer_id).filter(Boolean)));
    const productIds = Array.from(new Set((orders || []).map((o) => o.product_id).filter(Boolean)));

    const emailByCustomerId = new Map();
    const productById = new Map();

    if (customerIds.length) {
      const { data: customers, error: cErr } = await supabaseAdmin.from("customers").select("id, email").in("id", customerIds);
      if (cErr) throw cErr;
      for (const c of customers || []) emailByCustomerId.set(c.id, c.email);
    }

    if (productIds.length) {
      const { data: products, error: pErr } = await supabaseAdmin
        .from("products")
        .select("id, code, name")
        .in("id", productIds);
      if (pErr) throw pErr;
      for (const p of products || []) productById.set(p.id, p);
    }

    let data = (orders || []).map((o) => {
      const p = o.product_id ? productById.get(o.product_id) : null;
      return {
        id: o.id,
        customer_id: o.customer_id,
        customer_email: o.customer_id ? emailByCustomerId.get(o.customer_id) || null : null,
        product_id: o.product_id,
        product_code: p?.code || null,
        product_name: p?.name || null,
        amount: o.amount,
        currency: o.currency,
        payment_status: o.payment_status,
        delivery_status: o.delivery_status,
        delivery_content: o.delivery_content,
        note: o.note,
        created_at: o.created_at,
        paid_at: o.paid_at,
        delivered_at: o.delivered_at,
      };
    });

    if (qText) {
      const q = qText.toLowerCase();
      data = data.filter((row) => {
        const hay = [
          row.customer_email || "",
          row.product_code || "",
          row.product_name || "",
          String(row.id),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return ok(res, data, { pagination: { page, page_size: pageSize, total: count || 0 } });
  } catch (e) {
    console.error("admin.orders GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch orders");
  }
});

router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const customerId = Number(body.customer_id);
    const productId = String(body.product_id || "").trim();
    const amount = Number(body.amount);
    const currency = String(body.currency || "").trim();

    if (!Number.isFinite(customerId)) return fail(res, 400, "bad_request", "customer_id is required");
    if (!productId) return fail(res, 400, "bad_request", "product_id is required");
    if (!Number.isFinite(amount) || amount < 0) return fail(res, 400, "bad_request", "amount must be >= 0");
    if (!CURRENCIES.has(currency)) return fail(res, 400, "bad_request", "currency invalid (USD/CNY)");

    const paymentStatus = body.payment_status === undefined ? "created" : String(body.payment_status);
    const deliveryStatus = body.delivery_status === undefined ? "pending" : String(body.delivery_status);
    if (!PAYMENT.has(paymentStatus)) return fail(res, 400, "bad_request", "payment_status invalid");
    if (!DELIVERY.has(deliveryStatus)) return fail(res, 400, "bad_request", "delivery_status invalid");

    // validate FK exists
    const { data: c, error: cErr } = await supabaseAdmin.from("customers").select("id, email").eq("id", customerId).single();
    if (cErr || !c) return fail(res, 404, "not_found", "Customer not found");
    const { data: p, error: pErr } = await supabaseAdmin.from("products").select("id, code, name").eq("id", productId).single();
    if (pErr || !p) return fail(res, 404, "not_found", "Product not found");

    const payload = {
      customer_id: c.id,
      product_id: p.id,
      amount: Math.trunc(amount),
      currency,
      payment_status: paymentStatus,
      delivery_status: deliveryStatus,
      delivery_content: body.delivery_content === undefined ? null : (body.delivery_content === null ? null : String(body.delivery_content)),
      note: body.note === undefined ? null : (body.note === null ? null : String(body.note)),
      paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
      delivered_at: deliveryStatus === "delivered" ? new Date().toISOString() : null,
    };

    const { data: created, error } = await supabaseAdmin
      .from("ops_orders")
      .insert(payload)
      .select(
        "id, customer_id, product_id, amount, currency, payment_status, delivery_status, delivery_content, note, created_at, paid_at, delivered_at"
      )
      .single();
    if (error) throw error;

    const responseRow = {
      ...created,
      customer_email: c.email,
      product_code: p.code,
      product_name: p.name,
    };

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "order.create",
      targetType: "ops_order",
      targetId: String(created.id),
      before: null,
      after: responseRow,
    });

    return ok(res, responseRow);
  } catch (e) {
    console.error("admin.orders POST error:", e);
    return fail(res, 500, "internal_error", "Failed to create order");
  }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return fail(res, 400, "bad_request", "Invalid id");

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("ops_orders")
      .select(
        "id, customer_id, product_id, amount, currency, payment_status, delivery_status, delivery_content, note, created_at, updated_at, paid_at, delivered_at"
      )
      .eq("id", id)
      .single();
    if (beforeErr || !before) return fail(res, 404, "not_found", "Order not found");

    const body = req.body || {};
    const patch = {};

    if (body.payment_status !== undefined) {
      const s = String(body.payment_status);
      if (!PAYMENT.has(s)) return fail(res, 400, "bad_request", "payment_status invalid");
      patch.payment_status = s;
      if (s === "paid" && !before.paid_at) patch.paid_at = new Date().toISOString();
      if (s !== "paid") {
        // keep existing paid_at; do not auto-clear
      }
    }

    if (body.delivery_status !== undefined) {
      const s = String(body.delivery_status);
      if (!DELIVERY.has(s)) return fail(res, 400, "bad_request", "delivery_status invalid");
      patch.delivery_status = s;
      if (s === "delivered" && !before.delivered_at) patch.delivered_at = new Date().toISOString();
    }

    if (body.delivery_content !== undefined) patch.delivery_content = body.delivery_content === null ? null : String(body.delivery_content);
    if (body.note !== undefined) patch.note = body.note === null ? null : String(body.note);

    if (!Object.keys(patch).length) return fail(res, 400, "bad_request", "No fields to update");

    const { data: after, error } = await supabaseAdmin
      .from("ops_orders")
      .update(patch)
      .eq("id", id)
      .select(
        "id, customer_id, product_id, amount, currency, payment_status, delivery_status, delivery_content, note, created_at, paid_at, delivered_at"
      )
      .single();
    if (error) throw error;

    // hydrate for response/audit
    const { data: c } = await supabaseAdmin.from("customers").select("id, email").eq("id", after.customer_id).single();
    const { data: p } = await supabaseAdmin.from("products").select("id, code, name").eq("id", after.product_id).single();

    const responseRow = {
      ...after,
      customer_email: c?.email || null,
      product_code: p?.code || null,
      product_name: p?.name || null,
    };

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "order.update",
      targetType: "ops_order",
      targetId: String(after.id),
      before,
      after: responseRow,
    });

    return ok(res, responseRow);
  } catch (e) {
    console.error("admin.orders PATCH error:", e);
    return fail(res, 500, "internal_error", "Failed to update order");
  }
});

module.exports = router;

