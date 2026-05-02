const { supabaseAdmin } = require("./supabase");

async function writeAdminAuditLog({
  adminUserId,
  action,
  targetType,
  targetId = null,
  before = null,
  after = null,
}) {
  try {
    const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
      admin_user_id: adminUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      before,
      after,
    });
    if (error) console.error("writeAdminAuditLog error:", error);
  } catch (e) {
    console.error("writeAdminAuditLog exception:", e);
  }
}

module.exports = { writeAdminAuditLog };

