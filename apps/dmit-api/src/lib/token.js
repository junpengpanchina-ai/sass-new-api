const crypto = require("crypto");
const { env } = require("./env");

function generatePlainToken() {
  return `tsk_${crypto.randomBytes(24).toString("hex")}`;
}

function hashToken(plainToken) {
  return crypto.createHash("sha256").update(`${plainToken}:${env.TOKEN_PEPPER}`).digest("hex");
}

module.exports = {
  generatePlainToken,
  hashToken,
};
