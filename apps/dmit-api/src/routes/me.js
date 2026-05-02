const express = require("express");

const router = express.Router();

/** 占位：后续接 JWT / session + profiles */
router.get("/", (req, res) => {
  res.status(501).json({ ok: false, message: "Not implemented" });
});

module.exports = router;
