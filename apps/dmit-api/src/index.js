require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { env } = require("./lib/env");
const healthRouter = require("./routes/health");
const systemRouter = require("./routes/system");
const plansRouter = require("./routes/plans");
const meRouter = require("./routes/me");
const tokensRouter = require("./routes/tokens");
const checkoutRouter = require("./routes/checkout");
const healthzRouter = require("./routes/healthz");
const v1Router = require("./routes/v1");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "dmit-api",
    message: "DMIT API is running",
  });
});

app.use("/health", healthRouter);
app.use("/healthz", healthzRouter);
app.use("/api/system", systemRouter);
app.use("/api/plans", plansRouter);
app.use("/api/me", meRouter);
app.use("/api/tokens", tokensRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/v1", v1Router);

app.listen(env.PORT, env.HOST, () => {
  console.log(`DMIT API listening on http://${env.HOST}:${env.PORT}`);
});
