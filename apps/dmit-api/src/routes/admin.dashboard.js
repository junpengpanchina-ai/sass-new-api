const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

async function countExact(table, extraQueryFn = null) {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (extraQueryFn) q = extraQueryFn(q);
  const { error, count } = await q;
  if (error) throw error;
  return count || 0;
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [
      productsTotal,
      productsActive,
      customersTotal,
      customersNew,
      ordersTotal,
      ordersPaid,
      ordersPendingDelivery,
      usage24h,
      audit24h,
    ] = await Promise.all([
      countExact("products"),
      countExact("products", (q) => q.eq("active", true)),
      countExact("customers"),
      countExact("customers", (q) => q.eq("status", "new")),
      countExact("ops_orders"),
      countExact("ops_orders", (q) => q.eq("payment_status", "paid")),
      countExact("ops_orders", (q) => q.eq("payment_status", "paid").eq("delivery_status", "pending")),
      countExact("usage_logs", (q) => q.gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())),
      countExact("admin_audit_logs", (q) => q.gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())),
    ]);

    return ok(res, {
      products: { total: productsTotal, active: productsActive },
      customers: { total: customersTotal, new: customersNew },
      orders: { total: ordersTotal, paid: ordersPaid, pending_delivery: ordersPendingDelivery },
      activity_24h: { usage_logs: usage24h, audit_logs: audit24h },
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("admin.dashboard GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch dashboard");
  }
});

module.exports = router;

