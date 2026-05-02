# V1 角色权限矩阵表（字段级 / 页面级 / 接口级）

结合当前架构：

- **DMIT**：API 网关 / 鉴权 / Stripe Webhook / 上游转发
- **Vercel**：前台网站 / Dashboard
- **Supabase**：Auth + DB + 账本
- **Stripe**：收款
- **GRSAI**：上游，只能由 DMIT 调用

按 **3 个角色** 定义：

1. **消费者 / 普通用户（`user`）**
2. **分销商 / 邀请者（`affiliate`）** — 本质仍是用户，多邀请/归因/返佣可见性
3. **老板 / 管理员（`admin`）**

按 **3 个维度** 展开：字段级、页面级、接口级。

---

## 一、角色定义

### 1. 普通用户 `user`

平台的注册用户、购买用户、调用用户。

### 2. 分销商 `affiliate`

本质上还是用户，但多了：邀请链接、归因、返佣可见性。

> V1 中，`affiliate` 继承 `user` 的全部能力，再追加少量分销可见能力。

### 3. 管理员 `admin`

平台 owner / 老板 / 管理后台操作者。可管理用户、token、订单、日志、上游和审计。

---

## 二、字段级权限矩阵

字段级的核心原则：

- **用户只能读自己的、改自己允许改的**
- **分销商只能看自己的分销数据**
- **`admin` 才能改状态、套餐、token 和账本**

---

### 2.1 `profiles`

| 字段           | user 可读 | user 可写 | affiliate 可读 | affiliate 可写 | admin 可读 | admin 可写 |
| -------------- | --------- | --------- | -------------- | -------------- | ---------- | ---------- |
| `id`           | 仅自己    | 否        | 仅自己         | 否             | 全部       | 否         |
| `email`        | 仅自己    | 否        | 仅自己         | 否             | 全部       | 否         |
| `role`         | 仅自己    | 否        | 仅自己         | 否             | 全部       | 是         |
| `plan`         | 仅自己    | 否        | 仅自己         | 否             | 全部       | 是         |
| `status`       | 仅自己    | 否        | 仅自己         | 否             | 全部       | 是         |
| `company`      | 仅自己    | 是        | 仅自己         | 是             | 全部       | 是         |
| `telegram`     | 仅自己    | 是        | 仅自己         | 是             | 全部       | 是         |
| `locale`       | 仅自己    | 是        | 仅自己         | 是             | 全部       | 是         |
| `country`      | 仅自己    | 是        | 仅自己         | 是             | 全部       | 是         |
| `timezone`     | 仅自己    | 是        | 仅自己         | 是             | 全部       | 是         |
| `currency`     | 仅自己    | 否或受限  | 仅自己         | 否或受限       | 全部       | 是         |
| `created_at`   | 仅自己    | 否        | 仅自己         | 否             | 全部       | 否         |
| `updated_at`   | 仅自己    | 否        | 仅自己         | 否             | 全部       | 否         |

**备注**

- `role` / `plan` / `status` 一律不能让普通用户自己改。
- `company` / `telegram` / `locale` / `country` / `timezone` 可以开放给用户自己维护。
- `currency` 建议先由系统或 `admin` 控制，V1 不开放用户乱改。

---

### 2.2 `plans`

| 字段             | user 可读     | user 可写 | affiliate 可读 | affiliate 可写 | admin 可读 | admin 可写 |
| ---------------- | ------------- | --------- | -------------- | -------------- | ---------- | ---------- |
| 全部公开套餐字段 | 是（仅 active） | 否        | 是（仅 active）  | 否             | 是         | 是         |

**备注**

用户和分销商都可以看套餐，没有人能在前端直接改套餐。

---

### 2.3 `orders`

