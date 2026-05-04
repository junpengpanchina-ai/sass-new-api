import { isAuthGuardDisabled } from "@/lib/authGuard";

import { CopyBaseUrl } from "./_components/CopyBaseUrl";

export default function HomePage() {
  const authOff = isAuthGuardDisabled();

  return (
    <main className="container">
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <div className="pill">Tokfai API</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 30, letterSpacing: "-0.02em" }}>AI Gateway Platform</h1>
            <p className="muted" style={{ margin: 0 }}>
              统一 API 入口、积分计费与模型货架。登录后可管理 API Keys、查看消耗与充值。
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            {authOff ? (
              <span className="pill" style={{ fontSize: 12 }}>
                未强制登录（设 NEXT_PUBLIC_REQUIRE_LOGIN_FOR_APP=true 可恢复）
              </span>
            ) : (
              <>
                <a className="btn" href="/login">
                  登录
                </a>
                <a className="btn" href="/register">
                  注册
                </a>
              </>
            )}
            <a className="btn btnPrimary" href="/console/models">
              进入控制台 → 模型大全
            </a>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>API Base URL</div>
            <div className="muted" style={{ fontSize: 13 }}>
              将该地址作为 OpenAI SDK 的 <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>base_url</code>
              ，并使用平台令牌作为 <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>api_key</code>。
            </div>
          </div>
          <CopyBaseUrl />
        </div>
      </div>
    </main>
  );
}
