# DMIT 后端下一批接口（`/api/me` / `/api/tokens` / `/api/checkout`）

目标：**认用户 → 能发 token（仅 `active`）→ 能创建订单壳（`orders.status = created`）**。不接 Stripe Checkout Session、Webhook、gateway、`usage_logs` / `credit_ledger` 扣费。

实现代码：**[`apps/dmit-api/`](../apps/dmit-api/)**。

---

## 鉴权

前端在 Supabase 登录后，请求 DMIT 时带头：

```http
Authorization: Bearer <supabase_access_token>
```

DMIT 使用 `supabaseAdmin.auth.getUser(access_token)` 校验 JWT，再用 **service role** 读写数据库（与文档中用单独 Client + header 等价，写法更简单）。

---

## 路由一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/me` | 当前用户 + profile |
| PATCH | `/api/me` | 仅 `company` / `telegram` / `locale` / `country` / `timezone` |
| GET | `/api/tokens` | 本人 token 列表（不含 `deleted`） |
| POST | `/api/tokens` | 创建 token（需 `profile.status === active`）；一次性返回 `plain_token` |
| PATCH | `/api/tokens/:id` | `status` 为 `active` \| `disabled` |
| DELETE | `/api/tokens/:id` | 软删：`status = deleted` |
| POST | `/api/checkout/create` | body `{ "plan_code": "starter" }`；插入 `orders` 占位 |

---

## Nginx（公网）

在现有反代基础上增加（示例）：

```nginx
location /api/me {
    proxy_pass http://127.0.0.1:3000/api/me;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/tokens {
    proxy_pass http://127.0.0.1:3000/api/tokens;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/checkout/ {
    proxy_pass http://127.0.0.1:3000/api/checkout/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**务必转发 `Authorization`**，否则浏览器经 Nginx 会丢 Bearer。

---

## 本机验证（换真实 token）

```bash
export TOKEN='YOUR_SUPABASE_ACCESS_TOKEN'

curl -s http://127.0.0.1:3000/api/me -H "Authorization: Bearer $TOKEN"

curl -s -X PATCH http://127.0.0.1:3000/api/me \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"locale":"en"}'

curl -s http://127.0.0.1:3000/api/tokens -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://127.0.0.1:3000/api/tokens \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"My First Token"}'

curl -s -X POST http://127.0.0.1:3000/api/checkout/create \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"plan_code":"starter"}'
```

创建 token 要求 **`profiles.status === active`**；否则返回 `403` + `User is not active`。

---

## 完成标准

- [ ] `GET/PATCH /api/me` 正常  
- [ ] `GET/POST/PATCH/DELETE /api/tokens` 正常  
- [ ] `POST /api/checkout/create` 写入一条 `orders`（`status: created`）  
- [ ] Nginx 公网路径 + `Authorization` 转发可用  

---

## 相关文档

- [第一批：接 Supabase](./dmit-api-minimal-supabase.md)  
- [架构与密钥](./architecture.md)  
- [Schema V1](./supabase-schema-v1.sql)  
