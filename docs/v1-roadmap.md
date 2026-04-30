# 手搓版 Token SaaS V1 模块拆解清单（按开发顺序）

这份清单的目标是：**按“最小可用闭环”顺序推进**，优先拿回控制权（用户/支付/token/网关/日志），并且从 V1 起就做到可追踪、可定位、可替换。

---

## 总原则（V1 只做什么 / 不做什么）

- **必须做**：用户身份（Supabase Auth）/ 用户状态（profiles）/ 支付入口（Stripe）/ token 发放与权限 / 网关转发 / 最小日志
- **刻意不做**（全部后移）：分销后台、自动计费与复杂 webhook 编排、复杂风控/配额、白标、多租户组织权限、渠道结算规则、复杂 admin 面板

---

## 阶段 1：先把“用户控制层”拿到自己手里

目标：先别碰最复杂的网关；先把用户、登录、状态、token 控制层做成自己的。

### 模块 1：项目骨架与仓库结构

- **为什么先做**：后续必然多人协作/多服务；结构先定，避免屎山与反复迁移。
- **要做什么**
  - 固化 monorepo 目录：`apps/web`、`apps/gateway`、`packages/shared`、`docs/`
  - 环境变量规范：`.env.example`
  - 文档入口：`README.md`
- **完成标准**
  - 目录结构固定可用
  - `.env.example` 存在且字段可扩展
  - `docs/v1-roadmap.md` 可作为排期依据

### 模块 2：前台品牌站（Web 基础壳）

- **为什么第二个做**：销售/演示需要“可看”；但它只是壳，不应拖慢主链。
- **要做什么（V1 最小）**
  - 首页 / Pricing / Models / Docs / Contact / Login / Dashboard（壳）
  - 统一品牌文案与 CTA
- **完成标准**
  - `web` 能本地启动
  - 销售能打开演示（页面不空、不跳 404）
  - 登录入口与控制台入口明确

### 模块 3：认证系统（Supabase Auth）

- **为什么第三个做**：token 发放、套餐状态、dashboard 访问都依赖身份。
- **要做什么**
  - Google OAuth 登录：`/login`、`/auth/callback`
  - dashboard 访问控制（未登录拦截）
  - 登录后自动创建/补齐 `profiles`
- **完成标准**
  - 用户可登录并稳定回到 dashboard
  - `profiles` 自动创建（或登录后补齐）
  - 未登录访问 dashboard 被拦

### 模块 4：用户资料与套餐状态（profiles）

- **为什么必须早做**：后面的支付、token、权限全部挂在“用户当前状态”上。
- **建议表结构（Supabase / Postgres）**
  - `profiles`
    - `id uuid primary key`（= auth.users.id）
    - `email text`
    - `role text`（如：`user`/`admin`，V1 可只保留 `user`）
    - `plan text`（如：`free`/`pro`，V1 可先字符串）
    - `status text`（`visitor`/`pending`/`active`/`suspended`）
    - `company text null`
    - `telegram text null`
    - `created_at timestamptz default now()`
    - `updated_at timestamptz default now()`
- **完成标准**
  - dashboard 能读取并展示 `plan/status`
  - 未付款用户默认 `pending`（或 `visitor` → 看你的登录策略）

---

## 阶段 2：把“成交与开通控制”拿到自己手里

目标：不求全自动，但让“付款”和“开通”有结构，能交付。

### 模块 5：Lead 留资系统

- **为什么先做**：V1 自动化不完善时，销售线索必须先接住。
- **建议表结构**
  - `leads`
    - `id bigserial primary key`
    - `email text`
    - `name text null`
    - `company text null`
    - `message text null`
    - `source text`（来自哪个页面/渠道）
    - `created_at timestamptz default now()`
- **接口建议**
  - `POST /api/leads`（web 侧）
- **完成标准**
  - Contact 表单可提交
  - Supabase 表能看到记录，含 `source`

### 模块 6：支付入口（Stripe 最小接入）

- **为什么现在做**：能卖才能闭环；但 V1 不强求复杂自动化。
- **最小实现路径（推荐）**
  - Stripe Checkout Session（自己创建 session，便于后续自动化）
  - 页面：`/checkout/success`、`/checkout/cancel`
- **状态建议**
  - 支付成功后把 `profiles.status` 更新为 `paid_pending` 或 `pending_review`
- **完成标准**
  - Pricing 页按钮可发起支付
  - success/cancel 页面存在且能引导下一步
  - 你明确知道“支付后如何人工开通”

### 模块 7：人工开通 SOP + 状态流转

- **为什么必须有**：V1 最高频场景是“收到了钱但还没自动发 token”，没有 SOP 会直接交付失败。
- **推荐状态流**

```text
visitor
→ lead
→ paid_pending
→ active
→ suspended
```

