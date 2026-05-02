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
  - `profiles`（`status`/`role`/`plan` 最小字段；出海版可预留 `locale`/`currency` 等，见 §3.1、§8）
- **前台与控制台**
  - Landing / Pricing / Contact / Docs（最小可演示）
  - Dashboard（Models / Tokens / Usage 最小页）
- **支付最小闭环**
  - Stripe Checkout（或同级最小收款链路）
  - success / cancel 页面
  - `paid_pending` → admin 人工开通为 `active`
- **Token 系统**
  - `api_tokens` 表（冻结 DDL 表名）
  - 创建/禁用/删除 token（明文只显示一次）
- **Gateway 主链**
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - token 校验 + 用户状态校验 + 模型白名单校验 + 上游转发
- **账本与订单**
  - `plans`、`orders`、`credit_ledger`
- **Usage + Audit + 留资**
  - `usage_logs`
  - `leads`（留资；写入走服务端）
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

### 2.3 出海版部署拓扑（正式边界）

> 与「单纯把中文页面翻译成英文」不同：**出海版**要求从第一天起按多语言、多币种、多地区合规、上游语言参数可控来设计；**账本与状态机仍全部语言无关**。

```text
Vercel        = 国际化前台 / 控制台 / 定价页
DMIT（或等同自建机）= 国际化 API 网关 / 鉴权 / 计费 / 上游路由（本文档中的 apps/gateway 部署目标）
Supabase      = 语言无关的业务账本
Stripe        = 多币种收款与 Webhook 回调
GRSAI（或上游）= 模型/图片供应商，仅由网关侧调用；语言参数由网关解析后下发
```

核心一句：

```text
语言只影响展示、提示、上游生成偏好；
计费、订单、额度、token、日志，必须全部语言无关。
```

密钥存放、写库边界与端到端请求链路的完整说明见 [`architecture.md`](./architecture.md)。

---

## 3. 核心数据模型（V1 最小）

