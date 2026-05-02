const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { supabaseAdmin } = require("../lib/supabase");

const router = express.Router();

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { plan_code } = req.body;

    if (!plan_code) {
      return res.status(400).json({
        ok: false,
        message: "plan_code is required",
      });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("code", plan_code)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      return res.status(404).json({
        ok: false,
        message: "Plan not found",
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: req.user.id,
        plan_code: plan.code,
        provider: "stripe",
        currency: plan.currency,
        amount_total: plan.price_amount,
        status: "created",
      })
      .select("*")
      .single();

    if (orderError) throw orderError;

    return res.json({
      ok: true,
      message: "Checkout placeholder created",
      data: {
        order,
        next_step: "Connect Stripe Checkout session here",
      },
    });
  } catch (error) {
    console.error("post /api/checkout/create error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to create checkout",
      error: error.message,
    });
  }
});

module.exports = router;