| 字段                         | user 可读     | user 可写 | affiliate 可读   | affiliate 可写 | admin 可读 | admin 可写 |
| ---------------------------- | ------------- | --------- | ---------------- | -------------- | ---------- | ---------- |
| 自己的订单                   | 是            | 否        | 是               | 否             | 全部       | 是         |
| `status`                     | 是（仅自己的） | 否        | 是（仅自己的）   | 否             | 全部       | 是         |
| `amount_total`               | 是（仅自己的） | 否        | 是（仅自己的）   | 否             | 全部       | 是         |
| `stripe_checkout_session_id` | 否或仅部分    | 否        | 否或仅部分       | 否             | 全部       | 是         |
| `metadata`                   | 否            | 否        | 否               | 否             | 全部       | 是         |

**备注**

- 用户能看自己的订单结果，不应改订单状态。
- 订单状态只认 Stripe Webhook + `admin` 纠偏。

---

### 2.4 `api_tokens`

| 字段                | user 可读     | user 可写                 | affiliate 可读 | affiliate 可写            | admin 可读       | admin 可写 |
| ------------------- | ------------- | ------------------------- | -------------- | ------------------------- | ---------------- | ---------- |
| 自己的 token 元数据 | 是            | 部分                      | 是             | 部分                      | 全部             | 是         |
| `name`              | 是            | 是                        | 是             | 是                        | 全部             | 是         |
| `status`            | 是            | 仅 enable/disable 自己的  | 是             | 仅 enable/disable 自己的  | 全部             | 是         |
| `allowed_models`    | 是（如需展示） | 否或受限                  | 是（如需展示） | 否或受限                  | 全部             | 是         |
| `token_hash`        | 否            | 否                        | 否             | 否                        | 可读但不展示明文 | 否         |
| `last_used_at`      | 是（自己的）  | 否                        | 是（自己的）   | 否                        | 全部             | 否         |
| 明文 token          | 仅创建当次可见 | 否                        | 仅创建当次可见 | 否                        | 重置时一次性可见 | 否         |

**备注**

- **明文 token 永不长期可见**。
- 用户只能管理自己的 token。
- `admin` 可以重置 token，但只能拿到一次性新明文。

---

### 2.5 `credit_ledger`

| 字段            | user 可读       | user 可写 | affiliate 可读  | affiliate 可写 | admin 可读 | admin 可写 |
| --------------- | --------------- | --------- | --------------- | ---------------- | ---------- | ---------- |
| 自己账本流水    | 是              | 否        | 是              | 否               | 全部       | 是         |
| `kind`          | 是（自己的）    | 否        | 是（自己的）    | 否               | 全部       | 是         |
| `amount`        | 是（自己的）    | 否        | 是（自己的）    | 否               | 全部       | 是         |
| `balance_after` | 是（自己的）    | 否        | 是（自己的）    | 否               | 全部       | 是         |
| `reason`        | 是（自己的）    | 否        | 是（自己的）    | 否               | 全部       | 是         |
| `metadata`      | 否或只读简化版  | 否        | 否或只读简化版  | 否               | 全部       | 是         |

**备注**

账本是核心账务层，**前端任何角色都不能直接写**。

---

### 2.6 `usage_logs`

| 字段            | user 可读      | user 可写 | affiliate 可读 | affiliate 可写 | admin 可读 | admin 可写 |
| --------------- | -------------- | --------- | -------------- | -------------- | ---------- | ---------- |
| 自己的调用日志  | 是             | 否        | 是             | 否             | 全部       | 否         |
| `model`         | 是（自己的）   | 否        | 是（自己的）   | 否             | 全部       | 否         |
| `upstream_name` | 可隐藏或简化   | 否        | 可隐藏或简化   | 否             | 全部       | 否         |
| `status`        | 是（自己的）   | 否        | 是（自己的）   | 否             | 全部       | 否         |
| `http_status`   | 是（自己的）   | 否        | 是（自己的）   | 否             | 全部       | 否         |
| `latency_ms`    | 是（自己的）   | 否        | 是（自己的）   | 否             | 全部       | 否         |
| `error_code`    | 是（自己的）   | 否        | 是（自己的）   | 否             | 全部       | 否         |
| `error_message` | 是（自己的）   | 否        | 是（自己的）   | 否             | 全部       | 否         |

**备注**

- 用户可以看自己的调用结果和失败原因。
- 上游名字是否直接暴露给用户，V1 建议**谨慎**，可只显示 `primary` / `backup` 这类抽象名。
- `admin` 必须看全量。

