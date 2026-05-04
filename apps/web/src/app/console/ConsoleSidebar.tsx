import Link from "next/link";

import { UserActions } from "@/app/dashboard/_components/UserActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const nav = [
  { href: "/console", label: "仪表板" },
  { href: "/console/models", label: "模型大全" },
  { href: "/console/token", label: "API Keys" },
  { href: "/console/playground", label: "在线体验" },
  { href: "/console/log", label: "消耗查询" },
  { href: "/console/topup", label: "充值与订单" },
  { href: "/pricing", label: "文档与定价" },
  { href: "/console/personal", label: "个人设置" }
];

export async function ConsoleSidebar() {
  let isAdmin = false;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      isAdmin = data?.role === "admin";
    }
  } catch {
    /* Supabase 未配置等 */
  }

  const showDebugNav =
    process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEBUG_PAGES === "true";

  return (
    <aside className="card" style={{ padding: 16, height: "calc(100dvh - 48px)", position: "sticky", top: 24 }}>
      <div style={{ display: "grid", gap: 10, height: "100%" }}>
        <div>
          <div className="pill">Tokfai API</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>AI Gateway Platform</div>
          <div className="muted" style={{ fontSize: 13 }}>
            控制台
          </div>
        </div>

        <nav style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {nav.map((it) => (
            <Link key={it.href} className="btn" href={it.href} style={{ justifyContent: "flex-start" }}>
              {it.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link className="btn btnPrimary" href="/admin" style={{ justifyContent: "flex-start" }}>
              Admin Console
            </Link>
          ) : null}
          {showDebugNav ? (
            <Link className="btn" href="/debug/connectivity" style={{ justifyContent: "flex-start", opacity: 0.85 }}>
              连通性自检（内部）
            </Link>
          ) : null}
          <UserActions />
          <Link className="btn" href="/" style={{ justifyContent: "flex-start" }}>
            返回首页
          </Link>
        </nav>

        <div className="muted" style={{ fontSize: 12, marginTop: "auto" }}>
          价格示例仅供参考，实际扣费以账户积分与接口为准。
        </div>
      </div>
    </aside>
  );
}
