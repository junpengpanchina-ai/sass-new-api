"use client";

import Link from "next/link";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送重置链接失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="pill">忘记密码</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: "-0.02em" }}>重置密码</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          输入注册邮箱后系统会发送重置链接。点击链接设置新密码，原密码随即失效。
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              注册邮箱
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

          {error ? (
            <div className="pill bad" style={{ justifySelf: "start" }}>
              {error}
            </div>
          ) : null}
          {sent ? (
            <div className="pill good" style={{ justifySelf: "start" }}>
              重置链接已发送，请检查邮箱（可能在垃圾箱）。
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btnPrimary" type="submit" disabled={loading}>
              {loading ? "处理中…" : "发送重置链接"}
            </button>
            <Link className="btn" href="/login">
              返回登录
            </Link>
          </div>
        </form>
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

