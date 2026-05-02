const { authMiddleware } = require("./auth");
const { fail } = require("../lib/response");

function requireAdmin(req, res, next) {
  const role = req.user?.profile?.role;
  if (role !== "admin") {
    return fail(res, 403, "forbidden", "Admin access required");
  }
  next();
}

module.exports = { authMiddleware, requireAdmin };

