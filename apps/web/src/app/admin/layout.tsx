import Link from "next/link";

import { AdminGate } from "./_components/AdminGate";

const navItems: Array<{ href: string; label: string; badge?: string }> = [
  { href: "/admin", label: "Dashboard", badge: "V1" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/tokens", label: "Tokens" },
  { href: "/admin/products", label: "Products", badge: "V1" },
  { href: "/admin/customers", label: "Customers", badge: "V1" },
  { href: "/admin/orders", label: "Orders", badge: "V1" },
  { href: "/admin/credit-ledger", label: "Credit Ledger" },
  { href: "/admin/usage-logs", label: "Usage Logs" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
      <aside className="card" style={{ padding: 16, height: "calc(100dvh - 48px)", position: "sticky", top: 24 }}>
        <div style={{ display: "grid", gap: 10, height: "100%" }}>
          <div>
            <div className="pill">Admin</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Tokfai</div>
            <div className="muted" style={{ fontSize: 13 }}>
              内部运营后台
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {navItems.map((it) => (
              <Link key={it.href} className="btn" href={it.href} style={{ justifyContent: "space-between" }}>
                <span>{it.label}</span>
                {it.badge ? <span className="pill" style={{ padding: "2px 8px" }}>{it.badge}</span> : null}
              </Link>
            ))}
            <Link className="btn" href="/console" style={{ justifyContent: "flex-start" }}>
              返回用户控制台
            </Link>
            <Link className="btn" href="/" style={{ justifyContent: "flex-start" }}>
              返回首页
            </Link>
          </div>

          <div className="muted" style={{ fontSize: 12, marginTop: "auto" }}>
            需管理员账号；接口经 DMIT 转发。
          </div>
        </div>
      </aside>

      <section style={{ minWidth: 0 }}>
        <AdminGate>{children}</AdminGate>
      </section>
    </div>
  );
}

