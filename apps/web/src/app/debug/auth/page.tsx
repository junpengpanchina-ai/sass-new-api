"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function isSafeNextPath(next: string | null) {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  return true;
}

function getSafeNextPathFromLocation() {
  const next = new URLSearchParams(window.location.search).get("next");
  return isSafeNextPath(next) ? String(next) : "/dashboard";
}

function buildAuthRedirectTo() {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const baseUrl = isLocalhost ? window.location.origin : "https://tokfai.com";
  const next = getSafeNextPathFromLocation();
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;
}

export default function DebugAuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<any>(null);

  const computed = useMemo(() => {
    if (typeof window === "undefined") return null;
    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = isSafeNextPath(next) ? String(next) : "/dashboard";
    const redirectTo = buildAuthRedirectTo();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const authorizeBase = supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize` : null;
    return {
      href: window.location.href,
      origin: window.location.origin,
      hostname: window.location.hostname,
      next,
      safeNext,
      redirectTo,
      supabaseUrl: supabaseUrl ?? null,
      githubAuthorizeUrl: authorizeBase
        ? `${authorizeBase}?provider=github&redirect_to=${encodeURIComponent(redirectTo)}&state=${encodeURIComponent(
            JSON.stringify({ next: safeNext }),
          )}`
        : null,
      googleAuthorizeUrl: authorizeBase
        ? `${authorizeBase}?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&state=${encodeURIComponent(
            JSON.stringify({ next: safeNext }),
          )}`
        : null,
    };
  }, []);

  async function runClientChecks() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");

      const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);

      setLog({
        at: new Date().toISOString(),
        computed,
        client: {
          sessionError: sessionError?.message ?? null,
          hasSession: Boolean(sessionData.session),
          sessionUserId: sessionData.session?.user?.id ?? null,
          userError: userError?.message ?? null,
          hasUser: Boolean(userData.user),
          userId: userData.user?.id ?? null,
          email: userData.user?.email ?? null,
        },
      });
    } catch (e) {
      setLog({ at: new Date().toISOString(), computed, clientError: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function runServerChecks() {
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/debug", { cache: "no-store" });
      const json = await resp.json();
      setLog({ at: new Date().toISOString(), computed, server: { status: resp.status, json } });
    } catch (e) {
      setLog({ at: new Date().toISOString(), computed, serverError: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function testPasswordLogin() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await runClientChecks();
    } catch (e) {
      setLog({ at: new Date().toISOString(), computed, passwordLoginError: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      await supabase.auth.signOut();
      await runClientChecks();
    } catch (e) {
      setLog({ at: new Date().toISOString(), computed, signOutError: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  function hardRedirect(url: string | null) {
    if (!url) {
      setLog({ at: new Date().toISOString(), computed, error: "Missing NEXT_PUBLIC_SUPABASE_URL" });
      return;
    }
    window.location.href = url;
  }

  return (
    <main className="container" style={{ maxWidth: 980 }}>
      <div className="card" style={{ padding: 18 }}>
        <div className="pill">Debug</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 22 }}>Auth Debug / 登录测试</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          用于定位 OAuth/Callback/Cookie/Session 的问题。生产环境请仅在开启 debug 页面时使用。
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button className="btn btnPrimary" type="button" onClick={runClientChecks} disabled={loading}>
            {loading ? "处理中…" : "检查：浏览器端 Session/User"}
          </button>
          <button className="btn" type="button" onClick={runServerChecks} disabled={loading}>
            检查：服务端 /api/auth/debug
          </button>
          <button className="btn" type="button" onClick={signOut} disabled={loading}>
            退出登录（signOut）
          </button>
          <Link className="btn" href="/login">
            返回登录页
          </Link>
        </div>

        <div className="card" style={{ padding: 14, marginTop: 14, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>OAuth hard redirect（仅测试）</div>
          <div style={{ display: "grid", gap: 10 }}>
            <button className="btn" type="button" onClick={() => hardRedirect(computed?.googleAuthorizeUrl ?? null)} disabled={loading}>
              跳转 Google authorize
            </button>
            <button className="btn" type="button" onClick={() => hardRedirect(computed?.githubAuthorizeUrl ?? null)} disabled={loading}>
              跳转 GitHub authorize
            </button>
            <div className="muted" style={{ fontSize: 12 }}>
              redirect_to: <code style={{ opacity: 0.9 }}>{computed?.redirectTo ?? "(loading...)"}</code>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginTop: 14, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>邮箱密码登录（仅测试）</div>
          <div style={{ display: "grid", gap: 10 }}>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
            <button className="btn btnPrimary" type="button" onClick={testPasswordLogin} disabled={loading}>
              测试邮箱密码登录
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginTop: 14, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>输出（复制给排查用）</div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              lineHeight: 1.5,
              opacity: 0.95,
            }}
          >
            {JSON.stringify(log ?? { computed }, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}

