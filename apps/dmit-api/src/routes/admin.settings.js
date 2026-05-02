const express = require("express");

const { supabaseAdmin } = require("../lib/supabase");
const { ok, fail } = require("../lib/response");
const { writeAdminAuditLog } = require("../lib/audit");
const { authMiddleware, requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("ops_settings")
      .select("key, value, updated_at")
      .order("key", { ascending: true });
    if (error) throw error;
    const map = {};
    for (const row of data || []) map[row.key] = row.value;
    return ok(res, { settings: map });
  } catch (e) {
    console.error("admin.settings GET error:", e);
    return fail(res, 500, "internal_error", "Failed to fetch settings");
  }
});

router.patch("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const docsUrl = body.docs_url;

    if (docsUrl !== undefined && docsUrl !== null) {
      const s = String(docsUrl).trim();
      if (s && !/^https?:\/\//i.test(s)) {
        return fail(res, 400, "bad_request", "docs_url must start with http(s)://");
      }
    }

    const patch = {
      docs_url: docsUrl === undefined ? undefined : (docsUrl === null ? null : String(docsUrl).trim() || null),
    };

    const before = await supabaseAdmin.from("ops_settings").select("key, value").eq("key", "general").maybeSingle();
    if (before.error) throw before.error;

    const general = {
      ...(before.data?.value || {}),
      ...(patch.docs_url !== undefined ? { docs_url: patch.docs_url } : {}),
    };

    const { data, error } = await supabaseAdmin
      .from("ops_settings")
      .upsert({ key: "general", value: general }, { onConflict: "key" })
      .select("key, value, updated_at")
      .single();
    if (error) throw error;

    await writeAdminAuditLog({
      adminUserId: req.user.id,
      action: "ops_settings.update",
      targetType: "ops_settings",
      targetId: "general",
      before: before.data?.value || null,
      after: data.value,
    });

    return ok(res, { key: data.key, value: data.value, updated_at: data.updated_at });
  } catch (e) {
    console.error("admin.settings PATCH error:", e);
    return fail(res, 500, "internal_error", "Failed to update settings");
  }
});

module.exports = router;

