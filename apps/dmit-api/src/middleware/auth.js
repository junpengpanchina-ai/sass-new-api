const { supabaseAdmin } = require("../lib/supabase");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Missing access token",
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        ok: false,
        message: "Invalid access token",
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        ok: false,
        message: "Profile not found",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      profile,
    };

    next();
  } catch (error) {
    console.error("auth middleware error:", error);
    return res.status(500).json({
      ok: false,
      message: "Auth middleware failed",
      error: error.message,
    });
  }
}

module.exports = { authMiddleware };
