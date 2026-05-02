require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { env } = require("./lib/env");
const healthRouter = require("./routes/health");
const systemRouter = require("./routes/system");
const plansRouter = require("./routes/plans");

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
app.use("/api/system", systemRouter);
app.use("/api/plans", plansRouter);

app.listen(env.PORT, env.HOST, () => {
  console.log(`DMIT API listening on http://${env.HOST}:${env.PORT}`);
});
