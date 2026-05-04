"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { adminFetch } from "../_lib/adminFetch";

type AdminUser = {
  id: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  credits_balance: number | null;
  credits_total_recharged: number | null;
  credits_total_used: number | null;
  token_count: number;
  last_used_at: string | null;
  created_at: string;
};

type ListResponse = {
  ok: true;
  data: AdminUser[];
  pagination?: { page: number; page_size: number; total: number };
};

type PatchResponse = {
  ok: true;
  data: { id: string; status: string; plan: string; role: string };
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

const STATUS_OPTIONS = ["visitor", "pending", "paid_pending", "active", "suspended"] as const;
const ROLE_OPTIONS = ["user", "admin", "sales", "affiliate"] as const;

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  const [drafts, setDrafts] = useState<Record<string, { role: string; status: string; plan: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (email.trim()) sp.set("email", email.trim());
    if (status) sp.set("status", status);
    if (role) sp.set("role", role);
    sp.set("page", String(page));
    sp.set("page_size", String(pageSize));
    return sp.toString();
  }, [email, status, role, page]);

  function draftFor(u: AdminUser) {
    const d = drafts[u.id];
    return {
      role: d?.role ?? u.role,
      status: d?.status ?? u.status,
      plan: d?.plan ?? u.plan,
    };
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse>(`/api/admin/users?${queryString}`);
      setItems(json.data || []);
      setTotal(json.pagination?.total ?? 0);
      setDrafts({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function saveUser(u: AdminUser) {
    const d = draftFor(u);
    const body: Record<string, string> = {};
    if (d.role !== u.role) body.role = d.role;
    if (d.status !== u.status) body.status = d.status;
    if (d.plan !== u.plan) body.plan = d.plan;
    if (!Object.keys(body).length) {
      setMsg("未修改任何字段");
      return;
    }

    setSavingId(u.id);
    setError(null);
    setMsg(null);
    try {
      await adminFetch<PatchResponse>(`/api/admin/users/${encodeURIComponent(u.id)}`, {
        method: "PATCH",
        body,
      });
      setMsg(`已保存：${u.email}`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="card" style={{ padding: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Users</h2>
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          平台用户与额度；行内可改 role / status / plan，保存走 DMIT PATCH（写审计日志）。
        </div>
      </div>

      <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} placeholder="email 包含" />
          <select className="btn" value={status} onChange={(e) => setStatus(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">status: 全部</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className="btn" value={role} onChange={(e) => setRole(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">role: 全部</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setPage(1);
              void load();
            }}
            disabled={loading}
          >
            应用筛选
          </button>
          <button className="btn" type="button" onClick={load} disabled={loading}>
            刷新
          </button>
        </div>

        <div className="muted" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
          共 {total} 人 · 第 {page}/{totalPages} 页
          <button className="btn" type="button" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            上一页
          </button>
          <button className="btn" type="button" disabled={loading || page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            下一页
          </button>
        </div>

        {msg ? (
          <div className="pill good" style={{ justifySelf: "start" }}>
            {msg}
          </div>
        ) : null}
        {error ? (
          <div className="pill bad" style={{ justifySelf: "start" }}>
            {error}
          </div>
        ) : null}

        <div style={{ overflow: "auto", borderRadius: 14, border: "1px solid var(--border)" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th style={{ minWidth: 110 }}>Role</th>
                <th style={{ minWidth: 130 }}>Status</th>
                <th style={{ minWidth: 100 }}>Plan</th>
                <th style={{ width: 80 }}>Balance</th>
                <th style={{ width: 80 }}>Used</th>
                <th style={{ width: 60 }}>Tok</th>
                <th style={{ minWidth: 200 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const d = draftFor(u);
                const dirty = d.role !== u.role || d.status !== u.status || d.plan !== u.plan;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.email}</td>
                    <td>
                      <select
                        className="btn"
                        style={{ justifyContent: "flex-start", padding: "6px 8px", fontSize: 12 }}
                        value={d.role}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [u.id]: {
                              role: e.target.value,
                              status: prev[u.id]?.status ?? u.status,
                              plan: prev[u.id]?.plan ?? u.plan,
                            },
                          }))
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="btn"
                        style={{ justifyContent: "flex-start", padding: "6px 8px", fontSize: 12 }}
                        value={d.status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [u.id]: {
                              role: prev[u.id]?.role ?? u.role,
                              status: e.target.value,
                              plan: prev[u.id]?.plan ?? u.plan,
                            },
                          }))
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={d.plan}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [u.id]: {
                              role: prev[u.id]?.role ?? u.role,
                              status: prev[u.id]?.status ?? u.status,
                              plan: e.target.value,
                            },
                          }))
                        }
                        style={{ ...inputStyle, maxWidth: 120, padding: "6px 8px", fontSize: 12 }}
                      />
                    </td>
                    <td>{u.credits_balance ?? "—"}</td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {u.credits_total_used ?? "—"}
                    </td>
                    <td>{u.token_count}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          className="btn btnPrimary"
                          type="button"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          disabled={!dirty || savingId === u.id}
                          onClick={() => void saveUser(u)}
                        >
                          {savingId === u.id ? "保存中…" : "保存"}
                        </button>
                        <Link className="btn" style={{ padding: "6px 10px", fontSize: 12 }} href={`/admin/credit-ledger?user_id=${encodeURIComponent(u.id)}`}>
                          加额度
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ padding: 14 }}>
                    暂无用户（或筛选无结果）。若报列不存在，请在 Supabase 执行 profiles 额度列迁移。
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ padding: 14 }}>
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
