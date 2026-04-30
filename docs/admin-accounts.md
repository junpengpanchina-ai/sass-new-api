# 管理员账号（规格文档）

> 目的：定义管理员账号体系、权限边界、审计与应急流程，确保从 V1 起就“可控、可追责”。

---

## 1. V1 目标

- 管理员可以完成 V1 交付所需的所有“人工操作”
  - 审核用户/开通 `active`
  - 管理 token（禁用/删除/重置）
  - 查看 usage logs（排障与追责）
- 管理动作**可审计**（谁在什么时候改了什么）
- 管理入口**强约束**（最小权限、最少暴露）

---

## 2. 角色与权限模型

### 2.1 最小 RBAC（V1）

建议角色：

- `admin`：全局管理员
- `support`（预留，V1 不实现）：只能查日志/冻结 token，不可改计费与权限策略
- `user`：普通用户

实现方式（V1 简化）：

- `profiles.role`：字符串枚举
- 管理端 API **统一只允许** `role == admin`

> 后续演进：当功能变多，再引入 `permissions` 表或 Casbin/OPA。

---

## 3. 管理员账号生命周期

### 3.1 创建

V1 推荐两种方式（二选一即可）：

1) **白名单邮箱**：只有指定邮箱可被标记为 admin  
2) **手动提升**：已有用户由 super admin 在 DB 中把 `role` 改为 `admin`

### 3.2 登录

V1 复用同一套登录（Supabase Auth / Google OAuth 等）。

要求：

- 管理页面必须校验 `role`
- 未授权直接 403，不显示管理入口

### 3.3 禁用/撤权

- 将 `profiles.role` 降级为 `user`
- 如需临时封禁账号：`profiles.status = suspended`

---

## 4. 管理员功能清单（V1）

> V1 只实现 **一个 admin 角色 + 三类动作**：开通用户、管 token、查日志（并写审计）。

### 4.1 用户管理

- 列表：email / plan / status / created_at
- 操作：
  - `pending` → `active`（人工开通）
  - `active` → `suspended`（封禁）

### 4.2 Token 管理

- 按用户查看 token 列表
- 操作：
  - 禁用/启用 token
  - 软删除 token
  - 重置 token（生成新 token，旧 token 置 `deleted`）

> 安全约束：**任何时候都无法在后台取回 token 明文**（只允许新建时显示一次）。

### 4.3 日志与审计

- 查询 `usage_logs`
  - 按 token_id / user_id / model / status / 时间范围过滤
- 能快速定位：
  - 哪个 token 调了哪个模型
  - 走了哪个上游
  - 被拒绝/失败的原因

---

## 5. 管理 API（建议）

> 所有管理员接口必须：服务端执行 + 强鉴权 + 记录审计。

### 5.1 用户

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
  - body: `{ status?: "active"|"suspended"|..., plan?: string }`

### 5.2 Token

- `GET /api/admin/users/:id/tokens`
- `PATCH /api/admin/tokens/:id`（enable/disable）
- `DELETE /api/admin/tokens/:id`（soft delete）
- `POST /api/admin/users/:id/tokens/reset`（重置并返回一次性明文）

### 5.3 Logs

- `GET /api/admin/usage-logs?from=&to=&token_id=&user_id=&model=&status=`

---

## 6. 审计记录（强烈建议从 V1 开始就做）

新增 `admin_audit_logs`（建议）：

- `id bigserial pk`
- `admin_user_id uuid`
- `action text`（如 `user.activate` / `token.disable`）
- `target_type text`（`user`/`token`/`commission`...）
- `target_id text`
- `before jsonb null`
- `after jsonb null`
- `ip text null`
- `user_agent text null`
- `created_at timestamptz`

最小策略：

- 管理接口写入一条审计记录
- 敏感操作（重置 token / 改 plan / 改 status）必须写 before/after

---

## 7. 安全约束（V1 底线）

- `SUPABASE_SERVICE_ROLE_KEY` **只存在服务端环境变量**，绝不下发前端
- 管理接口统一加：
  - 认证（session/jwt）
  - 授权（role）
  - 速率限制（后续）
  - 审计日志
- 网关与控制台的关键操作都要“可追踪”：
  - token 变更谁做的
  - 用户状态谁改的

---

## 8. 应急预案（V1 最小）

### 8.1 Token 泄露

- 立即禁用/删除 token（后台一键）
- 查询 usage_logs 确认影响范围（模型/时间/上游）
- 必要时封禁用户（status=suspended）

### 8.2 上游异常/被封

- 临时关闭某些模型（allowed_models 规则层面）
- 切换上游配置（gateway）
- 保留日志用于复盘与索赔

