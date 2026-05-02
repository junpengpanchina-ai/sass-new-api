# DMIT 后端接 Supabase 的最小实现清单

与 [`architecture.md`](./architecture.md) 一致：**Vercel** 只放公开连接变量；**DMIT** 放敏感密钥；**Supabase** 放业务数据与可运营配置；**GRSAI / Stripe / Service Role** 仅由 DMIT 使用。

可部署代码在仓库 **`apps/dmit-api/`**；服务器上可同步到 `/root/dmit-api` 后按本文启动。

---

## 0. 目标

本阶段不做完整业务，只让 DMIT 具备：

1. 安全连接 Supabase  
2. 读基础业务表  
3. 为后续服务端写库（订单、账本、token、日志）打底  
4. 作为 Stripe / GRSAI / token 主链的后端底座  

---

## 1. 边界

### DMIT 负责（当前 + 后续）

- 使用 `SUPABASE_SERVICE_ROLE_KEY` 读写数据库  
- 创建订单、写 `credit_ledger`、发 `api_tokens`、写 `usage_logs` / `admin_audit_logs`  
- Stripe Webhook、GRSAI 转发  

### 本阶段刻意不做

- 完整后台、复杂支付编排、复杂上游路由、自动开通、分销、大监控面板  

---

## 2. DMIT 环境变量最小集

### 2.1 基础

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
```

### 2.2 Supabase

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### 2.3 Token 安全

```env
TOKEN_PEPPER=CHANGE_TO_A_LONG_RANDOM_SECRET
```

### 2.4 预留（可空）

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GRSAI_API_KEY=
GRSAI_BASE_URL=
```

复制 `apps/dmit-api/.env.example` 为 `.env` 并填真实值（**勿提交 .env**）。

---

## 3. 项目目录

仓库内：

```text
apps/dmit-api/
├── src/
│   ├── index.js
│   ├── routes/
│   │   ├── health.js
│   │   ├── system.js
│   │   ├── plans.js
│   │   ├── me.js          # 占位，未挂载
│   │   └── admin.js       # 占位，未挂载
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── env.js
│   │   └── logger.js
│   └── middleware/
│       ├── auth.js        # 占位
│       └── admin.js       # 占位
├── package.json
├── .env.example
└── ecosystem.config.cjs
```

---

## 4. 安装与启动

```bash
cd apps/dmit-api
npm install
cp .env.example .env   # 编辑 .env
node src/index.js
```

PM2（服务器示例）：

```bash
cd /root/dmit-api   # 或你的部署路径
pm2 delete dmit-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
```

若此前入口是仓库根目录单文件 `index.js`，改为 **`src/index.js`**（或 `ecosystem.config.cjs` 中的 `script`）。

---

## 5. 本机验证

```bash
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:3000/api/system/health
curl -s http://127.0.0.1:3000/api/plans
```

期望：

- `/health`：`ok: true`，`status: healthy`  
- `/api/system/health`：`supabase: connected`，`plans_sample_count` ≥ 0（有种子数据时可为 1）  
- `/api/plans`：`ok: true`，`data` 为 active 套餐列表  

---

## 6. Nginx 公网

在现有 `/api/health` → `http://127.0.0.1:3000/health` 之外，增加：

- `location /api/system/` → 反代到 `http://127.0.0.1:3000/api/system/`  
- `location /api/plans` → 反代到 `http://127.0.0.1:3000/api/plans`  

示例（按你实际 `server` 块合并）：

```nginx
location /api/system/ {
    proxy_pass http://127.0.0.1:3000/api/system/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/plans {
    proxy_pass http://127.0.0.1:3000/api/plans;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

公网验证：

```bash
curl -s "http://YOUR_IP/api/system/health"
curl -s "http://YOUR_IP/api/plans"
```

---

## 7. 本阶段不要做的接口

先不做：`/api/tokens`、`/api/orders`、`/api/checkout/create`、`/api/stripe/webhook`、`/v1/chat/completions` 等。  
当前目标：**证明 DMIT 已能安全连上 Supabase 并读业务表**。

---

## 8. 完成标准（勾选）

- [ ] DMIT `.env` 已配置  
- [ ] `supabaseAdmin` 能初始化  
- [ ] `GET /api/system/health` 返回 `supabase: connected`  
- [ ] `GET /api/plans` 返回真实套餐数据  
- [ ] Nginx 公网可访问上述两路径  

---

## 9. 变量放哪（拍板）

| 位置 | 内容 |
| ---- | ---- |
| **Vercel** | `NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_SITE_URL` |
| **DMIT** | `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`TOKEN_PEPPER`、`STRIPE_*`、`GRSAI_*` |
| **Supabase** | 套餐、上游与模型配置、token 元数据、订单、账本、日志、系统设置等（非平台总密钥明文） |

---

## 10. 完成后可交给排期的材料

1. `curl http://127.0.0.1:3000/api/system/health` 的 JSON  
2. `curl http://127.0.0.1:3000/api/plans` 的 JSON  
3. 公网 `GET /api/system/health` 的 JSON  

下一批接口：`tokens` / `me` / `checkout` 的最小实现（另文档或 Sprint）。

---

## 相关文档

- [`docs/architecture.md`](./architecture.md)  
- [`docs/supabase-schema-v1.sql`](./supabase-schema-v1.sql)  
- [`docs/supabase-rls-v1.md`](./supabase-rls-v1.md)  
