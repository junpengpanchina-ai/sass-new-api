const express = require("express");
const { supabaseAdmin } = require("../lib/supabase");

const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("id, code, name")
      .limit(1);

    if (error) {
      throw error;
    }

    return res.json({
      ok: true,
      service: "dmit-api",
      supabase: "connected",
      plans_sample_count: Array.isArray(data) ? data.length : 0,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("system health error:", error);

    return res.status(500).json({
      ok: false,
      service: "dmit-api",
      supabase: "error",
      error: error.message,
      time: new Date().toISOString(),
    });
  }
});

module.exports = router;
