# 用户分销管理（V1.1 预留规格文档）

> 目的：定义“用户分销/邀请/返佣/结算”的范围与数据模型，避免过早平台化，同时给后续演进留好接口。
>
> **重要**：本文档不属于 V1 开发范围。V1 只允许做“字段预留”，不得进入返佣/结算/后台功能开发。

---

## 1. V1 立场（只预留，不开发）

### 1.1 V1 允许做（仅预留位）

V1 只保留最小预留位，避免后续迁移成本：

- **`profiles.role`**：未来可能出现 `affiliate`
- **`leads.source`**：保留来源字段（可落地 `ref`/utm 等）

### 1.2 V1 明确不做（全部后移到 V1.1+）

- `affiliates` / `referrals` / `commissions` / `payouts` 表与任何业务逻辑
- 邀请链接/邀请码的落地与归因闭环
- 返佣条目生成、审核、结算、提现
- affiliate 控制台与 admin 返佣后台
- 复杂等级体系、复杂风控、复杂对账

---

## 2. 角色与权限（V1.1+）

### 2.1 角色

- **普通用户（user）**：可被邀请、可购买
- **分销商（affiliate）**：拥有邀请码/邀请链接，可查看自己的分销数据
- **管理员（admin）**：可审核分销商、调整返佣、发起/记录结算

> 实现建议：V1 先用 `profiles.role`（`user`/`affiliate`/`admin`）+ `profiles.status` 控制访问。

---

## 3. 关键概念与状态机

### 3.1 归因规则（建议）

归因对象：**注册**和/或**付款**。

V1 最简规则：

- 邀请链接携带 `ref`（邀请码）
- 首次落 cookie/localStorage（或保存到 DB 的 `leads.source`）
- 注册时把 `referred_by` 固化到用户（避免后续篡改）
- 付款成功时按 `referred_by` 生成返佣条目

### 3.2 返佣状态（建议）

```text
pending   # 已生成，待管理员确认（例如 7 天退款期后）
approved  # 通过审核，可结算
paid      # 已结算（记录打款/转账信息）
reversed  # 退款/风控撤销
```

---

## 4. 数据模型（建议）

> 以下为建议表，V1 可以只落必要字段；其余字段可后续补齐。

### 4.1 `affiliates`

- `id uuid pk`（= profiles.id）
- `code text unique`（邀请码）
- `status text`（`active`/`suspended`）
- `default_commission_rate numeric`（例如 0.2 = 20%）
- `created_at timestamptz`

### 4.2 `referrals`

记录“谁邀请了谁”：

- `id bigserial pk`
- `affiliate_id uuid`
- `referred_user_id uuid null`（注册后填）
- `lead_id bigint null`（留资）
- `first_seen_at timestamptz`
- `signed_up_at timestamptz null`
- `converted_at timestamptz null`（付款/激活）

### 4.3 `commissions`

返佣条目（最重要）：

- `id bigserial pk`
- `affiliate_id uuid`
- `user_id uuid`（被邀请的付费用户）
- `payment_id bigint null`
- `amount_gross int`（订单金额，分为单位）
- `amount_commission int`（返佣金额）
- `currency text`
- `rate numeric`
- `status text`（pending/approved/paid/reversed）
- `created_at timestamptz`

### 4.4 `payouts`（V1 可仅“记录”，不做真实打款）

- `id bigserial pk`
- `affiliate_id uuid`
- `amount_total int`
- `currency text`
- `method text`（manual/stripe/crypto... V1=manual）
- `reference text null`（转账凭证/备注）
- `status text`（created/paid/failed）
- `created_at timestamptz`

---

## 5. 控制台功能（V1.1+）

> 本章节为 V1.1+ 预研规格，**不得进入 V1 任务板**。

### 5.1 分销商视角

- **我的邀请码/邀请链接**
- **邀请统计**
  - visits（可选）
  - signups（注册数）
  - conversions（成交数）
- **返佣明细**
  - pending / approved / paid

### 5.2 管理员视角（最小）

- 分销商列表与状态
- 返佣条目审核（pending→approved）
- 结算记录录入（approved→paid）

---

## 6. API 建议（V1.1+）

> 本章节为 V1.1+ 预研规格，**不得进入 V1 任务板**。

### 6.1 分销商接口

- `GET /api/affiliate/me`
- `GET /api/affiliate/referrals`
- `GET /api/affiliate/commissions`

### 6.2 管理员接口

- `POST /api/admin/affiliates`（开通/生成 code）
- `PATCH /api/admin/commissions/:id`（approve/reverse）
- `POST /api/admin/payouts`（记录 paid）

---

## 7. 风控底线（V1.1+ 最小）

- 邀请关系一旦在注册时固化，**不允许用户自助修改**
- 返佣从“支付完成”开始计算，但可加人工审核期（例如退款期后 approve）
- 任何异常（退款/拒付/风控）可 `reversed`

---

## 8. 演进路线（V1.1+）

- 自动化结算（先 Stripe Connect，再扩展其他）
- 多级分销/团队体系（慎重，复杂度暴涨）
- 更强归因（多触点、跨设备）
- 反作弊与风控体系（IP/设备/行为）

