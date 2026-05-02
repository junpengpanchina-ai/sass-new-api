# DMIT 第三批：Gateway（`/v1/models`、`/v1/chat/completions`、`usage_logs`）

主链：**平台 API token → DMIT 校验 → 单上游 OpenAI-compatible → 回包 → 写 `usage_logs`**。

实现：**[`apps/dmit-api/`](../apps/dmit-api/)**（与控制台接口同一进程）。

---

## 鉴权（与 `/api/*` 不同）

| 路径 | 凭据 |
|------|------|
| `/api/me`、`/api/tokens`、… | `Authorization: Bearer <Supabase access token>` |
| `/v1/*` | `Authorization: Bearer <平台 tsk_… token>`（入库为 hash） |

---

## 新增路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/healthz` | 网关存活（与 `/health` 并存） |
| GET | `/v1/models` | 需平台 token；`allowed_models` 为 null 时返回默认列表 |
| POST | `/v1/chat/completions` | 需平台 token + 模型白名单校验 + 上游转发 |

---

## 环境变量（DMIT `.env`）

在原有基础上**必填**：

```env
UPSTREAM_BASE_URL=https://YOUR_UPSTREAM_HOST/v1
UPSTREAM_API_KEY=YOUR_UPSTREAM_API_KEY
UPSTREAM_NAME=grsai-primary
```

`UPSTREAM_BASE_URL` 末尾可多可少 `/`，代码会规范后拼接 `/chat/completions`。

---

## `usage_logs`

- 上游 HTTP 非 2xx：`status: error`
- 模型不允许 / token 禁用 / 用户非 active：`status: denied`（在相关中间件内写入）
- 网关异常：`status: error`，`error_code: gateway_internal_error`

---

## Nginx 公网示例

```nginx
location /healthz {
    proxy_pass http://127.0.0.1:3000/healthz;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /v1/ {
    proxy_pass http://127.0.0.1:3000/v1/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Accept-Language $http_accept_language;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 验证命令

```bash
# 健康
curl -s http://127.0.0.1:3000/healthz

# 模型列表（换成你的平台 token）
curl -s http://127.0.0.1:3000/v1/models \
  -H "Authorization: Bearer YOUR_PLATFORM_TOKEN"

# 聊天（模型须在白名单内，或与上游一致）
curl -s http://127.0.0.1:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PLATFORM_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'
```

随后在 Supabase `usage_logs` 中核对 `ok` / `error` / `denied` 行。

---

## 本批刻意不做

流式输出、多图/视频、多上游路由、fallback、自动扣 `credit_ledger`、RPM/TPM 限流等 — 见主链稳定后再做。

---

## 下一批（建议）

Stripe Webhook → 更新 `orders.status` → 写 `credit_ledger`。

---

## 相关文档

- [第二批：me / tokens / checkout](./dmit-api-batch-two-me-tokens-checkout.md)  
- [第一批：Supabase 连通](./dmit-api-minimal-supabase.md)  
- [system-spec §5.3 Gateway](./system-spec.md)  
