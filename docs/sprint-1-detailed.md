# Sprint 1 详细任务单（逐条到文件/接口级别）

> Sprint 目标：**用户与前台控制层闭环**  
> 交付结果：用户能登录 → 自动/可补齐 profile → 进入 dashboard → 看见 plan/status；联系页可提交 leads。
>
> 约束：严格遵守 `docs/system-spec.md` 的 **V1 冻结范围**。

---

## S1-0 约定与基线

- **Web 技术栈**：Next.js App Router（已存在于 `apps/web`）
- **Auth/DB**：Supabase
- **服务端密钥原则**：
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 只用于客户端读写（受 RLS 约束）
  - `SUPABASE_SERVICE_ROLE_KEY` **只用于服务端**（Route Handlers / Server Actions）

---

## S1-1 Web 路由与页面骨架（已具备雏形，补齐为“可销售演示”）

### 任务

- 固化基础路由：
  - `/`（Landing）
  - `/pricing`
  - `/docs`
  - `/contact`
  - `/login`
  - `/dashboard`（受保护）
  - `/dashboard/models`（已存在）
  - `/dashboard/tokens`（Sprint 3 细化，可先空壳）
  - `/dashboard/usage`（Sprint 5 细化，可先空壳）

### 文件落点（建议）

- `apps/web/src/app/pricing/page.tsx`
- `apps/web/src/app/docs/page.tsx`
- `apps/web/src/app/contact/page.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/dashboard/page.tsx`

### 完成标准

- `npm run dev` 可启动
- 不出现 404；演示路径可访问

---

## S1-2 Supabase 客户端封装（为后续页面与 API 统一）

### 任务

- 新增 Supabase Client（Browser）与 Supabase Client（Server）封装（V1 先做最小）。

### 文件落点（建议）

- `apps/web/src/lib/supabase/browser.ts`
- `apps/web/src/lib/supabase/server.ts`

### 约束

- server 端 client 才能读取 `SUPABASE_SERVICE_ROLE_KEY`
- browser 端绝不接触 service role

### 完成标准

- 能在页面读取当前 session（登录态）
- 能在 Route Handler 使用 service role 写入 `profiles`

---

## S1-3 Supabase Auth（Google OAuth）接入与回调

### 任务

- 配置 Supabase Google Provider（控制台操作）
- Web 侧实现：
  - `/login` 发起 OAuth
  - `/auth/callback` 处理回调并落 session

### 文件落点（建议）

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/auth/callback/route.ts`

### 完成标准

- 用户可完成 Google 登录
- 登录后回到 `/dashboard`
- 未登录访问 `/dashboard` 被拦（见 S1-4）

---

## S1-4 Dashboard 访问控制（Guard）

### 任务

- 对 `/dashboard/**` 做登录保护：
  - 未登录：重定向 `/login`
  - 已登录：放行

### 实现方式（建议）

二选一（先选简单可控的）：

- **方案 A（推荐）**：在 `apps/web/src/middleware.ts` 里拦截 `/dashboard` 路径，检查 Supabase session cookie
- **方案 B**：每个 dashboard page/layout 用 server-side session 校验，不通过则 `redirect("/login")`

### 完成标准

- 未登录访问 `/dashboard`、`/dashboard/models` 会被重定向到 `/login`
- 登录后访问 dashboard 正常

---

## S1-5 `profiles` 表（DB）+ 自动创建/补齐

### 任务

- 在 Supabase 建表 `profiles`（字段见 `docs/system-spec.md`）
- 在登录成功后确保 `profiles` 记录存在（不存在则创建、缺字段则补齐默认值）

### 实现方式（建议）

- 最小可行：在 `/auth/callback`（server route）里用 service role 执行 upsert
- 默认值建议：
  - `role = "user"`
  - `status = "pending"`
  - `plan = "free"`（或空字符串，但建议给默认）

### 完成标准

- 任意新用户首次登录后，`profiles` 必然存在
- dashboard 能稳定读取 `plan/status`

---

## S1-6 Dashboard 显示用户状态（plan/status）

### 任务

- `/dashboard` 页面展示：
  - `plan`
  - `status`
  - “Pending Activation / Active / Suspended” 文案（最小）

### 文件落点（建议）

- `apps/web/src/app/dashboard/page.tsx`
- 可选组件：`apps/web/src/components/StatusBadge.tsx`（如果你开始抽组件）

### 完成标准

- 登录后进入 dashboard 可看到 plan/status
- `status != active` 时给出清晰下一步引导（例如：付款/联系开通）

---

## S1-7 Leads（Contact → API → DB）

### 任务

- 建表：`leads`（字段见 `docs/system-spec.md`）
- 页面：`/contact` 表单提交
- API：`POST /api/leads` 写入 Supabase
- 记录 `source`（页面路径 + 可选 utm/ref）

### 文件落点（建议）

- `apps/web/src/app/contact/page.tsx`
- `apps/web/src/app/api/leads/route.ts`

### 完成标准

- Contact 表单可提交成功
- Supabase 表能看到 leads 记录

---

## S1-8 最小验收（Sprint 1 Definition of Done）

1. `apps/web` 可本地启动
2. 用户可 Google 登录
3. 未登录访问 dashboard 会被拦
4. 登录后自动创建/补齐 `profiles`
5. dashboard 可显示 plan/status
6. contact 提交可写入 leads

