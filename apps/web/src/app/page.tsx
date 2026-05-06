import { CopyBaseUrl } from "./_components/CopyBaseUrl";

export default function HomePage() {
  return (
    <main className="container" style={{ maxWidth: 1100 }}>
      <header className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="pill">Tokfai</div>
            <div className="muted" style={{ fontSize: 13 }}>
              OpenAI-compatible AI Gateway
            </div>
          </div>
          <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a className="btn" href="/pricing">
              Pricing
            </a>
            <a className="btn" href="/console/token">
              Console
            </a>
            <a className="btn" href="/login">
              Login
            </a>
          </nav>
        </div>
      </header>

      <section className="card" style={{ padding: 22, marginTop: 14 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="pill">One API · Many models</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 34, letterSpacing: "-0.02em" }}>
              Ship with a single OpenAI-compatible API.
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Create an API key, route to multiple upstreams, and track usage & credits in one place.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a className="btn btnPrimary" href="/console/token">
              Get started → Create API Key
            </a>
            <a className="btn" href="/pricing">
              View pricing
            </a>
            <a className="btn" href="/console/models">
              Browse models
            </a>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Stable</div>
          <div className="muted" style={{ fontSize: 13 }}>
            One gateway, multiple upstreams. Built for reliability and operational control.
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Cost control</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Credit ledger + usage logs help you understand spend and prevent surprises.
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>OpenAI-compatible</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Use your existing OpenAI SDK and switch the base URL.
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 18, marginTop: 14 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>API Base URL</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Use this as your OpenAI SDK <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>base_url</code>.
              </div>
            </div>
            <CopyBaseUrl />
          </div>

          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>How it works</div>
            <ol className="muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 13 }}>
              <li>
                <a className="btn" style={{ padding: "6px 10px" }} href="/login">
                  Login
                </a>{" "}
                to create an account.
              </li>
              <li>
                Create an API key in{" "}
                <a className="btn" style={{ padding: "6px 10px" }} href="/console/token">
                  Console → API Keys
                </a>
                .
              </li>
              <li>
                Call the OpenAI-compatible endpoint with your key (billing uses credits + usage logs).
              </li>
            </ol>
          </div>

          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Quick start (curl)</div>
            <pre
              className="card"
              style={{
                margin: 0,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.25)",
                overflowX: "auto",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                lineHeight: 1.55
              }}
            >{`curl "${process.env.NEXT_PUBLIC_API_BASE_URL ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "") : "https://api.tokfai.com"}/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</pre>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Note: this key is your Tokfai API key (not your Supabase session token).
            </div>
          </div>

          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>How Tokfai Uses Google Sign-In</div>
            <div className="muted" style={{ fontSize: 13, display: "grid", gap: 10 }}>
              <div>
                Tokfai uses Google Sign-In only to authenticate users and manage account access. When you sign in with
                Google, Tokfai may collect basic account information such as your email address and user ID (and optional
                public profile fields provided by Google).
              </div>
              <div>
                Tokfai may also record service usage information such as API request time, selected model, token usage,
                and credit consumption for billing, fraud prevention, service reliability, debugging, and customer
                support.
              </div>
              <div>
                Tokfai does not request access to your Google Drive, Gmail, Calendar, Contacts, or other Google services.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="btn" style={{ padding: "6px 10px" }} href="/privacy">
                  Privacy Policy
                </a>
                <a className="btn" style={{ padding: "6px 10px" }} href="/terms">
                  Terms of Service
                </a>
                <a className="btn" style={{ padding: "6px 10px" }} href="/login">
                  Sign in
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="muted" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 16, fontSize: 12 }}>
        <a className="btn" style={{ padding: "6px 10px" }} href="/privacy">
          Privacy
        </a>
        <a className="btn" style={{ padding: "6px 10px" }} href="/terms">
          Terms
        </a>
        <span style={{ opacity: 0.8 }}>Contact: junpengpanchina@gmail.com</span>
      </footer>
    </main>
  );
}
