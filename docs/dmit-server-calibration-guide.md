# DMIT 服务器校准手册（Tokfai / sass-new-api）

> **用途**：在单台 DMIT（或同类 VPS）上逐项核对「系统 → 网络 → 进程 → 应用 → 数据库 → 账本 RPC」是否与当前仓库设计一致。  
> **用法**：在 Termius SSH 登录后，自上而下执行；每节末尾有「完成标准」勾选。  
> **约定**：文中 `YOUR_PUBLIC_IP`、`YOUR_DOMAIN`、`/opt/sass-new-api` 请替换为你环境真实值；**勿**把 `.env`、密钥、token 明文贴进工单或聊天。

---

## 0. 架构角色（校准边界）

| 组件 | 职责 | 校准要点 |
|------|------|----------|
| **DMIT 本机** | 跑 Node（`dmit-api`）、Nginx 反代、系统防火墙 | 端口、进程、磁盘、时间 |
| **Nginx** | 公网 80/443 → 本机 `127.0.0.1:PORT` | `location` 与上游端口一致 |
| **PM2** | 守护 Node、开机自启 | `online`、日志无持续报错 |
| **Supabase** | 数据与账本、RPC | 迁移顺序、RPC 仅 `service_role` |
| **Vercel** | 前端与 `NEXT_PUBLIC_*` | 不持有 service_role / 上游 key |

敏感变量**只**应出现在 DMIT 的 `apps/dmit-api/.env`（或等价环境注入），不得进 Vercel 的 public 变量。

---

## 1. 服务器身份与基线

在 SSH 内执行：

```bash
hostname
uname -a
date -u
whoami
df -h /
free -h
```

**完成标准**

- [ ] 主机名、系统版本与预期一致（例如 Ubuntu 24.04 LTS）。
- [ ] UTC 时间合理（避免 JWT / 日志时间漂移）。
- [ ] 根分区磁盘余量充足（建议 ≥ 15% 空闲，视日志量调整）。

---

## 2. SSH 与会话稳定性

```bash
systemctl is-active ssh || systemctl is-active sshd
ss -tlnp | grep -E ':22|:2222'
sshd -t && echo "sshd config OK"
```

**完成标准**

- [ ] `ssh`（或 `sshd`）为 `active`。
- [ ] 你实际使用的端口在监听（常见：`22`、`2222` 备用）。
- [ ] `sshd -t` 无语法错误。

**建议**

- 保留稳定登录路径前，勿单独关闭 22 或 2222；确认密钥登录稳定后再收紧策略。
- 大规模改 `sshd_config` 前先备份：`sudo cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F)`.

---

## 3. UFW 防火墙

```bash
sudo ufw status verbose
```

**完成标准（当前阶段典型）**

- [ ] `22/tcp`、`2222/tcp`（若使用）、`80/tcp`、`443/tcp` 等与策略一致。
- [ ] 未误关 SSH 端口。

```bash
# 仅示例，按你的策略调整，勿盲目复制
# sudo ufw allow 22/tcp
# sudo ufw allow 80/tcp
# sudo ufw allow 443/tcp
```

---

## 4. fail2ban（若已安装）

```bash
systemctl is-active fail2ban 2>/dev/null || echo "fail2ban not installed"
sudo fail2ban-client status sshd 2>/dev/null || true
```

**完成标准**

- [ ] 若已启用：服务 `active`，且未把自己锁死（保留救援通道）。

---

## 5. Nginx

```bash
systemctl is-active nginx
sudo nginx -t
curl -sI -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
```

**完成标准**

- [ ] Nginx `active`，`nginx -t` 通过。
- [ ] 本机 HTTP 有响应（具体状态码依站点配置）。

**与应用的对应关系（必须一致）**

- Express 挂载了：`/`、`/health`、`/healthz`、`/api/*`、`/v1/*`（见 `apps/dmit-api/src/index.js`）。
- Nginx 需把公网路径反代到 **`http://127.0.0.1:<PORT>`**，其中 `<PORT>` **等于** `dmit-api` 的 `PORT`（常见生产为 `8010`；仓库 `.env.example` 写的是 `3000`，以服务器实际 `.env` 为准）。

典型核对项：

- [ ] `location /health` 或等价路径 → 上游 `/health`
- [ ] `location /api/` → 上游 `/api/`（含 `/api/health` 若你配置了该前缀）
- [ ] `location /v1/` → 上游 `/v1/`

修改 Nginx 后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Node.js 与 PM2

```bash
node -v
npm -v
pm2 -v
pm2 status
pm2 logs dmit-api --lines 40 --nostream
systemctl is-active pm2-root 2>/dev/null || true
```

**完成标准**

- [ ] Node 主版本与项目要求一致（当前仓库生态常用 **Node 20**）。
- [ ] `dmit-api` 状态为 **`online`**，重启后仍能拉起（`pm2 save` + `pm2-root.service` 已配置时检查 `systemctl`）。

