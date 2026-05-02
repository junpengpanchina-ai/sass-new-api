require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
  HOST: process.env.HOST || "127.0.0.1",
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  TOKEN_PEPPER: required("TOKEN_PEPPER"),
  UPSTREAM_BASE_URL: required("UPSTREAM_BASE_URL"),
  UPSTREAM_API_KEY: required("UPSTREAM_API_KEY"),
  UPSTREAM_NAME: process.env.UPSTREAM_NAME || "grsai-primary",
};

module.exports = { env };
