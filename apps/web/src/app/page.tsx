import { CopyBaseUrl } from "./_components/CopyBaseUrl";

export default function HomePage() {
  return (
    <main className="container">
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <div className="pill">Local Preview</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 30, letterSpacing: "-0.02em" }}>Token SaaS V1</h1>
            <p className="muted" style={{ margin: 0 }}>
              先把“后台可看到的模型列表”跑出来（已接入登录/注册，下一步接网关/权限）。
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a className="btn" href="/login">
              登录
            </a>
            <a className="btn" href="/register">
              注册
            </a>
            <a className="btn btnPrimary" href="/dashboard/models">
              进入后台 → 模型
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

