import Link from "next/link";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
      <aside className="card" style={{ padding: 16, height: "calc(100dvh - 48px)", position: "sticky", top: 24 }}>
        <div style={{ display: "grid", gap: 10, height: "100%" }}>
          <div>
            <div className="pill">Console</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Token SaaS</div>
            <div className="muted" style={{ fontSize: 13 }}>
              个人设置 / 安全
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link className="btn" href="/console" style={{ justifyContent: "flex-start" }}>
              数据看板（Overview）
            </Link>
            <Link className="btn" href="/console/personal" style={{ justifyContent: "flex-start" }}>
              个人设置（Personal）
            </Link>
            <Link className="btn" href="/console/token" style={{ justifyContent: "flex-start" }}>
              令牌（Tokens）
            </Link>
            <Link className="btn" href="/console/playground" style={{ justifyContent: "flex-start" }}>
              操练场（Playground）
            </Link>
            <Link className="btn" href="/console/log" style={{ justifyContent: "flex-start" }}>
              日志（Usage Log）
            </Link>
            <Link className="btn" href="/console/topup" style={{ justifyContent: "flex-start" }}>
              钱包管理（Topup）
            </Link>
            <Link className="btn" href="/console/subscription" style={{ justifyContent: "flex-start" }}>
              订阅（Subscription）
            </Link>
            <Link className="btn" href="/console/task" style={{ justifyContent: "flex-start" }}>
              任务（Tasks）
            </Link>
            <Link className="btn" href="/pricing" style={{ justifyContent: "flex-start" }}>
              定价（Pricing）
            </Link>
            <Link className="btn" href="/dashboard/models" style={{ justifyContent: "flex-start" }}>
              返回后台 → 模型
            </Link>
            <Link className="btn" href="/" style={{ justifyContent: "flex-start" }}>
              返回首页
            </Link>
          </div>

          <div className="muted" style={{ fontSize: 12, marginTop: "auto" }}>
            说明：2FA/Passkey/通知等将逐步接入
          </div>
        </div>
      </aside>

      <section style={{ minWidth: 0 }}>{children}</section>
    </div>
  );
}

