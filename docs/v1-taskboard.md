# V1 开发任务总表（按 Sprint 拆分，给开发直接干）

> 用途：这是**执行清单**，可直接用于排期 / 开工 / 边界对齐。
>
> 冻结原则：**V1 只做主链**，不碰分销自动化、不碰复杂计费、不碰白标、不碰多租户。

---

## 0. V1 最终目标

V1 必须跑通这条主链：

```text
用户登录
→ 看到套餐/状态
→ 完成付款（最小）
→ 管理员开通 active
→ 发放平台 token
→ token 调你自己的 gateway
→ gateway 转发上游
→ 返回真实模型结果
→ 写 usage_logs
→ 管理员可查审计
```

---

## 1. 总体 Sprint 规划

| Sprint   | 名称 | 目标 |
|----------|------|------|
| Sprint 0 | 项目骨架与规范冻结 | 仓库、目录、环境变量、主文档冻结 |
| Sprint 1 | 用户与前台控制层 | 登录、前台、dashboard、profiles |
| Sprint 2 | 支付与人工开通层 | Stripe 最小接入、状态流转 |
| Sprint 3 | Token 系统 | 发 token、禁用 token、删除 token |
| Sprint 4 | Gateway 主链 | `/v1/models`、`/v1/chat/completions` |
| Sprint 5 | 日志与审计 | `usage_logs`、`admin_audit_logs` |
| Sprint 6 | 联调与上线准备 | Web + Supabase + Gateway + Stripe 串联 |

---

## 2. Sprint 0：项目骨架与规范冻结

### S0-1 仓库结构初始化

- **任务**：建立 Monorepo 结构（已完成基础目录）
- **输出**：`apps/web`、`apps/gateway`、`docs/`
- **完成标准**：顶层结构固定；后续不再随意改动

### S0-2 环境变量规范

- **任务**：建立根目录 `.env.example`（已完成；后续按服务拆分可选）
- **完成标准**：不硬编码 key；变量有注释

### S0-3 主规格冻结

- **主文档**：`docs/system-spec.md`（含“V1 冻结范围”）
- **管理员**：`docs/admin-accounts.md`（V1：只做一个 admin + 三类动作）
- **分销**：`docs/affiliate-distribution.md`（已降级为 V1.1 预留）

---

## 3. Sprint 1：用户与前台控制层

> 目标：让前台、登录、用户状态形成最小闭环。

详细任务单见：`docs/sprint-1-detailed.md`

---

## 4. Sprint 2：支付与人工开通层（最小）

- Stripe Checkout/Payment Link
- `/checkout/success`、`/checkout/cancel`
- 支付成功：`profiles.status => paid_pending`
- admin 人工开通：`paid_pending => active`
- 文档 SOP：`docs/manual-onboarding.md`

---

## 5. Sprint 3：Token 系统

- `tokens` 表（只存 hash，不存明文）
- `POST/GET/PATCH/DELETE /api/tokens`
- dashboard token 页面接真数据（create/list/disable/delete）

---

## 6. Sprint 4：Gateway 主链

- `GET /v1/models`
- `POST /v1/chat/completions`
- token 校验 → 用户状态校验 → 模型白名单校验 → 上游转发 → 标准化返回

---

## 7. Sprint 5：日志与审计

- `usage_logs`：成功/失败/拒绝都写
- `admin_audit_logs`：敏感操作 before/after 留痕
- admin 最小接口：开通用户 / 管 token / 查日志

---

## 8. Sprint 6：联调与上线准备

- Web ↔ Gateway 联调（base url 切到自己的 gateway）
- 本地全链路验证：
  1. 用户能登录
  2. 用户能付款
  3. admin 能开通 active
  4. active 用户能创建 token
  5. token 能打通 gateway 并拿到模型结果
- 再上云：Vercel（web）/ DMIT（gateway）/ Supabase / Stripe

---

## 9. “不做清单”（禁止插队）

- affiliate / 分销返佣开发
- payout 结算/提现
- support 子角色
- 白标
- 多租户
- 自动计费
- 自动开通
- 复杂风控
- 高级图表