**代码目录（不要混用旧路径）**

- 当前应以仓库为准：例如 **`/opt/sass-new-api/apps/dmit-api`**。
- 若仍存在历史目录（如 `/root/dmit-api`），校准目标应是：**PM2 `cwd` / `script` 指向现用目录**，且仅一套进程监听业务端口。

`ecosystem.config.cjs` 中 `cwd` 必须为服务器上 `dmit-api` 根目录（含 `package.json` / `src/index.js`）。

---

## 7. `dmit-api` 环境变量（`.env`）

对照 `apps/dmit-api/.env.example` 与 `apps/dmit-api/src/lib/env.js` **必填项**：

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅后端，高权限 |
| `TOKEN_PEPPER` | Token hash 盐，仅后端 |
| `UPSTREAM_BASE_URL` | 上游 OpenAI-compatible Base（如 `…/v1`） |
| `UPSTREAM_API_KEY` | 上游 API Key |
| `HOST` | 建议 `127.0.0.1`（只本机监听，由 Nginx 暴露公网） |
| `PORT` | 与 Nginx `proxy_pass` 端口一致 |

**可选（功能增强）**

| 变量 | 说明 |
|------|------|
| `UPSTREAM_NAME` | 写入 `usage_logs.upstream_name`，默认 `grsai-primary` |
| `CHAT_COMPLETION_CREDIT_COST` | 每次聊天扣费 credits，默认 `1` |
| `NODE_ENV` | `production` |

**不要在 DMIT 上做的事**

- 把 `SUPABASE_SERVICE_ROLE_KEY`、上游 Key、`TOKEN_PEPPER` 写进前端仓库或 Vercel `NEXT_PUBLIC_*`。

---

## 8. 本机直连 API（绕过 Nginx）

将 `PORT` 换成 `.env` 中的值（示例用 `8010`）：

```bash
PORT=8010

curl -sS "http://127.0.0.1:${PORT}/" | head
curl -sS "http://127.0.0.1:${PORT}/health"
curl -sS "http://127.0.0.1:${PORT}/healthz" 2>/dev/null || true
curl -sS "http://127.0.0.1:${PORT}/api/system/health"
```

**完成标准**

- [ ] `/health` 返回 JSON 且含健康字段（见 `routes/health.js`）。
- [ ] `/api/system/health` 能证明 **Supabase 连通**（具体字段以当前 `routes/system` 实现为准）。

---

## 9. 经 Nginx 的公网路径（与 8 对照）

```bash
IP=YOUR_PUBLIC_IP

curl -sS "http://${IP}/health"
curl -sS "http://${IP}/api/system/health"
```

若你配置了 `/api/health` → 上游 `/health`：

```bash
curl -sS "http://${IP}/api/health"
```

**完成标准**

- [ ] 公网结果与「本机 `127.0.0.1:PORT`」一致或符合你设计的代理映射。
- [ ] 若 HTTPS 已启用，再测 `https://YOUR_DOMAIN/...`（证书链、Cloudflare SSL 模式另表）。

---

## 10. 网关 OpenAI-compatible（`/v1`）

```bash
IP=YOUR_PUBLIC_IP
TOKEN='YOUR_PLATFORM_API_TOKEN'

curl -sS "http://${IP}/v1/models" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json"

curl -sS "http://${IP}/v1/chat/completions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: zh-CN" \
  -d '{"model":"YOUR_MODEL_ID","messages":[{"role":"user","content":"ping"}],"temperature":0.2}'
```

**完成标准**

- [ ] `/v1/models` 在 token 合法时返回模型列表。
- [ ] `/v1/chat/completions` 在上游正常时返回 200；额度不足时为 **402**（若已启用扣费逻辑）。

---

## 11. Admin API（需 Supabase 用户 JWT + `profiles.role = admin`）

Admin 路由前缀：`/api/admin/*`（见 `src/index.js`）。

示例（将 `JWT` 换为管理员会话的 `access_token`，将 `HOST` 换为 DMIT 域名或 IP）：

```bash
HOST=https://YOUR_DOMAIN_OR_IP
JWT='YOUR_SUPABASE_ACCESS_TOKEN'

curl -sS "${HOST}/api/admin/dashboard" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Accept: application/json"
```

**完成标准**

- [ ] 非 admin 返回 **403**。
- [ ] admin 返回 `ok: true` 且数据结构符合当前 `admin.dashboard` 实现。

---

## 12. Supabase 数据库与账本（执行顺序）

在 **Supabase SQL Editor** 按顺序执行（已做过可跳过，但需确认对象存在）：

1. `docs/supabase-migration-profiles-credits.sql` — `profiles` 额度列  
2. `docs/supabase-migration-credit-ledger-extras.sql` — `credit_ledger` 扩展列（`credits` / `request_id` / `usage_log_id`）  
3. `docs/supabase-rpc-credits.sql` — `rpc_grant_admin_credits`、`rpc_deduct_chat_credits` + **仅 `service_role` EXECUTE**

