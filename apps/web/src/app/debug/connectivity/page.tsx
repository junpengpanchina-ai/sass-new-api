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

async function fetchJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text.slice(0, 800) };
}

export default function ConnectivityDebugPage() {
  const [rows, setRows] = useState<Row[]>(() => [
    { id: "env_supabase_url", label: "环境变量 NEXT_PUBLIC_SUPABASE_URL", status: "pending" },
    { id: "env_supabase_anon", label: "环境变量 NEXT_PUBLIC_SUPABASE_ANON_KEY", status: "pending" },
    { id: "env_dmit", label: "环境变量 NEXT_PUBLIC_DMIT_API_URL（管理端调 DMIT）", status: "pending" },
    { id: "supabase_plans", label: "Supabase：匿名客户端读 plans（验证 URL/Key/RLS）", status: "pending" },
    { id: "dmit_health", label: "DMIT：GET /health（进程存活）", status: "pending" },
    { id: "dmit_system", label: "DMIT：GET /api/system/health（DMIT ↔ 数据库 service role）", status: "pending" }
  ]);

  const patch = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
      const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
      const dmitBase = normalizeBase(process.env.NEXT_PUBLIC_DMIT_API_URL);

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
        detail: dmitBase ? dmitBase : "未设置：仅影响管理后台请求 DMIT；下面 DMIT 检测跳过"
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
        patch("dmit_health", { status: "skip", detail: "未配置 NEXT_PUBLIC_DMIT_API_URL" });
        patch("dmit_system", { status: "skip", detail: "未配置 NEXT_PUBLIC_DMIT_API_URL" });
        return;
      }

      try {
        const h = await fetchJson(`${dmitBase}/health`);
        if (cancelled) return;
        if (h.ok) {
          patch("dmit_health", { status: "ok", detail: `HTTP ${h.status} · ${h.body.slice(0, 200)}` });
        } else {
          patch("dmit_health", {
            status: "fail",
            detail: `HTTP ${h.status} · ${h.body.slice(0, 280)}`
          });
        }
      } catch (e) {
        if (!cancelled) {
          patch("dmit_health", {
            status: "fail",
            detail: e instanceof Error ? e.message : String(e)
          });
        }
      }

      try {
        const s = await fetchJson(`${dmitBase}/api/system/health`);
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
            detail: `HTTP ${s.status}${supabaseState} · ${s.body.slice(0, 240)}`
          });
        } else {
          patch("dmit_system", {
            status: "fail",
            detail: `HTTP ${s.status} · ${s.body.slice(0, 320)}`
          });
        }
      } catch (e) {
        if (!cancelled) {
          patch("dmit_system", {
            status: "fail",
            detail: e instanceof Error ? e.message : String(e)
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
    if (failed.length) return { kind: "bad" as const, text: `有 ${failed.length} 项未通过，请对照下方排查。` };
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
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
          用于确认 Vercel 前端环境变量、浏览器访问 Supabase、以及浏览器访问 DMIT 是否正常。不包含密钥。生产环境请在 Vercel 设置{" "}
          <code style={{ background: "#eee", padding: "1px 6px", borderRadius: 4 }}>NEXT_PUBLIC_ENABLE_CONNECTIVITY_PAGE=true</code>{" "}
          后重新部署；排查完成后删除或设为 false 并再次部署。
        </p>

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

        <p style={{ marginTop: 24, fontSize: 13, color: "#666" }}>
          本地开发（<code style={{ background: "#eee", padding: "1px 6px", borderRadius: 4 }}>next dev</code>
          ）默认可访问本页；生产需显式开启上述开关。
        </p>
      </div>
    </main>
  );
}
