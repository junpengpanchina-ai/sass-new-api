"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type ApiToken = {
  id: string;
  user_id: string;
  user_email: string | null;
  name: string;
  status: string;
  allowed_models: unknown;
  last_used_at: string | null;
  created_at: string;
};

type ListResponse = {
  ok: true;
  data: ApiToken[];
  pagination?: { page: number; page_size: number; total: number };
};

type MutTokenResponse = {
  ok: true;
  data: ApiToken;
  plain_token?: string;
};

type ResetResponse = {
  ok: true;
  data: { old_token_id: string; new_token_id: string; status: string };
  plain_token?: string;
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

export default function AdminTokensPage() {
  const [items, setItems] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [plainReveal, setPlainReveal] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 40;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [cUserId, setCUserId] = useState("");
  const [cName, setCName] = useState("");
  const [cModelsJson, setCModelsJson] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (email.trim()) sp.set("email", email.trim());
    if (status) sp.set("status", status);
    sp.set("page", String(page));
    sp.set("page_size", String(pageSize));
    return sp.toString();
  }, [email, status, page]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse>(`/api/admin/tokens?${queryString}`);
      setItems(json.data || []);
      setTotal(json.pagination?.total ?? 0);
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

  async function patchToken(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    setMsg(null);
    setPlainReveal(null);
    try {
      await adminFetch<MutTokenResponse>(`/api/admin/tokens/${encodeURIComponent(id)}`, { method: "PATCH", body });
      setMsg("已更新 token");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteToken(id: string) {
    if (!window.confirm("确认软删除该 token？（status → deleted）")) return;
    setBusyId(id);
    setError(null);
    setMsg(null);
    setPlainReveal(null);
    try {
      await adminFetch(`/api/admin/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
      setMsg("已删除（软删）");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  }

  async function resetToken(id: string) {
    if (!window.confirm("轮换密钥：旧 token 将失效，并生成新 token。继续？")) return;
    setBusyId(id);
    setError(null);
    setMsg(null);
    setPlainReveal(null);
    try {
      const json = await adminFetch<ResetResponse>(`/api/admin/tokens/${encodeURIComponent(id)}/reset`, { method: "POST" });
      setMsg(`已轮换：新 token id ${json.data.new_token_id}`);
      if (json.plain_token) setPlainReveal(json.plain_token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "轮换失败");
    } finally {
      setBusyId(null);
    }
  }

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    setCreateBusy(true);
    setError(null);
    setMsg(null);
    setPlainReveal(null);
    try {
      if (!cUserId.trim() || !cName.trim()) throw new Error("请填写 user_id 与 name");
      let allowed_models: unknown = null;
      const raw = cModelsJson.trim();
      if (raw) {
        try {
          allowed_models = JSON.parse(raw) as unknown;
        } catch {
          throw new Error("allowed_models 须为合法 JSON（如数组）");
        }
      }
      const json = await adminFetch<MutTokenResponse>("/api/admin/tokens", {
        method: "POST",
        body: { user_id: cUserId.trim(), name: cName.trim(), allowed_models },
      });
      setMsg(`已创建 token：${json.data.id}`);
      if (json.plain_token) setPlainReveal(json.plain_token);
      setCUserId("");
      setCName("");
      setCModelsJson("");
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreateBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="card" style={{ padding: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>API Tokens</h2>
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          列表、创建、禁用/启用、软删、轮换密钥；明文仅创建/轮换时返回一次，请立即复制保存。
        </div>
      </div>

      <section style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btnPrimary" type="button" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? "收起创建表单" : "新建 Token"}
          </button>
        </div>

        {showCreate ? (
          <form onSubmit={createToken} className="card" style={{ padding: 14, background: "rgba(255,255,255,0.03)", display: "grid", gap: 10, maxWidth: 640 }}>
            <div style={{ fontWeight: 800 }}>新建</div>
            <input value={cUserId} onChange={(e) => setCUserId(e.target.value)} style={inputStyle} placeholder="user_id (UUID)" />
            <input value={cName} onChange={(e) => setCName(e.target.value)} style={inputStyle} placeholder="token 名称" />
            <textarea
              value={cModelsJson}
              onChange={(e) => setCModelsJson(e.target.value)}
              style={{ ...inputStyle, minHeight: 80, fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}
              placeholder='allowed_models JSON，留空=null；例：["gemini-3.1-pro","gpt-4o-mini"]'
            />
            <button className="btn btnPrimary" type="submit" disabled={createBusy}>
              {createBusy ? "创建中…" : "创建"}
            </button>
          </form>
        ) : null}

        {plainReveal ? (
          <div className="card" style={{ padding: 12, background: "rgba(255,200,80,0.12)", border: "1px solid rgba(255,200,80,0.35)" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>明文 Token（只显示一次）</div>
            <div style={{ fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace", fontSize: 13, wordBreak: "break-all" }}>{plainReveal}</div>
            <button className="btn" type="button" style={{ marginTop: 8 }} onClick={() => void navigator.clipboard.writeText(plainReveal)}>
              复制到剪贴板
            </button>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} placeholder="owner email 包含" />
          <select className="btn" value={status} onChange={(e) => setStatus(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">status: 全部</option>
            <option value="active">active</option>
            <option value="disabled">disabled</option>
            <option value="deleted">deleted</option>
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
          共 {total} 条 · 第 {page}/{totalPages} 页
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
                <th style={{ minWidth: 140 }}>Name</th>
                <th style={{ width: 100 }}>Status</th>
                <th>Owner</th>
                <th style={{ minWidth: 260 }}>Token id</th>
                <th style={{ minWidth: 220 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const busy = busyId === t.id;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>
                      <span className="pill">{t.status}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.user_email || "—"}</div>
                      <div className="muted" style={{ fontSize: 11, fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
                        {t.user_id}
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize: 11, fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
                      {t.id}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {t.status === "active" ? (
                          <button
                            className="btn"
                            type="button"
                            style={{ padding: "6px 8px", fontSize: 12 }}
                            disabled={busy}
                            onClick={() => void patchToken(t.id, { status: "disabled" })}
                          >
                            禁用
                          </button>
                        ) : null}
                        {t.status === "disabled" ? (
                          <button
                            className="btn"
                            type="button"
                            style={{ padding: "6px 8px", fontSize: 12 }}
                            disabled={busy}
                            onClick={() => void patchToken(t.id, { status: "active" })}
                          >
                            启用
                          </button>
                        ) : null}
                        {t.status !== "deleted" ? (
                          <>
                            <button
                              className="btn"
                              type="button"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                              disabled={busy}
                              onClick={() => void resetToken(t.id)}
                            >
                              轮换
                            </button>
                            <button
                              className="btn"
                              type="button"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                              disabled={busy}
                              onClick={() => void deleteToken(t.id)}
                            >
                              删除
                            </button>
                          </>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>
                            已删除
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ padding: 14 }}>
                    暂无 token。
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ padding: 14 }}>
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
