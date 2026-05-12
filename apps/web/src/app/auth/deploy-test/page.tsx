"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function maskUrl(url: string | undefined) {
  if (!url) return "（未设置）";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/…`;
  } catch {
    return "（格式无效）";
  }
}

function buildOAuthRedirectTo() {
  if (typeof window === "undefined") return "";
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const callbackBase = isLocal ? window.location.origin : "https://tokfai.com";
  const next = "/dashboard";
  return `${callbackBase}/auth/callback?next=${encodeURIComponent(next)}`;
}

export default function AuthDeployTestPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [oauthErr, setOauthErr] = useState<string | null>(null);

  const links = useMemo(() => {
    if (typeof window === "undefined") return null;
    const origin = window.location.origin;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const redirectTo = buildOAuthRedirectTo();
    return { origin, isLocal, redirectTo };
  }, []);

  async function startOAuth(provider: "google" | "github") {
    setOauthErr(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置");
      const redirectTo = buildOAuthRedirectTo();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (e) {
      setOauthErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="container" style={{ maxWidth: 720, padding: "24px 16px" }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="pill">Deploy / Auth 自检</div>
        <h1 style={{ margin: "12px 0 8px", fontSize: 22 }}>部署与登录测试页</h1>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          本页路径为 <code>/auth/deploy-test</code>，在生产环境默认可访问，用于先排除部署与域名问题，再测登录。
        </p>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>1. 当前访问环境</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            <li>
              <strong>hostname</strong>：{typeof window !== "undefined" ? window.location.hostname : "—"}
            </li>
            <li>
              <strong>origin</strong>：{links?.origin ?? "—"}
            </li>
            <li>
              <strong>是否本地</strong>：{links ? (links.isLocal ? "是" : "否") : "—"}
            </li>
          </ul>
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>2. 前端环境变量（构建时注入）</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            <li>
              <strong>NEXT_PUBLIC_SUPABASE_URL</strong>：{maskUrl(supabaseUrl)}
            </li>
            <li>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>：{hasAnon ? "已设置（内容不展示）" : "未设置 — 登录会全部失败"}
            </li>
          </ul>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            URL 必须是项目根地址，例如 <code>https://xxx.supabase.co</code>，不要填 <code>/auth/v1/callback</code>。
          </p>
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>3. 部署连通性（点链接看是否 200 / JSON）</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <Link className="btn" href="/api/auth/debug" target="_blank" rel="noreferrer">
              打开 /api/auth/debug（新标签）
            </Link>
            <Link className="btn" href="/login" target="_blank" rel="noreferrer">
              打开 /login（新标签）
            </Link>
            <Link className="btn" href="/login?next=/dashboard" target="_blank" rel="noreferrer">
              打开 /login?next=/dashboard（新标签）
            </Link>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            未登录时 <code>/api/auth/debug</code> 可能为 <code>hasUser: false</code> 或 <code>Auth session missing!</code> 属正常；若返回 500 且提示
            Missing env，说明 Vercel Production 环境变量未配置或未重新部署。
          </p>
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>4. OAuth（PKCE：必须用 SDK，勿手拼 authorize URL）</h2>
          <p className="muted" style={{ fontSize: 13, margin: "0 0 10px" }}>
            <strong>redirect_to</strong>（传给 <code>signInWithOAuth</code>）：
          </p>
          <pre
            style={{
              margin: "0 0 12px",
              padding: 12,
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              fontSize: 11,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {links?.redirectTo ?? "（等待客户端渲染）"}
          </pre>
          <div style={{ display: "grid", gap: 10 }}>
            <button className="btn btnPrimary" type="button" onClick={() => void startOAuth("google")}>
              测试 Google OAuth（PKCE）
            </button>
            <button className="btn" type="button" onClick={() => void startOAuth("github")}>
              测试 GitHub OAuth（PKCE）
            </button>
          </div>
          {oauthErr ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 10, color: "#ffb4b4" }}>
              {oauthErr}
            </p>
          ) : null}
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>5. Vercel 域名（避免重定向死循环）</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            <li>
              Primary 应为 <strong>tokfai.com</strong>；<code>www.tokfai.com</code> 应 307/308 到裸域。
            </li>
            <li>不要出现：裸域 → www 且 www → 裸域 同时存在。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
