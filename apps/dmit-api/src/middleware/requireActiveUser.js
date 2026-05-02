function requireActiveUser(req, res, next) {
  const profile = req.user?.profile;

  if (!profile) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized",
    });
  }

  if (profile.status !== "active") {
    return res.status(403).json({
      ok: false,
      message: "User is not active",
      status: profile.status,
    });
  }

  next();
}

module.exports = { requireActiveUser };
