# PJ Intelligence V0.1

本地侦查资讯看板。抓取公开资讯，去重后写入 SQLite，按本地规则计算热点分，并在页面上查看。数据库文件由程序自动创建在 `data/intelligence.db`。

## 1. 启动

```bash
cp .env.example .env
docker compose up --build -d
```

## 2. 打开

http://localhost:8765

## 3. 健康检查

```bash
curl http://localhost:8765/api/health
```

## 4. 采集

页面点击「立即采集」，或：

```bash
curl -X POST http://localhost:8765/api/collect
```

## 5. 接入模型

编辑 `.env`，填写：

- `LLM_BASE_URL`：不要带末尾的 `/v1`，程序会请求 `{LLM_BASE_URL}/v1/chat/completions`
- `LLM_API_KEY`
- `LLM_MODEL_FAST`

`LLM_DAILY_LIMIT` 默认 20。`LLM_MODEL_REASONING` 在 V0.1 只保留，不参与调用。

## 6. 注意

- `.env` 不要提交
- 默认不自动消耗模型额度
- 只有点击「AI 研判」才调用模型
