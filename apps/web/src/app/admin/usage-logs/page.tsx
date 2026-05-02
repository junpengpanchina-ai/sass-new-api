"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type UsageLog = {
  id: number;
  created_at: string;
  user_id: string | null;
  token_id: string | null;
  model: string;
  upstream_name: string;
  status: "ok" | "error" | "denied";
  http_status: number | null;
  latency_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  request_id: string | null;
};

type ListResponse = {
  ok: true;
  data: UsageLog[];
  pagination?: { page: number; page_size: number; total: number };
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none",
};

export default function AdminUsageLogsPage() {
  const [items, setItems] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tokenId, setTokenId] = useState("");
  const [userId, setUserId] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (tokenId.trim()) sp.set("token_id", tokenId.trim());
    if (userId.trim()) sp.set("user_id", userId.trim());
    if (model.trim()) sp.set("model", model.trim());
    if (status) sp.set("status", status);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    sp.set("page", "1");
    sp.set("page_size", "50");
    return sp.toString();
  }, [tokenId, userId, model, status, from, to]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse>(`/api/admin/usage-logs?${queryString}`);
      setItems(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  return (
    <main className="card" style={{ padding: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Usage Logs</h2>
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          调用日志查询（排障/追责）：按 token/user/model/status/时间筛选。
        </div>
      </div>

      <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} placeholder="token_id" />
          <input value={userId} onChange={(e) => setUserId(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} placeholder="user_id" />
          <input value={model} onChange={(e) => setModel(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="model" />
          <select className="btn" value={status} onChange={(e) => setStatus(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">status: all</option>
            <option value="ok">ok</option>
            <option value="error">error</option>
            <option value="denied">denied</option>
          </select>
          <input value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="from (ISO)" />
          <input value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="to (ISO)" />
          <button className="btn" type="button" onClick={load} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>

        {error ? (
          <div className="pill bad" style={{ justifySelf: "start" }}>
            {error}
          </div>
        ) : null}

        <div style={{ overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>Created</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 120 }}>HTTP</th>
                <th style={{ width: 120 }}>Latency</th>
                <th style={{ width: 200 }}>Model</th>
                <th style={{ width: 160 }}>Upstream</th>
                <th style={{ width: 260 }}>Token</th>
                <th style={{ width: 260 }}>User</th>
                <th style={{ width: 180 }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td className="muted" style={{ fontSize: 13 }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td>
                    <span className={l.status === "ok" ? "pill good" : l.status === "error" ? "pill bad" : "pill"}>{l.status}</span>
                  </td>
                  <td>{l.http_status ?? "-"}</td>
                  <td>{l.latency_ms ?? "-"}</td>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{l.model}</td>
                  <td>{l.upstream_name}</td>
                  <td className="muted" style={{ fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {l.token_id || "-"}
                  </td>
                  <td className="muted" style={{ fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {l.user_id || "-"}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {l.error_code || l.error_message ? (
                      <span>{[l.error_code, l.error_message].filter(Boolean).join(": ").slice(0, 140)}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={9} className="muted" style={{ padding: 14 }}>
                    暂无日志（或筛选无结果）。
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={9} className="muted" style={{ padding: 14 }}>
                    加载中…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

