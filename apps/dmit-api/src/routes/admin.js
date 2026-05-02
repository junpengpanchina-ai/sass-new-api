const express = require("express");

const router = express.Router();

/** 占位：后续接 admin 鉴权 + service 写库 + audit */
router.get("/", (req, res) => {
  res.status(501).json({ ok: false, message: "Not implemented" });
});

module.exports = router;
