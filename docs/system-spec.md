# 系统完整版本规格文档（手搓 Token SaaS）

> 本文档是**系统级规格说明**，用于：排期、拆任务、对齐实现边界、约束 V1 范围，避免跑偏。
>
> 原则：参考 New API 的产品链路与结构，但核心实现**完全自控**（用户/支付/token/网关/日志）。

---

## 0. V1 冻结范围（必须遵守）

> 这部分用于**冻结 V1 scope**。任何“文档里有写”但不在下列清单内的内容，均不得进入 V1 Sprint。

### 0.1 V1 仅开发（允许进入任务板）

- **用户与状态**
  - Supabase Auth
  - `profiles`（`status`/`role`/`plan` 最小字段）
- **前台与控制台**
  - Landing / Pricing / Contact / Docs（最小可演示）
  - Dashboard（Models / Tokens / Usage 最小页）
- **支付最小闭环**
  - Stripe Checkout（或同级最小收款链路）
  - success / cancel 页面
  - `paid_pending` → admin 人工开通为 `active`
- **Token 系统**
  - `tokens` 表
  - 创建/禁用/删除 token（明文只显示一次）
- **Gateway 主链**
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - token 校验 + 用户状态校验 + 模型白名单校验 + 上游转发
- **Usage + Audit**
  - `usage_logs`
  - `admin_audit_logs`
  - admin 查日志 + 敏感操作留痕

### 0.2 V1 不开发（禁止进入任务板）

- affiliates / referrals / commissions / payouts（任何分销与结算体系）
- affiliate dashboard
- `support` 子角色与细粒度 RBAC（仅预留，不实现）
- 复杂计费（TPM/RPM/缓存计费/多倍率叠加/账单）
- 复杂风控（黑白名单、设备指纹、行为反作弊）
- 白标体系
- 多租户组织权限
- 大而全数据看板（仅提供最小日志查询）

## 1. 目标与非目标

### 1.1 目标（V1 必须达成）

V1 主链必须跑通：

```text
用户登录
→ 看到套餐/状态
→ 发放平台 token
→ token 调你自己的网关
→ 你自己的网关转发上游
→ 返回模型结果
→ 写最小日志
```

V1 需要具备：

- **可销售演示**：前台 + 控制台基本页面可用
- **可交付**：用户能拿到 token 并调用网关得到真实返回
- **可追责**：每次调用可定位到 token / 用户 / 模型 / 上游 / 结果
- **可控**：token 可禁用、模型可控、用户状态可控

### 1.2 非目标（V1 刻意不做）

以下全部后移（避免平台化泥潭）：

- 分销体系全自动化（返佣、结算、对账、税务、提现）
- 复杂计费（TPM/RPM/缓存计费/多倍率叠加/账单系统）
- 复杂风控（黑白名单、指纹、IP 风险、行为分析）
- 多租户组织权限（企业 RBAC、组织/项目层级）
- 白标（域名/主题/品牌全套）
- 大而全监控面板（先日志可查即可）

---

## 2. 系统边界与组件

### 2.1 组件划分（Monorepo）

```text
apps/web       # 前台 + 控制台（Next.js）
apps/gateway   # 网关（FastAPI，OpenAI-compatible）
packages/shared# 共享类型/常量（可选）
docs/          # 规格与运行文档
```

### 2.2 关键外部依赖（可替换）

- **Auth/DB**：Supabase（Postgres + Auth）
- **Payment**：Stripe（V1 最小接入）
- **Upstream**：朋友上游 / 自建上游（V1 先接现成上游）
- **Analytics（可选）**：GA4 / Umami（Web 侧）
- **Profiling（可选）**：pprof 风格 / Pyroscope（Gateway 侧）

---

## 3. 核心数据模型（V1 最小）

> 建议都放在 Supabase（Postgres），便于 RLS 与审计。

### 3.1 `profiles`

- `id uuid pk`（= auth.users.id）
- `email text`
- `role text`（V1：`user`/`admin`）
- `plan text`（V1：字符串即可）
- `status text`（`visitor`/`pending`/`paid_pending`/`active`/`suspended`）
- `company text null`
- `telegram text null`
- `created_at timestamptz`
- `updated_at timestamptz`

### 3.2 `tokens`

核心原则：**只存 hash，不存明文**。