---

### 2.7 `leads`

| 字段                                  | user 可读 | user 可写 | affiliate 可读 | affiliate 可写 | admin 可读 | admin 可写 |
| ------------------------------------- | --------- | --------- | -------------- | -------------- | ---------- | ---------- |
| 自己提交的 lead                       | 可选      | 否        | 可选           | 否             | 全部       | 是         |
| `email` / `name` / `company` / `message` / `source` | 提交时可写 | 否     | 提交时可写     | 否             | 全部       | 是         |

**备注**

V1 建议 lead 统一走服务端接口写入，不走前端直写 DB。

---

### 2.8 `admin_audit_logs`

| 字段     | user | affiliate | admin 可读 | admin 可写   |
| -------- | ---- | --------- | ---------- | ------------ |
| 全部字段 | 否   | 否        | 是         | 否（系统写入） |

**备注**

审计日志只能看，不能手动改。

---

### 2.9 分销相关表（V1.1 预留）

若后续增加 `affiliates`、`referrals`、`commissions`、`payouts`：

- **分销商**：只能看自己的 referrals / commissions / payouts。
- **admin**：看全部，可审核与结算。
- **普通用户**：一律不可见。

---

## 三、页面级权限矩阵

### 3.1 公共页面

| 页面         | 未登录 | user | affiliate | admin |
| ------------ | -----: | ---: | --------: | ----: |
| `/` 首页     | 是     | 是   | 是        | 是    |
| `/pricing`   | 是     | 是   | 是        | 是    |
| `/models`    | 是     | 是   | 是        | 是    |
| `/docs`      | 是     | 是   | 是        | 是    |
| `/contact`   | 是     | 是   | 是        | 是    |
| `/login`     | 是     | 是   | 是        | 是    |
| `/register`  | 是     | 是   | 是        | 是    |

---

### 3.2 用户控制台页面

| 页面                  | user   | affiliate | admin |
| --------------------- | -----: | --------: | ----: |
| `/dashboard`          | 是     | 是        | 是    |
| `/dashboard/profile`  | 仅自己 | 仅自己    | 是    |
| `/dashboard/tokens`   | 仅自己 | 仅自己    | 是    |
| `/dashboard/orders`   | 仅自己 | 仅自己    | 是    |
| `/dashboard/usage`    | 仅自己 | 仅自己    | 是    |
| `/dashboard/billing`  | 仅自己 | 仅自己    | 是    |

**说明**

这部分是所有登录用户都该有的。`affiliate` 不应失去普通用户能力。

---

### 3.3 分销商页面

| 页面                               | user | affiliate | admin |
| ---------------------------------- | ---: | --------: | ----: |
| `/dashboard/affiliate`             | 否   | 是        | 是    |
| `/dashboard/affiliate/referrals`   | 否   | 仅自己    | 是    |
| `/dashboard/affiliate/commissions` | 否   | 仅自己    | 是    |
| `/dashboard/affiliate/payouts`     | 否   | 仅自己    | 是    |

**说明**

V1 可以先只做入口和简单列表，不做全自动结算。

---

### 3.4 管理员页面

| 页面                  | user | affiliate | admin |
| --------------------- | ---: | --------: | ----: |
| `/admin`              | 否   | 否        | 是    |
| `/admin/users`        | 否   | 否        | 是    |
| `/admin/tokens`       | 否   | 否        | 是    |
| `/admin/orders`       | 否   | 否        | 是    |
| `/admin/ledger`       | 否   | 否        | 是    |
| `/admin/usage-logs`   | 否   | 否        | 是    |
| `/admin/upstreams`    | 否   | 否        | 是    |
| `/admin/models`       | 否   | 否        | 是    |
| `/admin/audit-logs`   | 否   | 否        | 是    |
| `/admin/affiliates`   | 否   | 否        | 是    |

**说明**

V1 不要求这些页面一次全部做完，但权限设计必须先定好。

---

## 四、接口级权限矩阵

### 4.1 公共接口

