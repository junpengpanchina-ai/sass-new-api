# Token SaaS V1 (hand-rolled)

目标：参考 `new-api` 的产品链路与主链思路，但**不照搬其现成模型/后台逻辑**，手搓一套可控、可追踪、可替换的 V1。

## V1 主链（必须跑通）

```text
用户登录
→ 看到套餐/状态
→ 发放平台 token
→ token 调你自己的网关
→ 你自己的网关转发上游
→ 返回模型结果
→ 写最小日志
```

## 仓库结构（建议）

```text
.
├── apps/
│   ├── web/        # Next.js/前台 + 控制台
│   └── gateway/    # FastAPI/网关（OpenAI-compatible）
├── packages/
│   └── shared/     # 共享类型/校验/常量（可选）
├── docs/
│   └── v1-roadmap.md
└── .env.example
```

## 文档

- 开发顺序与模块清单：见 `docs/v1-roadmap.md`
- V1 开发任务总表（Sprint）：见 `docs/v1-taskboard.md`
- Sprint 1 详细任务单：见 `docs/sprint-1-detailed.md`
- 项目介绍：见 `docs/project-intro.md`
- 系统规格（完整版本）：见 `docs/system-spec.md`
- 用户分销管理：见 `docs/affiliate-distribution.md`
- 管理员账号：见 `docs/admin-accounts.md`
- 分析工具设置（GA4 / Umami）：见 `docs/analytics.md`
- 性能分析设置（pprof / Pyroscope）：见 `docs/performance-profiling.md`
- New API 参考信息（产品/许可证摘要）：见 `docs/new-api-reference.md`
- 控制台：渠道管理（草稿）：见 `docs/console/channel.md`
- 控制台：用户管理（草稿）：见 `docs/console/user.md`
- 控制台：兑换码管理（草稿）：见 `docs/console/redemption.md`
- 控制台：日志与统计（草稿）：见 `docs/console/log.md`
- 控制台：订阅计划管理（草稿）：见 `docs/console/subscription.md`
- 控制台：模型管理（草稿）：见 `docs/console/models.md`
- 控制台：分组管理（草稿）：见 `docs/console/groups.md`
- 控制台：系统设置（草稿）：见 `docs/console/setting.md`
- 控制台：系统设置详细配置（草稿）：见 `docs/console/setting-details.md`
- 控制台：自定义 OAuth 提供商（草稿）：见 `docs/console/custom-oauth.md`
- 控制台：性能监控（草稿）：见 `docs/console/performance-monitoring.md`
- 控制台：文档与关于页配置（草稿）：见 `docs/console/docs-about.md`

## 环境变量

复制 `.env.example` 为本地 `.env`（按各 app 自己的方式加载）。

