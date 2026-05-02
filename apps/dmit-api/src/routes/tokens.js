const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { requireActiveUser } = require("../middleware/requireActiveUser");
const { supabaseAdmin } = require("../lib/supabase");
const { generatePlainToken, hashToken } = require("../lib/token");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("api_tokens")
      .select("id, name, status, allowed_models, created_at, last_used_at")
      .eq("user_id", req.user.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("get /api/tokens error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch tokens",
      error: error.message,
    });
  }
});

router.post("/", authMiddleware, requireActiveUser, async (req, res) => {
  try {
    const { name, allowed_models = null } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        ok: false,
        message: "Token name is required",
      });
    }

    const plainToken = generatePlainToken();
    const tokenHash = hashToken(plainToken);

    const { data, error } = await supabaseAdmin
      .from("api_tokens")
      .insert({
        user_id: req.user.id,
        name: String(name).trim(),
        token_hash: tokenHash,
        status: "active",
        allowed_models,
      })
      .select("id, name, status, allowed_models, created_at")
      .single();

    if (error) throw error;

    return res.json({
      ok: true,
      data: {
        ...data,
        plain_token: plainToken,
      },
    });
  } catch (error) {
    console.error("post /api/tokens error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to create token",
      error: error.message,
    });
  }
});

router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid status",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("api_tokens")
      .update({ status })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id, name, status, allowed_models, created_at, last_used_at")
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: "Token not found",
      });
    }

    return res.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("patch /api/tokens/:id error:", error);
    const status = error.code === "PGRST116" ? 404 : 500;
    return res.status(status).json({
      ok: false,
      message: status === 404 ? "Token not found" : "Failed to update token",
      error: error.message,
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("api_tokens")
      .update({ status: "deleted" })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id, name, status")
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: "Token not found",
      });
    }

    return res.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("delete /api/tokens/:id error:", error);
    const status = error.code === "PGRST116" ? 404 : 500;
    return res.status(status).json({
      ok: false,
      message: status === 404 ? "Token not found" : "Failed to delete token",
      error: error.message,
    });
  }
});

module.exports = router;