- `id uuid pk`
- `user_id uuid fk -> profiles.id`
- `name text`
- `token_hash text unique`（如 `sha256(plain + pepper)`）
- `status text`（`active`/`disabled`/`deleted`）
- `allowed_models jsonb null`（`null` 表示全允许；或数组白名单）
- `created_at timestamptz`
- `last_used_at timestamptz null`

### 3.3 `usage_logs`

V1 只记最小字段，先保证责任链清晰：

- `id bigserial pk`
- `token_id uuid null`
- `user_id uuid null`
- `model text`
- `upstream_name text`
- `status text`（`ok`/`error`/`denied`）
- `http_status int null`
- `latency_ms int null`
- `request_id text null`（可选：用于串联网关日志）
- `error_code text null`
- `error_message text null`
- `created_at timestamptz`

### 3.4 `leads`（可选但建议 V1 做）

- `id bigserial pk`
- `email text`
- `name text null`
- `company text null`
- `message text null`
- `source text`
- `created_at timestamptz`

### 3.5 `payments`（V1 可选：只做最小追踪）

如果 V1 用 Stripe Checkout，建议最小记录：

- `id bigserial pk`
- `user_id uuid`
- `provider text`（`stripe`）
- `checkout_session_id text`
- `status text`（`created`/`paid`/`failed`）
- `amount_total int`
- `currency text`
- `created_at timestamptz`

---

## 4. 权限与状态机

### 4.1 用户状态（`profiles.status`）

推荐状态流：

```text
visitor
→ pending（注册/登录后默认）
→ paid_pending（已付款待人工开通）
→ active（可发 token / 可调用）
→ suspended（封禁/欠费/风控）
```

### 4.2 Token 状态（`tokens.status`）

```text
active   # 正常可用
disabled # 禁用（拒绝调用）
deleted  # 软删除（拒绝调用，列表默认不展示）
```

### 4.3 V1 鉴权判定顺序（网关）

收到请求（Bearer token）：

1. token 是否存在（hash 命中）
2. token 是否 `active`
3. token 归属用户是否 `profiles.status == active`
4. 目标模型是否在 `allowed_models` 白名单（或白名单为空/为 null 表示全允许）

失败时必须：

- 返回清晰的 401/403
- 写入 `usage_logs`（status=denied，含 reason）

---

## 5. 对外接口（V1）

### 5.1 Web（控制台）

V1 必需页面：

- Landing / Pricing / Contact
- Login / Dashboard
- Dashboard / Models（模型展示）
- Dashboard / Tokens（token 列表/新建/禁用）
- Dashboard / Usage（最小日志列表，后续再做图表）

### 5.2 Web API（Next.js Route Handlers）

V1 推荐最小接口：

- `POST /api/leads`
- `POST /api/tokens`（服务端创建 token，返回一次性明文）
- `GET /api/tokens`
- `PATCH /api/tokens/:id`（enable/disable）
- `DELETE /api/tokens/:id`（软删）

> 注意：凡涉及 DB 写与 token 生成的接口，必须在服务端使用 `SUPABASE_SERVICE_ROLE_KEY`，**绝不下发前端**。

### 5.3 Gateway API（OpenAI-compatible）

V1 必需：

- `GET /v1/models`
- `POST /v1/chat/completions`

V1 可选：

- `GET /healthz`
- `GET /debug/pprof/`（启用开关时）

---

## 6. 可观测性与审计（V1）

### 6.1 Web 分析（可选）

- GA4 / Umami：仅通过环境变量注入（见 `docs/analytics.md`）

### 6.2 Gateway 性能分析（可选）

- pprof 风格端点 / Pyroscope（见 `docs/performance-profiling.md`）

### 6.3 审计底线

- token 明文不落库
- 所有模型调用必须过 gateway（避免绕过审计）
- 失败/拒绝也必须写 `usage_logs`

---

## 7. 部署与环境（V1）

### 7.1 Web

- Next.js（Vercel 或自建）
- 环境变量：见根目录 `.env.example`

### 7.2 Gateway

- FastAPI + Uvicorn（容器化/裸机均可）
- 先支持单实例；水平扩展时通过 `HOSTNAME` tag 区分实例（Pyroscope）

---

## 8. 里程碑（建议）

### M1：后台可看（已部分完成）

- Models 页面可见（静态/配置驱动）

### M2：token 可发可控

- tokens 表 + token 管理页面 + API

### M3：网关闭环

- token 鉴权 + 模型白名单 + 转发 + 返回兼容

### M4：日志可查

- usage_logs 写入 + 控制台最小查询

