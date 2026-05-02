# Supabase RLS 策略初稿（按权限矩阵落地）

V1 **可执行版**：先把底线立住，不要求一步到位覆盖所有细权限。

配套：[权限矩阵](role-permissions-matrix-v1.md)、[冻结 DDL](supabase-schema-v1.sql)。

---

## 核心原则

1. **前端只读自己该看的**
2. **核心写操作全部走服务端**（DMIT / Next Route Handler + `SUPABASE_SERVICE_ROLE_KEY`）
3. **service role** 才能写订单、账本、日志、token 创建/禁用逻辑、审计、留资等
4. **admin 尽量通过 `/api/admin/*`** 管理数据并写 `admin_audit_logs`，**不要依赖前端直连数据库放开全局写**

---

## 一、结论：V1 RLS 怎么定

### 1. 用户前端可直接读的表

- `profiles`：读自己的
- `plans`：所有人可读 **active** 套餐
- `orders`：只读自己的
- `api_tokens`：只读自己的元数据（不含明文）
- `credit_ledger`：只读自己的流水
- `usage_logs`：只读自己的日志

### 2. 用户前端不要直接写的表

统一走服务端 API：

- `orders`
- `api_tokens`（创建 / hash / 禁用 / 删除）
- `credit_ledger`
- `usage_logs`
- `leads`
- `admin_audit_logs`

### 3. admin 也不要靠前端直写数据库改业务表

建议：**admin 通过 `/api/admin/*` + service role**；必要时审计一并写入。

---

## 二、RLS 落地顺序（操作建议）

1. 给所有业务表开启 RLS  
2. 先写 **公开读 / 本人读** policy  
3. 再写 **本人 update**（若保留）  
4. **复杂写入一律不开放**给 `anon` / `authenticated`  
5. **admin 全局读写**：V1 **不**靠 RLS 放开；走服务端  

---

## 三、与 `profiles` 更新相关的两种做法

### 做法 A（V1 推荐）：RLS 只约束「只能改自己的那一行」

字段级白名单放在 **`PATCH /api/me`**（服务端校验）：例如只允许 `company`、`telegram`、`locale`、`country`、`timezone`。

Postgres RLS **不是**字段级权限系统；单靠 `profiles_update_own` **挡不住**用户把 `role` / `plan` / `status` 塞进请求。

### V1 最稳组合

- **首选**：前端 **不要**直接 `update profiles`，一律 **`/api/me`**。  
- **若仍保留 Supabase 直连更新**：必须在库侧加 **trigger** 禁止本人改 `role` / `plan` / `status`。  
  本仓库已在 [`supabase-schema-v1.sql`](supabase-schema-v1.sql) 中提供 `profiles_prevent_self_privilege_change`。

### 做法 B：纯前端直写且不加重触发器

不推荐 V1 采用，容易把 DB 规则缠复杂。

---

## 四、各表策略摘要

| 表 | SELECT | INSERT/UPDATE/DELETE（JWT） |
| --- | --- | --- |
| `profiles` | 本人 | 可选：本人 `update`（建议改用 `/api/me`）；**无** admin 全局 RLS |
| `plans` | `anon` + `authenticated`，仅 `active = true` | 无 |
| `orders` | 本人 | 无 |
| `api_tokens` | 本人元数据 | 无 |
| `credit_ledger` | 本人 | 无 |
| `usage_logs` | 本人 | 无 |
| `leads` | 无（JWT） | 无 |
| `admin_audit_logs` | **仅** `authenticated` 且 `is_admin()` | 无 |

---

## 五、`is_admin()` 与递归

若在 policy 里写 `exists (select 1 from profiles where …)`，可能触发 **RLS 递归**。  

本仓库使用 **`security definer`** 的 `public.is_admin()`（见 `supabase-schema-v1.sql`）。

即便可读审计表，**V1 仍推荐 admin 列表页走 `/api/admin/*`**，便于分页、过滤与审计一致。

---

## 六、权限边界图（V1）

```text
普通用户前端
  ├─ 直接读：profiles(自己) / plans(active) / orders(自己) / api_tokens(自己) /
  │         credit_ledger(自己) / usage_logs(自己)
  └─ 不直写：orders / api_tokens / ledger / logs / leads / audit

管理员前端
  └─ 主要通过 /api/admin/* + service role，不依赖 RLS 放开全局写

服务端（DMIT / Next Route）
  └─ service role 写：
     profiles.role|plan|status、orders、api_tokens、credit_ledger、
     usage_logs、leads、admin_audit_logs
```

---

## 七、可执行 SQL 汇总版

与仓库 [`docs/supabase-schema-v1.sql`](supabase-schema-v1.sql) **RLS 段已对齐**（policy 名、`to authenticated` / `anon`、`is_admin()` security definer、无 profiles admin RLS）。

若你已跑过旧版 SQL（含 `profiles_select_admin` / `profiles_update_admin`），在 Supabase 中执行：

```sql
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
```

然后重新应用 `supabase-schema-v1.sql` 中的 RLS 段落，或以下等价片段：

```sql
-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- plans
drop policy if exists plans_select_active on public.plans;
create policy plans_select_active on public.plans
  for select to anon, authenticated
  using (active = true);

-- orders / api_tokens / credit_ledger / usage_logs
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists api_tokens_select_own on public.api_tokens;
create policy api_tokens_select_own on public.api_tokens
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists usage_logs_select_own on public.usage_logs;
create policy usage_logs_select_own on public.usage_logs
  for select to authenticated
  using (auth.uid() = user_id);

-- admin_audit_logs（helper 须为 security definer，见主 Schema 文件）
drop policy if exists admin_audit_logs_select_admin on public.admin_audit_logs;
create policy admin_audit_logs_select_admin on public.admin_audit_logs
  for select to authenticated
  using (public.is_admin());
```

---

## 八、跑完后的验证清单

**普通用户**

1. 登录后能读自己的 `profiles`  
2. 能读 `plans`（active）  
3. 能读自己的 `orders`、`api_tokens`、`credit_ledger`、`usage_logs`  
4. 读不到他人的上述数据  
5. 无法用 JWT 对 `orders` / `credit_ledger` / `usage_logs` / `leads` 等执行成功写入  

**admin**

1. 可用 JWT 读 `admin_audit_logs`（若保留该 policy）  
2. **业务上的全局管理**仍以 **`/api/admin/*` + service role** 为准  

---

## 九、硬建议

RLS 初稿到位后，**先不要再堆叠过多 policy**。下一步更应：**让 DMIT（或 Next 服务端）接上 Supabase service role，开始写真实订单、账本、日志与 token 生命周期**。
