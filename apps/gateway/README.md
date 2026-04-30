# Gateway (FastAPI)

最小网关骨架 + 可选性能分析（pprof 风格端点 / Pyroscope）。

## 本地运行

建议 Python 3.11+。

```bash
cd apps/gateway
python -m venv .venv
source .venv/bin/activate

pip install -e .
uvicorn gateway.app:create_app --factory --host 0.0.0.0 --port 8000
```

## 可选：开启 profiling 依赖

```bash
pip install -e ".[profiling]"
```

## 健康检查

- `GET /healthz`

## pprof（临时诊断端点）

启用：

```bash
export ENABLE_PPROF=true
```

访问：

- `GET /debug/pprof/`
- `GET /debug/pprof/profile?seconds=10&format=html`

## Pyroscope（持续 profiling，可选）

设置：

```bash
export PYROSCOPE_URL=http://localhost:4040
export PYROSCOPE_APP_NAME=token-saas-gateway
export HOSTNAME=local
```

