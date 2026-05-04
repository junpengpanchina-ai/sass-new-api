const express = require("express");
const crypto = require("crypto");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { tryRpcGrantAdminCredits } = require("../lib/creditRpc");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

const LEDGER_KIND_GRANT = "credit_add";

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const userId = typeof req.query.user_id === "string" ? req.query.user_id.trim() : "";
    const kind = typeof req.query.kind === "string" ? req.query.kind.trim() : "";

    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, toInt(req.query.page_size, 50)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("credit_ledger")
      .select(
        "id, created_at, user_id, token_id, order_id, kind, amount, credits, balance_after, reason, request_id, usage_log_id, metadata",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (userId) q = q.eq("user_id", userId);
    if (kind) q = q.eq("kind", kind);

    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    return ok(res, data || [], { pagination: { page, page_size: pageSize, total: count || 0 } });
  } catch (e) {
    console.error("admin.creditLedger GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch credit ledger");
  }
});

/**
 * 管理员手工加额度（写 credit_add + 调 profiles；Stripe 到账仍应以 Webhook 为准）。
 */
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    const amount = toInt(body.amount, NaN);
    const reason =
      typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : "admin_credit_grant";

    if (!userId) return fail(res, 400, "bad_request", "user_id is required");
    if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, "bad_request", "amount must be a positive integer");
    if (amount > 10_000_000) return fail(res, 400, "bad_request", "amount too large");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, credits_balance, credits_total_recharged")
      .eq("id", userId)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!profile) return fail(res, 404, "not_found", "User not found");

    const prevBalance = Number(profile.credits_balance ?? 0);
    const prevRecharged = Number(profile.credits_total_recharged ?? 0);
    const requestId = crypto.randomUUID();
    const metadata = {
      source: "admin",
      admin_user_id: req.user.id,
      admin_email: req.user.email || null,
    };

    const rpcTry = await tryRpcGrantAdminCredits({
      userId,
      amount,
      reason,
      requestId,
      metadata,
    });

    let insertedId;
    let nextBalance;

    if (rpcTry.fromRpc) {
      const r = rpcTry.result || {};
      insertedId = Number(r.credit_ledger_id);
      nextBalance = Number(r.credits_balance_after);
    } else {
      const nextBal = prevBalance + amount;
      const ledgerRow = {
        user_id: userId,
        order_id: null,
        token_id: null,
        kind: LEDGER_KIND_GRANT,
        amount,
        credits: amount,
        balance_after: nextBal,
        reason,
        request_id: requestId,
        usage_log_id: null,
        metadata,
      };

      const { data: inserted, error: insErr } = await supabaseAdmin.from("credit_ledger").insert(ledgerRow).select("id").single();

      if (insErr) throw insErr;
      insertedId = inserted?.id;

      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({
          credits_balance: nextBal,
          credits_total_recharged: prevRecharged + amount,
        })
        .eq("id", userId);

      if (updErr) {
        console.error("admin.creditLedger POST profile update failed after ledger insert", updErr);
        return fail(res, 500, "internal_error", "Ledger row created but profile update failed; reconcile manually", {
          credit_ledger_id: insertedId,
        });
      }
      nextBalance = nextBal;
    }

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "credit_ledger.admin_grant",
      targetType: "user",
      targetId: userId,
      before: { credits_balance: prevBalance },
      after: { credits_balance: nextBalance, amount, credit_ledger_id: insertedId, via_rpc: rpcTry.fromRpc },
    });

    return ok(res, {
      credit_ledger_id: insertedId,
      user_id: userId,
      credits_balance_before: prevBalance,
      credits_balance_after: nextBalance,
      amount,
      via_rpc: rpcTry.fromRpc,
    });
  } catch (e) {
    console.error("admin.creditLedger POST error:", e);
    return fail(res, 500, "internal_error", "Failed to grant credits");
  }
});

module.exports = router;
