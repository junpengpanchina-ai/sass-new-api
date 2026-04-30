# 分析工具设置（GA4 / Umami）

本项目的 `apps/web` 支持通过**环境变量**启用分析脚本注入：

- **Google Analytics 4 (GA4)**
- **Umami Analytics**

两者可同时启用，互不冲突。

> 说明：这是工程配置指南，不是隐私/合规建议。若启用分析，请自备隐私政策与合规评估。

---

## 环境变量

在根目录 `.env.example` 已给出变量名，拷贝到你的本地/部署环境即可：

- `GOOGLE_ANALYTICS_ID`（可选，形如 `G-XXXXXXXXXX`）
- `UMAMI_WEBSITE_ID`（可选，UUID）
- `UMAMI_SCRIPT_URL`（可选；自托管 Umami 才需要。未设置时默认 `https://analytics.umami.is/script.js`）

---

## GA4（Google Analytics 4）

1. 在 Google Analytics 创建/选择数据流
2. 拿到测量 ID（格式：`G-XXXXXXXXXX`）
3. 配置环境变量：

```bash
export GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

---

## Umami

1. Umami Cloud 或自托管 Umami 拿到 Website ID（UUID）
2. 配置环境变量：

```bash
export UMAMI_WEBSITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# 自托管才需要
export UMAMI_SCRIPT_URL=https://<your-umami-domain>/script.js
```

---

## 验证是否注入成功

1. 打开 Web 页面
2. 开发者工具 → Network
3. 刷新页面，确认出现：
   - GA：`https://www.googletagmanager.com/gtag/js`
   - Umami：你配置的 `UMAMI_SCRIPT_URL`

也可以查看页面源代码，确认脚本存在。

