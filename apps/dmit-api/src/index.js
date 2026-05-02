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
const adminPlansRouter = require("./routes/admin.plans");
const adminUsersRouter = require("./routes/admin.users");
const adminTokensRouter = require("./routes/admin.tokens");
const adminProductsRouter = require("./routes/admin.products");
const adminCustomersRouter = require("./routes/admin.customers");
const adminOrdersRouter = require("./routes/admin.orders");
const adminUsageLogsRouter = require("./routes/admin.usageLogs");
const adminAuditLogsRouter = require("./routes/admin.auditLogs");

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
app.use("/api/admin/plans", adminPlansRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/tokens", adminTokensRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin/customers", adminCustomersRouter);
app.use("/api/admin/orders", adminOrdersRouter);
app.use("/api/admin/usage-logs", adminUsageLogsRouter);
app.use("/api/admin/audit-logs", adminAuditLogsRouter);
app.use("/v1", v1Router);

app.listen(env.PORT, env.HOST, () => {
  console.log(`DMIT API listening on http://${env.HOST}:${env.PORT}`);
});