> 建议都放在 Supabase（Postgres），便于 RLS 与审计。
>
> **冻结 DDL**：[`docs/supabase-schema-v1.sql`](./supabase-schema-v1.sql)（8 张表；平台密钥表名为 `api_tokens`；含 RLS、`is_admin()`、套餐种子；页面与文档仍可称 “tokens”。）  
> **RLS 叙事与验证**：[`docs/supabase-rls-v1.md`](./supabase-rls-v1.md)；权限矩阵：[`docs/role-permissions-matrix-v1.md`](./role-permissions-matrix-v1.md）。

### 3.1 `profiles`

- `id uuid pk`（= auth.users.id）
- `email text`
- `role text`（V1：`user`/`admin`）
- `plan text`（V1：默认 `free`；字符串套餐码）
- `status text`（`visitor`/`pending`/`paid_pending`/`active`/`suspended`）
- `company text null`
- `telegram text null`
- **出海版建议字段（V1 可一并预留，避免日后迁表）**
  - `locale text default 'en'`（BCP 47，如 `en`、`zh-CN`）
  - `country text null`
  - `timezone text null`
  - `currency text default 'USD'`（冻结 DDL 与 Stripe 字段对齐；应用层可比对小写）
- `created_at timestamptz`
- `updated_at timestamptz`

### 3.2 `api_tokens`

核心原则：**只存 hash，不存明文**。

- `id uuid pk`
- `user_id uuid fk -> profiles.id`
- `name text`
- `token_hash text unique`（如 `sha256(plain + pepper)`）
- `status text`（`active`/`disabled`/`deleted`）
- `allowed_models jsonb null`（`null` 表示全允许；或数组白名单）
- `created_at timestamptz`
- `last_used_at timestamptz null`
- `updated_at timestamptz`（DDL 含自动更新触发器）

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
- **出海版建议字段（可选；便于定位语言与上游）**
  - `locale text null`（请求解析后的 locale，**不参与扣费逻辑**）
  - `upstream_provider text default 'grsai'`（或实际上游名）
  - `upstream_model text null`（可与 `model` 对齐，按需冗余）
  - `request_language text null`（传给上游的语言/偏好摘要）
- `credits_charged bigint null`、`credit_ledger_id fk null`（可选：与账本行对齐）
- `created_at timestamptz`

### 3.4 `leads`（留资）

- `id bigserial pk`
- `email text`
- `name text null`
- `company text null`
- `telegram text null`
- `message text null`
- `source text`
- `created_at timestamptz`

### 3.5 `orders`（Stripe Checkout / Webhook）

**字段值一律机器可读**；到账只认 Webhook 写库。

- `id bigserial pk`
- `user_id uuid fk -> profiles`
- `plan_code text not null`（与 `plans.code` 对齐）
- `provider text`（如 `stripe`）
- `stripe_checkout_session_id text unique null`
- `stripe_payment_intent_id text null`
- `currency text not null default 'USD'`
- `amount_total int not null`（最小货币单位）
- `status text not null`：`created` / `paid` / `failed` / `refunded` / `canceled`
- `paid_at timestamptz null`
- `metadata jsonb`
- `created_at` / `updated_at timestamptz`

### 3.6 `plans`（套餐 / 定价）

- `id bigserial pk`
- `code text unique`（如 `starter` / `pro` / `channel`）
- `name text`、`description text`
- `currency text not null default 'USD'`
- `price_amount int not null`（最小货币单位）
- `credit_amount bigint not null default 0`（购买/开通附带额度）
- `stripe_price_id text null`
- `active boolean`、`sort_order int`
- `metadata jsonb`
- `created_at` / `updated_at timestamptz`

### 3.7 `credit_ledger`（额度唯一账本）

- `id bigserial pk`
- `user_id uuid fk`
- `order_id fk null`、`token_id fk null`（追溯来源）
- `kind text`：`credit_add` / `credit_deduct` / `credit_refund` / `credit_adjust`
- `amount bigint not null`（符号由 `kind` + 业务规则约束）
- `balance_after bigint null`（可选快照）
- `reason text null`、`metadata jsonb`
- `created_at timestamptz`

### 3.8 `admin_audit_logs`（管理员敏感操作）

- `id bigserial pk`
- `admin_user_id uuid fk null`
- `action text`、`target_type text`、`target_id text`
- `before jsonb`、`after jsonb null`
- `ip text`、`user_agent text null`
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

### 4.2 Token 状态（`api_tokens.status`）

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

## 8. 出海版（国际化 / 多币种 / 合规边界）

### 8.1 状态与账本字段（禁止自然语言）

数据库与 API **只用机器字段**，例如：

```text
created / paid / failed / refunded / canceled   # orders.status
active / revoked / expired                       # token 等（示例）
credit_add / credit_deduct / credit_refund / credit_adjust   # credit_ledger.kind
```

前端按用户 `locale` 翻译展示；**禁止**将「已支付」等中文或英文句子写入状态字段。

### 8.2 语言来源优先级（V1 建议）

| 优先级 | 来源 | 用途 |
| --- | --- | --- |
| 1 | 用户手动切换语言 | 最优先 |
| 2 | 登录用户 `profiles.locale` | 持久化偏好 |
| 3 | Cookie / localStorage | 未登录访客 |
| 4 | 浏览器 `Accept-Language` | 首次访问兜底 |
| 5 | 默认 `en` | 出海默认主语言 |

中文使用 `zh-CN`（与 BCP 47 一致）。

### 8.3 前端（Vercel / Next.js）

- 推荐 **`next-intl`**（或等价方案），路由采用 **`/en`、`/zh`** 前缀（利于 SEO 与投放），例如 `/en/pricing`、`/zh/pricing`。
- 前端职责限于：多语言 UI、登录注册界面、套餐展示、调用网关暴露的 HTTP API、跳转 Stripe Checkout、展示额度与结果。
- 前端**不得**：扣费、发放平台 token、改订单、直连上游、持有 `service_role` / Stripe secret / 上游 API Key。

### 8.4 网关（DMIT）与 `Accept-Language`

前端请求网关时建议携带：

```http
Accept-Language: en
```

或

```http
Accept-Language: zh-CN
```

网关解析为固定集合（如 `en`、`zh-CN`），用于：

1. 返回**可选**的多语言错误提示（错误码仍稳定、语言无关）。
2. 调用上游（如 GRSAI）时注入 `language` / locale / system 提示，控制生成语言偏好。
3. **写 `usage_logs` 时记录 `locale` / `request_language`**，但不以此参与扣费或账本分支。

密钥与上游调用仍仅在网关侧。

### 8.5 Stripe（出海 V1 建议）

| 主题 | V1 建议 |
| --- | --- |
| 币种 | 先 **USD**；表结构预留 `currency`，后续加 CNY/HKD 等 |
| 成功判定 | **仅认** Webhook 验签后写库；不认前端 success 页 |
| 套餐 | `plans.stripe_price_id` 与 Stripe Price 对齐 |
| 税务 / 合规 | V1 可简化产品逻辑，但对外 **Terms / Privacy** 建议中英文常备 |

### 8.6 上游语言映射（示例）

网关根据 locale 包装上游请求（示例思路，非强制字面文案）：

- `zh-CN`：system 侧提示「除非用户明确要求其他语言，否则用中文回复」等。
- `en`：同理使用英文。

图片类可把「User locale: …」写入网关侧 prompt 包装层，**上游 API Key 仅在网关**。

### 8.7 部署与安全边界（文档照）

#### Deployment & security boundary (global version)

- Vercel hosts the multilingual frontend.
- The API gateway (DMIT or equivalent) hosts the backend API, billing boundary, token verification, credit deduction, and upstream proxy.
- Supabase stores language-neutral business records.
- Stripe handles checkout and sends signed webhooks to the gateway.
- GRSAI (or the configured upstream) is the generation provider and is only called by the gateway.
- The frontend never stores or exposes upstream keys, Stripe secret keys, or Supabase service role keys.
- Locale affects UI copy, optional API messages, and upstream generation preference only. Billing, orders, credits, tokens, and logs use language-neutral machine fields.

#### 出海版部署与安全边界（中文）

- Vercel 承载多语言前端。
- DMIT（或等同部署上的网关）承载后端 API、计费边界、token 校验、额度扣减、上游转发。
- Supabase 存储语言无关的业务账本。
- Stripe 负责 Checkout，并通过签名 Webhook 回调网关。
- GRSAI（或上游）是生成供应商，只允许网关调用。
- 前端不得保存或暴露上游 Key、Stripe Secret Key、Supabase Service Role Key。
- 语言只影响 UI 文案、可选 API 提示与上游生成偏好；订单、额度、token、账本与日志等核心业务字段保持语言无关的机器取值。

### 8.8 建议实施顺序（出海版 / 与 §9 里程碑互补）

1. Supabase Schema：credits/订单/token、`locale`/`currency` 等预留字段（§3）。
2. 网关 `.env`：`SUPABASE_SERVICE_ROLE_KEY` 等仅服务端。
3. 健康检查：`/healthz` 或 `/api/system/health`，返回版本与环境（无密钥）。
4. 套餐只读 API：`/api/plans`（或等价），供前端展示。
5. Stripe Checkout + Webhook 验签写库。
6. 最后再接完整多语言前端路由与控制台。

---

## 9. 里程碑（建议）

### M1：后台可看（已部分完成）

- Models 页面可见（静态/配置驱动）

### M2：token 可发可控

- `api_tokens` 表 + token 管理页面 + API

### M3：网关闭环

- token 鉴权 + 模型白名单 + 转发 + 返回兼容

### M4：日志可查

- usage_logs 写入 + 控制台最小查询