| 接口                      | 未登录 | user | affiliate | admin |
| ------------------------- | -----: | ---: | --------: | ----: |
| `GET /api/plans`          | 是     | 是   | 是        | 是    |
| `POST /api/leads`         | 是     | 是   | 是        | 是    |
| `GET /api/models/public`  | 是     | 是   | 是        | 是    |

（实际路径以 DMIT / Next 实现为准；对外公开读建议仍经网关或缓存，避免直连敏感上游元数据。）

---

### 4.2 用户接口

| 接口                   | user   | affiliate | admin |
| ---------------------- | -----: | --------: | ----: |
| `GET /api/me`          | 仅自己 | 仅自己    | 是    |
| `PATCH /api/me`        | 仅自己 | 仅自己    | 是    |
| `GET /api/orders`      | 仅自己 | 仅自己    | 是    |
| `GET /api/usage-logs`  | 仅自己 | 仅自己    | 是    |
| `GET /api/credits`     | 仅自己 | 仅自己    | 是    |

---

### 4.3 Token 接口

| 接口                                      | user                     | affiliate                | admin |
| ----------------------------------------- | ----------------------- | ----------------------- | ----- |
| `GET /api/tokens`                         | 仅自己                  | 仅自己                  | 是    |
| `POST /api/tokens`                        | 仅自己且 `status=active` | 仅自己且 `status=active` | 是    |
| `PATCH /api/tokens/:id`                   | 仅自己 token            | 仅自己 token            | 是    |
| `DELETE /api/tokens/:id`                  | 仅自己 token            | 仅自己 token            | 是    |
| `POST /api/admin/users/:id/tokens/reset`  | 否                      | 否                      | 是    |

**规则**

- `pending` / `paid_pending` / `suspended` 用户不能生成 token。
- 只有 `active` 用户能发 token。

---

### 4.4 支付接口

| 接口                         | user | affiliate | admin |
| ---------------------------- | ---: | --------: | ----: |
| `POST /api/checkout/create`  | 是   | 是        | 是    |
| `POST /api/stripe/webhook`    | 否（仅 Stripe） | 否 | 否（系统级） |
| `GET /api/orders/:id`        | 自己 | 自己      | 是    |

**规则**

- Webhook 不走前台角色权限，而是走 **Stripe 签名验证**。
- 订单状态改动主要由 webhook 或 `admin` 完成。

---

### 4.5 Gateway 接口

| 接口                          | user        | affiliate   | admin       |
| ----------------------------- | ----------- | ----------- | ----------- |
| `GET /v1/models`              | 需有效 token | 需有效 token | 需有效 token |
| `POST /v1/chat/completions`   | 需有效 token | 需有效 token | 需有效 token |

**规则**

Gateway 看的是：

1. token 是否存在
2. token 是否 `active`
3. token 所属用户是否 `active`
4. 模型是否在 token 允许范围

**注意**

这里不是按 Web Session 的 `user` / `affiliate` / `admin` 来判断，而是按 **API token 权限** 来判断。

---

### 4.6 分销接口（V1.1 预留）

| 接口                               | user | affiliate | admin |
| ---------------------------------- | ---: | --------: | ----: |
| `GET /api/affiliate/me`            | 否   | 是        | 是    |
| `GET /api/affiliate/referrals`     | 否   | 仅自己    | 是    |
| `GET /api/affiliate/commissions`   | 否   | 仅自己    | 是    |
| `POST /api/admin/affiliates`       | 否   | 否        | 是    |
| `PATCH /api/admin/commissions/:id` | 否   | 否        | 是    |
| `POST /api/admin/payouts`          | 否   | 否        | 是    |

---

### 4.7 管理员接口