**完成标准**

- [ ] 三份脚本无报错（若 `REVOKE FROM anon` 报错，按你实例角色名调整）。
- [ ] 在 SQL Editor 中可查到函数定义（`pg_proc` / Dashboard Functions）。

---

## 13. 扣费与 RPC 行为（逻辑校准）

| 场景 | 期望 |
|------|------|
| 管理员在 Web `/admin/credit-ledger` 手工加额 | 写 `credit_add`，`profiles` 余额与 `credits_total_recharged` 一致；若已部署 RPC，接口返回中带 **`via_rpc: true`**（以当前后端为准）。 |
| 成功聊天补全后 | `usage_logs` 有 `credits_charged`、`credit_ledger_id`；`credit_ledger` 有 `credit_deduct`；`profiles.credits_balance` 递减。 |
| 余额不足 | **402**，不调上游；`usage_logs` 为 `denied` / `insufficient_credits`（以当前实现为准）。 |

---

## 14. 备份与快照（强烈建议每次里程碑后做）

**DMIT 控制台**：创建实例快照（命名建议带日期与状态，例如 `HGK-api-rpc-ok-YYYY-MM-DD`）。

**机内目录备份示例**（路径按你习惯调整）：

```bash
BACKUP_DIR="/root/server-backup/calib-$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"

sudo cp -a /opt/sass-new-api "$BACKUP_DIR/sass-new-api" 2>/dev/null || sudo cp -a /root/sass-new-api "$BACKUP_DIR/sass-new-api"
sudo cp -a /etc/nginx "$BACKUP_DIR/etc_nginx"
sudo cp -a /etc/ssh "$BACKUP_DIR/etc_ssh"
sudo cp -a /etc/ufw "$BACKUP_DIR/etc_ufw"
sudo cp -a /etc/fail2ban "$BACKUP_DIR/etc_fail2ban" 2>/dev/null || true
sudo cp -a /root/.pm2 "$BACKUP_DIR/root_pm2" 2>/dev/null || true

pm2 status >"$BACKUP_DIR/pm2-status.txt"
ss -tlnp >"$BACKUP_DIR/ports.txt"
sudo ufw status numbered >"$BACKUP_DIR/ufw-status.txt" 2>/dev/null || true

echo "BACKUP_DIR=$BACKUP_DIR"
```

**完成标准**

- [ ] 快照 + 机内备份至少完成其一；**改 Nginx / SSH / 大版本升级前**优先双做。

---

## 15. 常见问题速查

| 现象 | 优先检查 |
|------|----------|
| 公网 502 / 504 | Nginx `error.log`；上游 `127.0.0.1:PORT` 是否监听；`PORT` 与反代是否一致 |
| `curl` 本机通、公网不通 | UFW、云厂商安全组、Nginx `server_name` / `listen` |
| PM2 `errored` / 重启循环 | `pm2 logs dmit-api`；`.env` 缺必填项会启动失败 |
| Supabase 连不上 | `SUPABASE_URL` / Key；出站 HTTPS；项目是否暂停 |
| 上游超时 | `UPSTREAM_BASE_URL`、上游可用性、服务器出站网络 |
| 扣费异常 | `credit_ledger` / `profiles` 列与 RPC 是否已部署；`usage_logs.user_id` 与 RPC 条件是否匹配 |

---

## 16. 整页校准清单（总表）

- [ ] SSH 稳定，`sshd -t` 通过  
- [ ] UFW / 安全组与业务端口一致  
- [ ] Nginx `nginx -t` 通过，反代端口与 `dmit-api` 一致  
- [ ] PM2 `dmit-api` **online**，日志无持续异常  
- [ ] `.env` 必填项齐全，**密钥未进前端**  
- [ ] `127.0.0.1:PORT/health` 与公网健康检查通过  
- [ ] `/api/system/health` 证明 Supabase 可达  
- [ ] `/v1/models` + `/v1/chat/completions` 主链可用（含扣费预期）  
- [ ] Admin 接口 admin 账号可访问  
- [ ] Supabase：profiles 额度列、ledger 扩展列、RPC 已部署  
- [ ] 快照或机内备份已做  

---

## 17. 文档与仓库索引

| 文档 | 内容 |
|------|------|
| `docs/supabase-schema-v1.sql` | 核心表与约束参考 |
| `docs/supabase-schema-ops-v1.sql` | Ops 产品/客户/订单表 |
| `docs/supabase-migration-profiles-credits.sql` | 用户额度列 |
| `docs/supabase-migration-credit-ledger-extras.sql` | 账本扩展列 |
| `docs/supabase-rpc-credits.sql` | 原子加额 / 原子扣费 RPC |
| `docs/tokfai-platform-handbook.md` | 平台总览与 Nginx 片段参考 |

---

**版本说明**：本文档随仓库演进；若 `src/index.js` 路由或 `env.js` 必填项变更，以代码为准并更新本节对照表。