- **完成标准**
  - 用户在 dashboard 能看到明确的“Pending Activation”
  - 你有清晰的人工开通步骤（例如：后台把状态改为 `active`）

---

## 阶段 3：把“平台 token 控制权”拿到自己手里

目标：这是和“套壳站”真正分水岭；token 从此由你自己发、自己控、自己追责。

### 模块 8：Token 数据模型

- **核心原则**
  - 数据库存 **hash**
  - 明文 token 只生成一次给用户看
  - **明文 token 不落库**
- **建议表结构**
  - `tokens`
    - `id uuid primary key default gen_random_uuid()`
    - `user_id uuid references profiles(id)`
    - `name text`
    - `token_hash text unique`（例如 `sha256(plain + pepper)`）
    - `status text`（`active`/`disabled`/`deleted`）
    - `group_name text null`（V1 可保留但不做复杂分组）
    - `allowed_models jsonb`（V1：数组，如 `["gpt-4.1-mini","gpt-4.1"]`；或 `null` 表示全允许）
    - `created_at timestamptz default now()`
    - `last_used_at timestamptz null`
- **完成标准**
  - 后端能生成 token（一次性明文）
  - DB 能存 token 元数据（hash + 权限）
  - dashboard 能展示 token 列表壳

### 模块 9：Token 管理界面

- **要做什么**
  - 查看 token 列表
  - 新建 token（首次展示明文 + 复制）
  - 停用/启用 token
  - 删除 token（建议软删除：`status=deleted`）
- **完成标准**
  - 新建 token 能写入 DB
  - 停用状态能生效（网关会拒绝）

### 模块 10：Token 权限规则（V1 极简）

- **只做这三层**
  - token 是否启用
  - 用户状态是否 `active`
  - token 是否允许访问指定模型（白名单）
- **刻意不做**
  - 复杂分组/多租户/组织权限
  - 复杂配额（RPM/TPM/日限额）、自助账单
  - 渠道结算规则
- **完成标准**
  - 无权访问能明确报错（401/403 + 可定位 reason）
  - 权限规则可被日志追踪（见模块 12）

---

## 阶段 4：把“最小网关主链”拿到自己手里

目标：V1 发动机。所有模型调用都必须过你自己的 gateway，责任链清晰。

### 模块 11：最小网关 API（FastAPI）

- **为什么到这一步才写**：没有用户/支付/token，网关无法挂业务规则，只会走偏。
- **V1 必做接口**
  - `POST /v1/chat/completions`
    - 读取 `Authorization: Bearer <token>`
    - 查 token 是否存在/启用
    - 查用户 `profiles.status == active`
    - 校验模型权限
    - 选择上游并转发
    - 返回 OpenAI-compatible JSON
  - `GET /v1/models`
    - 返回当前可展示模型列表（静态或从配置）
- **完成标准**
  - 用你自己发的 token 能打通一次文本请求
  - 返回结构兼容 OpenAI（便于前端/SDK 对接）

### 模块 12：最小日志系统（usage_logs）

- **为什么必须有**：最怕出事不知道哪层漏；日志是责任链与排障能力的底座。
- **建议表结构**
  - `usage_logs`
    - `id bigserial primary key`
    - `token_id uuid null`（无法识别 token 时也要能记）
    - `user_id uuid null`
    - `model text`
    - `upstream_name text`
    - `status text`（`ok`/`error`/`denied`）
    - `http_status int null`
    - `latency_ms int null`
    - `error_code text null`
    - `error_message text null`
    - `created_at timestamptz default now()`
- **完成标准**
  - 每次请求（成功/失败/拒绝）都写日志
  - 至少能查到“哪个 token 调了哪个模型、走了哪个上游、结果如何”

---

## 最终开发顺序（可直接拿去排期）

### 第 1 批：基础控制层

- [ ] 整理 `web` 项目（品牌站 + dashboard 壳）
- [ ] 收口 Supabase 登录（Google OAuth + dashboard guard）
- [ ] `profiles` 状态字段与读取展示
- [ ] Contact + `leads` + `POST /api/leads`
- [ ] Pricing + success/cancel/pending 页面

### 第 2 批：token 层

- [ ] `tokens` 表
- [ ] token 生成接口（一次性明文）
- [ ] token 列表/停用/删除接口
- [ ] dashboard token 真数据接入

### 第 3 批：gateway 层

- [ ] FastAPI 初始化
- [ ] `/v1/chat/completions`
- [ ] `/v1/models`
- [ ] token 校验 + 用户状态校验 + 模型白名单校验
- [ ] 上游转发 + 返回标准化

### 第 4 批：日志层

- [ ] `usage_logs` 表
- [ ] 成功请求日志
- [ ] 失败请求日志（含 denied）
- [ ] 最小查询方式（SQL/Supabase table view 即可）