| 接口                                 | user | affiliate | admin |
| ------------------------------------ | ---: | --------: | ----: |
| `GET /api/admin/users`               | 否   | 否        | 是    |
| `PATCH /api/admin/users/:id`         | 否   | 否        | 是    |
| `GET /api/admin/users/:id/tokens`    | 否   | 否        | 是    |
| `PATCH /api/admin/tokens/:id`        | 否   | 否        | 是    |
| `DELETE /api/admin/tokens/:id`       | 否   | 否        | 是    |
| `GET /api/admin/usage-logs`          | 否   | 否        | 是    |
| `GET /api/admin/orders`              | 否   | 否        | 是    |
| `GET /api/admin/ledger`              | 否   | 否        | 是    |
| `GET /api/admin/audit-logs`          | 否   | 否        | 是    |
| `GET /api/admin/upstreams`           | 否   | 否        | 是    |
| `PATCH /api/admin/upstreams/:id`     | 否   | 否        | 是    |

---

## 五、RLS / 服务端写入边界

### 5.1 普通用户 / 分销商可以直接读的

- 自己的 `profiles`
- 自己的 `orders`
- 自己的 `api_tokens` 元数据
- 自己的 `credit_ledger`
- 自己的 `usage_logs`
- `active` 的 `plans`

### 5.2 普通用户 / 分销商可以直接写的

- 自己 profile 中允许编辑的字段
- 几乎没有别的直接写权限

### 5.3 必须由服务端写的

以下只能通过 **DMIT / Next Route Handler / service role** 写：

- `orders.status`
- `credit_ledger`
- `api_tokens` 真实创建与删除
- `usage_logs`
- `admin_audit_logs`
- `leads`
- `profiles.role` / `plan` / `status`
- 所有分销返佣相关表

---

## 六、老板视角：admin 在 V1 应看到的六块

1. **用户经营面板**：多少用户；`pending` / `paid_pending` / `active` / `suspended` 分布。
2. **Token 面板**：谁发了哪些 token；启用/禁用；最近异常。
3. **订单面板**：谁付/未付；失败单；该开通未开通。
4. **账本面板**：加扣额度；异常调整。
5. **调用日志面板**：模型、成败、上游异常、滥用风险。
6. **审计面板**：谁改状态、禁 token、改订单、时间戳。

---

## 七、V1 最终冻结建议

**消费者必须有**

- 登录；看自己状态；看自己 token；建/禁/删自己的 token；看订单；看调用日志；看 Docs。

**分销商 V1 先预留**

- 保留 `affiliate` 角色与页面入口；最多做「邀请链接 + 返佣列表壳」。

**老板 / admin 必须有**

- 开通用户；改 `plan` / `status`；管 token；查订单；查 usage；查审计；管上游。

---

## 八、一句话总纲

- **消费者看自己的，分销商看自己的分销，老板看全局。**
- **前台只展示；核心写操作全部走服务端。**
- **Gateway 不认网页登录角色，只认 API token 权限。**

---

## 九、与仓库 DDL / RLS 的对齐说明

| 项 | 说明 |
| --- | --- |
| `profiles.role` | 当前 [`supabase-schema-v1.sql`](./supabase-schema-v1.sql) 仅校验 `user` \| `admin`。若启用 **`affiliate`**，需一次迁移：`CHECK` 增加 `affiliate`，并补充页面路由守卫与（可选）RLS。 |
| RLS 初稿 | [`docs/supabase-rls-v1.md`](./supabase-rls-v1.md)（叙事与验证清单）；可执行策略与 [`supabase-schema-v1.sql`](./supabase-schema-v1.sql) RLS 段同步。 |
| 用户可改 profile 字段 | 当前库侧用 **触发器** 禁止自改 `role` / `plan` / `status`；`currency` 等是否在 UI 开放需与 **`PATCH /api/me`** 校验一致。 |
| Token 创建 / 改状态 | 矩阵允许用户对自有 token 部分写入；当前 RLS **未**开放 `api_tokens` 的 insert/update — 实现上应由 **DMIT** 暴露接口并用 service role 写库，与矩阵一致。 |

---

## 相关文档

- [`docs/system-spec.md`](./system-spec.md) — V1 范围与数据模型
- [`docs/architecture.md`](./architecture.md) — 部署与安全边界
- [`docs/supabase-schema-v1.sql`](./supabase-schema-v1.sql) — Schema + RLS 初版
- [`docs/supabase-rls-v1.md`](./supabase-rls-v1.md) — RLS 策略说明与迁移补丁片段
