"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type AuditLog = {
  id: number;
  created_at: string;
  admin_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  before: unknown | null;
  after: unknown | null;
  ip: string | null;
  user_agent: string | null;
};

type ListResponse = {
  ok: true;
  data: AuditLog[];
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

export default function AdminAuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [adminUserId, setAdminUserId] = useState("");

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (action.trim()) sp.set("action", action.trim());
    if (targetType.trim()) sp.set("target_type", targetType.trim());
    if (targetId.trim()) sp.set("target_id", targetId.trim());
    if (adminUserId.trim()) sp.set("admin_user_id", adminUserId.trim());
    sp.set("page", "1");
    sp.set("page_size", "50");
    return sp.toString();
  }, [action, targetType, targetId, adminUserId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse>(`/api/admin/audit-logs?${queryString}`);
      setItems(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
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
        <h2 style={{ margin: 0, fontSize: 18 }}>Audit Logs</h2>
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          管理员敏感操作审计：谁在什么时候改了什么（before/after）。
        </div>
      </div>

      <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={action} onChange={(e) => setAction(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="action" />
          <input value={targetType} onChange={(e) => setTargetType(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }} placeholder="target_type" />
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="target_id" />
          <input value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} placeholder="admin_user_id" />
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
                <th style={{ width: 260 }}>Admin</th>
                <th style={{ width: 180 }}>Action</th>
                <th style={{ width: 140 }}>Target</th>
                <th style={{ width: 220 }}>Target ID</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td className="muted" style={{ fontSize: 13 }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td className="muted" style={{ fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {l.admin_user_id || "-"}
                  </td>
                  <td>{l.action}</td>
                  <td>{l.target_type}</td>
                  <td className="muted" style={{ fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {l.target_id}
                  </td>
                  <td className="muted" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
                    {formatDiff(l.before, l.after)}
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 14 }}>
                    暂无审计记录。
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 14 }}>
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

function formatDiff(before: unknown | null, after: unknown | null) {
  const b = before ? safeJson(before) : null;
  const a = after ? safeJson(after) : null;
  if (!b && !a) return "-";
  if (!b) return `after: ${a}`;
  if (!a) return `before: ${b}`;
  // Keep compact for table display.
  const out = `before: ${b}\nafter:  ${a}`;
  return out.length > 500 ? `${out.slice(0, 500)}…` : out;
}

function safeJson(x: unknown) {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

