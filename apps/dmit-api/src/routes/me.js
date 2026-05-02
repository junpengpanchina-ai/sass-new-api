const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { supabaseAdmin } = require("../lib/supabase");

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
  return res.json({
    ok: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      profile: req.user.profile,
    },
  });
});

router.patch("/", authMiddleware, async (req, res) => {
  try {
    const { company, telegram, locale, country, timezone } = req.body;

    const payload = {
      company: company !== undefined ? company : req.user.profile.company,
      telegram: telegram !== undefined ? telegram : req.user.profile.telegram,
      locale: locale !== undefined ? locale : req.user.profile.locale,
      country: country !== undefined ? country : req.user.profile.country,
      timezone: timezone !== undefined ? timezone : req.user.profile.timezone,
    };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("id", req.user.id)
      .select("*")
      .single();

    if (error) throw error;

    return res.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("patch /api/me error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

module.exports = router;
