"use client";

import Link from "next/link";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    setTip(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true }
      });
      if (error) throw error;
      setCodeSent(true);
      setTip("验证码已发送，请检查邮箱（可能在垃圾箱）。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送验证码失败");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTip(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email"
      });
      if (verifyError) throw verifyError;
      if (!data.session) {
        throw new Error("验证码验证成功，但未获取到会话");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { username: username.trim() }
      });
      if (updateError) throw updateError;

      window.location.href = "/"; // 注册成功默认回首页
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  const canSend = Boolean(email.trim()) && !loading;
  const canRegister =
    Boolean(username.trim()) && Boolean(email.trim()) && Boolean(password) && Boolean(code.trim()) && codeSent && !loading;

  return (
    <main className="container" style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="pill">注册</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 28, letterSpacing: "-0.02em" }}>创建账号</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          支持邮箱注册与账号密码登录。管理员账号需注册后在 Supabase 中手动设置为 admin。
        </p>

        <form onSubmit={onRegister} style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              用户名
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="yourname"
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
              autoComplete="new-password"
              type="password"
              placeholder="至少 8 位"
              required
              style={inputStyle}
            />
          </label>

          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ display: "grid", gap: 12 }}>
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

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn" type="button" onClick={sendCode} disabled={!canSend}>
                  {loading ? "处理中…" : "发送验证码"}
                </button>
                <div className="muted" style={{ fontSize: 12 }}>
                  发送后将收到邮箱验证码（OTP），填入下方完成注册。
                </div>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>
                  邮箱验证码
                </div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  placeholder="6 位验证码"
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          {error ? (
            <div className="pill bad" style={{ justifySelf: "start" }}>
              {error}
            </div>
          ) : null}
          {tip ? (
            <div className="pill good" style={{ justifySelf: "start" }}>
              {tip}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btnPrimary" type="submit" disabled={!canRegister}>
              {loading ? "处理中…" : "注册"}
            </button>
            <Link className="btn" href="/login">
              已有账号？去登录
            </Link>
            <Link className="btn" href="/">
              返回首页
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

