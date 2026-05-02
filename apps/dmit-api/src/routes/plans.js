const express = require("express");
const { supabaseAdmin } = require("../lib/supabase");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select(
        "id, code, name, description, currency, price_amount, credit_amount, active, sort_order"
      )
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("plans route error:", error);

    return res.status(500).json({
      ok: false,
      message: "Failed to fetch plans",
      error: error.message,
    });
  }
});

module.exports = router;
