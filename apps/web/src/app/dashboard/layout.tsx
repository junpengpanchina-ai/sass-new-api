import Link from "next/link";

import { UserActions } from "./_components/UserActions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
      <aside className="card" style={{ padding: 16, height: "calc(100dvh - 48px)", position: "sticky", top: 24 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div className="pill">Dashboard</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Token SaaS</div>
            <div className="muted" style={{ fontSize: 13 }}>
              V1 本地预览
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link className="btn" href="/dashboard/models" style={{ justifyContent: "flex-start" }}>
              模型（Models）
            </Link>
            <Link className="btn" href="/console/personal" style={{ justifyContent: "flex-start" }}>
              个人设置（Personal）
            </Link>
            <UserActions />
            <Link className="btn" href="/" style={{ justifyContent: "flex-start" }}>
              返回首页
            </Link>
          </div>

          <div className="muted" style={{ fontSize: 12, marginTop: "auto" }}>
            已接入：Supabase Auth（登录/注册/OAuth/忘记密码）
          </div>
        </div>
      </aside>

      <section style={{ minWidth: 0 }}>{children}</section>
    </div>
  );
}

