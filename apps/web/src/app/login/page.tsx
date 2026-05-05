"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [next, setNext] = useState("/console/models");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthTip, setOauthTip] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/console/models");
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleLogin() {
    setError(null);
    setOauthTip("已点击 Google 登录，准备跳转授权页…");
    setLoading(true);
    try {
      console.log("[auth] Google login clicked");
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      console.log("[auth] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      console.log("[auth] Redirect to:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });
      console.log("[auth] signInWithOAuth result:", { data, error });
      if (error) {
        console.error("[auth] Google login error:", error);
        setError(error.message);
        alert(error.message);
        return;
      }
      // Fallback: some environments/extensions may prevent automatic redirect
      // (Supabase usually redirects automatically unless skipBrowserRedirect is used).
      const url = (data as any)?.url as string | undefined;
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error("[auth] Unexpected Google login error:", err);
      const msg = err instanceof Error ? err.message : "OAuth 登录失败";
      setError(msg);
      alert(msg);
      setOauthTip(null);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 920 }}>
      <div className="card" style={{ padding: 22, display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18 }}>
        <section style={{ minWidth: 0 }}>
          <div className="pill">登录</div>
          <h1 style={{ margin: "10px 0 6px", fontSize: 28, letterSpacing: "-0.02em" }}>欢迎回来</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            使用账号密码登录，或使用 Google 一键登录。
          </p>

          <form onSubmit={onLogin} style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                邮箱
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                密码
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                type="password"
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </label>

            {error ? (
              <div className="pill bad" style={{ justifySelf: "start" }}>
                {error}
              </div>
            ) : null}
            {oauthTip ? (
              <div className="pill good" style={{ justifySelf: "start" }}>
                {oauthTip}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btnPrimary" type="submit" disabled={loading}>
                {loading ? "处理中…" : "登录"}
              </button>
              <Link className="btn" href="/forgot-password">
                忘记密码
              </Link>
              <Link className="btn" href="/register">
                去注册
              </Link>
            </div>
          </form>
        </section>

        <aside className="card" style={{ padding: 16, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>第三方登录</div>
          <div className="muted" style={{ fontSize: 13 }}>
            点击按钮跳转授权后自动登录。
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => void onGoogleLogin()} disabled={loading}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(124,92,255,0.9)" }} />
              {loading ? "正在跳转…" : "使用 Google 登录"}
            </button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            提示：需要在 Supabase Auth 里启用 Google Provider，并配置回调地址。
          </div>
        </aside>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none"
};

