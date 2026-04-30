"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          if (!cancelled) setReady(false);
          return;
        }
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setReady(Boolean(data.user));
      } catch {
        if (!cancelled) setReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置密码失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="pill">重置密码</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: "-0.02em" }}>设置新密码</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          该页面需要从邮箱的重置链接进入。设置成功后会退出登录，请用新密码重新登录。
        </p>

        {!ready ? (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <div className="pill bad" style={{ justifySelf: "start" }}>
              当前没有可用的重置会话。请回到「忘记密码」重新发送链接。
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btn btnPrimary" href="/forgot-password">
                去发送重置链接
              </Link>
              <Link className="btn" href="/login">
                返回登录
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                新密码
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                type="password"
                placeholder="至少 8 位"
                required
                style={inputStyle}
              />
            </label>

            {error ? (
              <div className="pill bad" style={{ justifySelf: "start" }}>
                {error}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btnPrimary" type="submit" disabled={loading}>
                {loading ? "处理中…" : "设置新密码"}
              </button>
              <Link className="btn" href="/login">
                返回登录
              </Link>
            </div>
          </form>
        )}
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

