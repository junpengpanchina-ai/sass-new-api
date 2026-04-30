# 性能分析设置（Gateway：pprof 风格 / Pyroscope）

本项目在 `apps/gateway`（FastAPI）里提供两类性能分析能力：

- **pprof 风格（临时诊断）**：通过 `/debug/pprof/` 暴露 profile 端点（可选启用）
- **Pyroscope（持续 profiling，可选）**：适合线上持续分析与火焰图可视化

两者可同时启用，互不冲突。

> 说明：Python 生态没有 Go `pprof` 完全同构的能力。这里的“pprof 风格”指：提供类似路径/开关方式的临时 profile 入口（基于 `pyinstrument`）。

---

## 1) pprof 风格（内置路由，可选）

### 配置环境变量

```bash
export ENABLE_PPROF=true
```

### 安装可选依赖

```bash
cd apps/gateway
pip install -e ".[profiling]"
```

### 验证与访问

- `GET /debug/pprof/`：索引与可用端点
- `GET /debug/pprof/profile?seconds=10&format=html`：生成 HTML 报告
- `GET /debug/pprof/profile?seconds=10&format=text`：生成文本报告

---

## 2) Pyroscope（可选持续 profiling）

### 准备 Pyroscope 服务

确保 Pyroscope 服务可访问，例如：

```text
http://localhost:4040
```

### 配置环境变量

```bash
export PYROSCOPE_URL=http://localhost:4040
export PYROSCOPE_APP_NAME=token-saas-gateway
export PYROSCOPE_BASIC_AUTH_USER=
export PYROSCOPE_BASIC_AUTH_PASSWORD=
export HOSTNAME=local
```

### 安装可选依赖

```bash
cd apps/gateway
pip install -e ".[profiling]"
```

### 验证

1. 打开 Pyroscope UI
2. 选择 `PYROSCOPE_APP_NAME` 对应应用
3. 若设置了 `HOSTNAME`，可用于实例维度区分

---

## 环境变量参考

| 变量 | 必需 | 默认值 | 说明 |
|---|---|---|---|
| `ENABLE_PPROF` | 否 | `false` | 启用 `/debug/pprof/` 临时诊断端点 |
| `PYROSCOPE_URL` | 否 | - | Pyroscope 服务地址 |
| `PYROSCOPE_APP_NAME` | 否 | - | Pyroscope 应用标识 |
| `PYROSCOPE_BASIC_AUTH_USER` | 否 | - | Pyroscope Basic Auth 用户名 |
| `PYROSCOPE_BASIC_AUTH_PASSWORD` | 否 | - | Pyroscope Basic Auth 密码 |
| `PYROSCOPE_MUTEX_RATE` | 否 | - | 预留变量（Python client 不同构，当前忽略） |
| `PYROSCOPE_BLOCK_RATE` | 否 | - | 预留变量（Python client 不同构，当前忽略） |
| `HOSTNAME` | 否 | - | 实例标识（可选标签） |

