"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CheckStatus = "pending" | "ok" | "fail" | "skip";

type Row = {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
};

function normalizeBase(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  return url.replace(/\/+$/, "");
}

async function fetchText(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text.slice(0, 800) };
}

export default function ConnectivityDebugPage() {
  const dmitFromEnv = normalizeBase(process.env.NEXT_PUBLIC_DMIT_API_URL);
  const apiBaseFromEnv = normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL);

  const [rows, setRows] = useState<Row[]>(() => [
    { id: "env_supabase_url", label: "环境变量 NEXT_PUBLIC_SUPABASE_URL", status: "pending" },
    { id: "env_supabase_anon", label: "环境变量 NEXT_PUBLIC_SUPABASE_ANON_KEY", status: "pending" },
    { id: "env_dmit", label: "环境变量 NEXT_PUBLIC_DMIT_API_URL（管理端调 DMIT）", status: "pending" },
    { id: "env_api_base", label: "环境变量 NEXT_PUBLIC_API_BASE_URL（若与 DMIT 混用请核对）", status: "pending" },
    { id: "supabase_plans", label: "① 浏览器层 · Supabase 匿名读 plans（URL/Key/RLS）", status: "pending" },
    {
      id: "dmit_root",
      label: "②③④ 浏览器 → DMIT · GET /（域名是否指向本服务）",
      status: "pending"
    },
    {
      id: "dmit_system",
      label: "②③④ 浏览器 → DMIT · GET /api/system/health（DMIT ↔ 库 service role）",
      status: "pending"
    }
  ]);

  const patch = (id: string, p: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  };

  useEffect(() => {
    const dmit = normalizeBase(process.env.NEXT_PUBLIC_DMIT_API_URL);
    const apiBase = normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL);
    if (typeof window !== "undefined") {
      // 与页面上 <pre> 一致，便于 DevTools Console 对照 Network
      console.log("[connectivity] DMIT URL =", process.env.NEXT_PUBLIC_DMIT_API_URL ?? "(未设置)");
      console.log("[connectivity] API BASE =", process.env.NEXT_PUBLIC_API_BASE_URL ?? "(未设置)");
    }

    let cancelled = false;

    async function run() {
      const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
      const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
      const dmitBase = normalizeBase(process.env.NEXT_PUBLIC_DMIT_API_URL);
      const apiBase = normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL);
      const hasApiBase = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL?.trim());

      patch("env_supabase_url", {
        status: hasUrl ? "ok" : "fail",
        detail: hasUrl ? "已注入构建" : "未设置：Vercel 上无法连 Supabase"
      });
      patch("env_supabase_anon", {
        status: hasAnon ? "ok" : "fail",
        detail: hasAnon ? "已注入构建" : "未设置"
      });
      patch("env_dmit", {
        status: dmitBase ? "ok" : "skip",
        detail: dmitBase ? `请求将发往：\n${dmitBase}/\n${dmitBase}/api/system/health` : "未设置：管理端无法调 DMIT；下方 DMIT 检测跳过"
      });
      patch("env_api_base", {
        status: hasApiBase ? "ok" : "skip",
        detail: hasApiBase
          ? `${apiBase}\n（admin 实际使用 NEXT_PUBLIC_DMIT_API_URL，请确认两者是否应一致）`
          : "未设置：若代码未使用此项可忽略"
      });

      if (!hasUrl || !hasAnon) {
        patch("supabase_plans", {
          status: "skip",
          detail: "缺少 Supabase 环境变量"
        });
      } else {
        try {
          const supabase = createSupabaseBrowserClient();
          if (!supabase) {
            patch("supabase_plans", { status: "fail", detail: "createClient 返回 null" });
          } else {
            const { error } = await supabase.from("plans").select("id").limit(1);
            if (cancelled) return;
            if (error) {
              patch("supabase_plans", {
                status: "fail",
                detail: `${error.message}（code: ${error.code ?? "n/a"}）`
              });
            } else {
              patch("supabase_plans", {
                status: "ok",
                detail: "查询成功（与 RLS 一致时可返回 0 行）"
              });
            }
          }
        } catch (e) {
          if (!cancelled) {
            patch("supabase_plans", {
              status: "fail",
              detail: e instanceof Error ? e.message : String(e)
            });
          }
        }
      }

      if (!dmitBase) {
        patch("dmit_root", { status: "skip", detail: "未配置 NEXT_PUBLIC_DMIT_API_URL" });
        patch("dmit_system", { status: "skip", detail: "未配置 NEXT_PUBLIC_DMIT_API_URL" });
        return;
      }

      const rootUrl = `${dmitBase}/`;
      const systemUrl = `${dmitBase}/api/system/health`;

      try {
        const r = await fetchText(rootUrl, { method: "GET" });
        if (cancelled) return;
        let rootHint = "";
        try {
          const j = JSON.parse(r.body) as { ok?: unknown; service?: string };
          if (j.service === "dmit-api" && j.ok === true) {
            rootHint = " · JSON 含 ok/service=dmit-api";
          }
        } catch {
          /* 非 JSON 也允许只要 HTTP 2xx */
        }
        if (r.ok) {
          patch("dmit_root", {
            status: "ok",
            detail: `Request URL:\n${rootUrl}\nHTTP ${r.status}${rootHint}\n----\n${r.body.slice(0, 360)}`
          });
        } else {
          patch("dmit_root", {
            status: "fail",
            detail: `Request URL:\n${rootUrl}\nHTTP ${r.status}（已有状态码，多为 Nginx/应用返回）\n----\n${r.body.slice(0, 360)}`
          });
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          patch("dmit_root", {
            status: "fail",
            detail: `Request URL:\n${rootUrl}\n${msg}\n\n若无任何 HTTP 状态码（Network 里也没有 Status），多为 TLS/链路断开（如 ERR_CONNECTION_CLOSED）。\n请新开标签页直接打开同一 URL 对照：若也失败 → 查域名/HTTPS/Nginx/防火墙；若单独打开成功而本页失败 → 强刷 Cmd+Shift+R、无痕、或清除本站数据；并核对 DevTools → Network 的 Request URL。`
          });
        }
      }

      try {
        const s = await fetchText(systemUrl, { method: "GET" });
        if (cancelled) return;
        if (s.ok) {
          let supabaseState = "";
          try {
            const j = JSON.parse(s.body) as { supabase?: string };
            supabaseState = j.supabase ? ` supabase: ${j.supabase}` : "";
          } catch {
            /* ignore */
          }
          patch("dmit_system", {
            status: "ok",
            detail: `Request URL:\n${systemUrl}\nHTTP ${s.status}${supabaseState}\n----\n${s.body.slice(0, 360)}`
          });
        } else {
          patch("dmit_system", {
            status: "fail",
            detail: `Request URL:\n${systemUrl}\nHTTP ${s.status}\n----\n${s.body.slice(0, 360)}`
          });
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          patch("dmit_system", {
            status: "fail",
            detail: `Request URL:\n${systemUrl}\n${msg}\n\n说明同上：先新标签页直接打开该 URL，再结合 Network 是否有 Status。`
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const relevant = rows.filter((r) => r.status !== "skip");
    const failed = relevant.filter((r) => r.status === "fail");
    const pending = relevant.filter((r) => r.status === "pending");
    if (pending.length) return { kind: "pending" as const, text: "检测进行中…" };
    if (failed.length) return { kind: "bad" as const, text: `有 ${failed.length} 项未通过。DMIT 相关失败请先按下方「四层排查」对照，勿仅凭本页断定整站挂了。` };
    return { kind: "good" as const, text: "当前检测项均已通过（或已跳过非必填项）。" };
  }, [rows]);

  const badge = (s: CheckStatus) => {
    const map: Record<CheckStatus, { bg: string; text: string }> = {
      pending: { bg: "#e5e7eb", text: "#374151" },
      ok: { bg: "#dcfce7", text: "#166534" },
      fail: { bg: "#fee2e2", text: "#991b1b" },
      skip: { bg: "#f3f4f6", text: "#6b7280" }
    };
    const m = map[s];
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          background: m.bg,
          color: m.text
        }}
      >
        {s === "pending" ? "等待" : s === "ok" ? "通过" : s === "fail" ? "失败" : "跳过"}
      </span>
    );
  };

  const curlBlock =
    dmitFromEnv != null
      ? `curl -i ${JSON.stringify(`${dmitFromEnv}/`)}
curl -i ${JSON.stringify(`${dmitFromEnv}/api/system/health`)}
curl -i ${JSON.stringify(`${dmitFromEnv}/api/plans`)}`
      : `# 设置 NEXT_PUBLIC_DMIT_API_URL 后重新部署，或本地填入 .env 再打开本页，将显示带真实域名的命令
curl -i "https://YOUR_DMIT/"
curl -i "https://YOUR_DMIT/api/system/health"
curl -i "https://YOUR_DMIT/api/plans"`;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px 48px",
        fontFamily: "system-ui, sans-serif",
        background: "#fafafa",
        color: "#111"
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>连接自检</h1>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, marginBottom: 12 }}>
          不包含密钥。生产请在 Vercel 设置{" "}
          <code style={{ background: "#eee", padding: "1px 6px", borderRadius: 4 }}>NEXT_PUBLIC_ENABLE_CONNECTIVITY_PAGE=true</code>{" "}
          并重新部署；排查完成后关闭并再部署。
        </p>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 16,
            fontSize: 13,
            lineHeight: 1.65,
            color: "#444"
          }}
        >
          <strong style={{ color: "#111" }}>四层排查（顺序）</strong>
          <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>
              <strong>浏览器</strong>：DevTools → <strong>Network</strong>（不要只看 Console）。点开失败行，核对{" "}
              <strong>Request URL</strong>、是否有 <strong>Status</strong>、<strong>Headers</strong>（301/302/403/521/525 等）、<strong>Response</strong>。
            </li>
            <li>
              <strong>域名 / HTTPS</strong>：新标签页直接打开{" "}
              {dmitFromEnv ? (
                <>
                  <a href={`${dmitFromEnv}/`} target="_blank" rel="noreferrer">
                    DMIT 根路径
                  </a>
                  、
                  <a href={`${dmitFromEnv}/api/system/health`} target="_blank" rel="noreferrer">
                    /api/system/health
                  </a>
                  、
                  <a href={`${dmitFromEnv}/api/plans`} target="_blank" rel="noreferrer">
                    /api/plans
                  </a>
                </>
              ) : (
                "（配置 DMIT 基址后显示链接）"
              )}
              。
            </li>
            <li>
              <strong>Nginx / DMIT</strong>：在源站对 127.0.0.1 业务端口与带 <code>Host: api…</code> 的 Nginx 自测（见文档）。
            </li>
            <li>
              <strong>应用层</strong>：本页对 DMIT 只请求 <code>GET /</code> 与 <code>GET /api/system/health</code>（不再请求{" "}
              <code>/health</code>，避免与「进程探活」路径混淆）。
            </li>
          </ol>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#666" }}>
            若直连与 curl 正常而本页失败：强刷 Cmd+Shift+R、无痕窗口、Application → Clear storage；并排除代理/广告扩展对 fetch 的干扰。
          </p>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 16
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>构建注入（与 Console 中 [connectivity] 日志一致）</div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>NEXT_PUBLIC_DMIT_API_URL</div>
          <pre
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              padding: 10,
              background: "#f9fafb",
              borderRadius: 6,
              border: "1px solid #eee",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}
          >
            {process.env.NEXT_PUBLIC_DMIT_API_URL ?? "(未设置)"}
          </pre>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>NEXT_PUBLIC_API_BASE_URL</div>
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              padding: 10,
              background: "#f9fafb",
              borderRadius: 6,
              border: "1px solid #eee",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}
          >
            {process.env.NEXT_PUBLIC_API_BASE_URL ?? "(未设置)"}
          </pre>
        </section>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            marginBottom: 20,
            background: summary.kind === "good" ? "#ecfdf5" : summary.kind === "bad" ? "#fef2f2" : "#f9fafb",
            border: `1px solid ${summary.kind === "good" ? "#a7f3d0" : summary.kind === "bad" ? "#fecaca" : "#e5e7eb"}`,
            fontSize: 14
          }}
        >
          {summary.text}
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "14px 16px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{r.label}</span>
                {badge(r.status)}
              </div>
              {r.detail ? (
                <pre
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#444",
                    background: "#f9fafb",
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #eee"
                  }}
                >
                  {r.detail}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>

        <section
          style={{
            marginTop: 20,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "14px 16px"
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>本机终端（复制执行）</div>
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              background: "#f9fafb",
              padding: 10,
              borderRadius: 6,
              border: "1px solid #eee"
            }}
          >
            {curlBlock}
          </pre>
        </section>

        <p style={{ marginTop: 24, fontSize: 13, color: "#666" }}>
          本地 <code style={{ background: "#eee", padding: "1px 6px", borderRadius: 4 }}>next dev</code> 默认可访问；生产需{" "}
          <code style={{ background: "#eee", padding: "1px 6px", borderRadius: 4 }}>NEXT_PUBLIC_ENABLE_CONNECTIVITY_PAGE=true</code>。
        </p>
      </div>
    </main>
  );
}
