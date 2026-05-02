"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type CustomerStatus = "new" | "contacted" | "paid" | "delivered" | "invalid";

type Customer = {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  telegram: string | null;
  source: string | null;
  status: CustomerStatus;
  note: string | null;
  created_at: string;
  updated_at?: string;
};

type ListResponse = {
  ok: true;
  data: Customer[];
  pagination?: { page: number; page_size: number; total: number };
};

type MutResponse = { ok: true; data: Customer };

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

const statusOptions: CustomerStatus[] = ["new", "contacted", "paid", "delivered", "invalid"];

export default function AdminCustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [source, setSource] = useState<string>("");

  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState<Partial<Customer>>({
    email: "",
    name: "",
    company: "",
    telegram: "",
    source: "unknown",
    status: "new",
    note: "",
  });

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (status) sp.set("status", status);
    if (source.trim()) sp.set("source", source.trim());
    sp.set("page", "1");
    sp.set("page_size", "50");
    return sp.toString();
  }, [q, status, source]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse>(`/api/admin/customers?${queryString}`);
      setItems(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({
      email: "",
      name: "",
      company: "",
      telegram: "",
      source: "unknown",
      status: "new",
      note: "",
    });
  }

  function openEdit(c: Customer) {
    setCreating(false);
    setEditing(c);
    setForm({
      ...c,
      note: c.note || "",
      name: c.name || "",
      company: c.company || "",
      telegram: c.telegram || "",
      source: c.source || "unknown",
    });
  }

  function closeModal() {
    setEditing(null);
    setCreating(false);
  }

  async function save() {
    setMsg(null);
    try {
      if (creating) {
        const payload = {
          email: String(form.email || "").trim(),
          name: String(form.name || "").trim() || null,
          company: String(form.company || "").trim() || null,
          telegram: String(form.telegram || "").trim() || null,
          source: String(form.source || "").trim() || "unknown",
          status: form.status,
          note: String(form.note || "").trim() || null,
        };
        const res = await adminFetch<MutResponse>("/api/admin/customers", { method: "POST", body: payload });
        setItems((prev) => [res.data, ...prev]);
        setMsg("已创建");
        closeModal();
      } else if (editing) {
        const payload = {
          status: form.status,
          note: String(form.note || "").trim() || null,
          company: String(form.company || "").trim() || null,
          telegram: String(form.telegram || "").trim() || null,
          name: String(form.name || "").trim() || null,
          source: String(form.source || "").trim() || "unknown",
        };
        const res = await adminFetch<MutResponse>(`/api/admin/customers/${editing.id}`, { method: "PATCH", body: payload });
        setItems((prev) => prev.map((x) => (x.id === editing.id ? res.data : x)));
        setMsg("已保存");
        closeModal();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Customers</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            客户池：线索、跟进状态与备注。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btnPrimary" type="button" onClick={openCreate}>
            新增客户
          </button>
          <button className="btn" type="button" onClick={load} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>

      <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ ...inputStyle, maxWidth: 360 }}
            placeholder="搜索 email / name / telegram…"
          />
          <select className="btn" value={status} onChange={(e) => setStatus(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">Status: All</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input value={source} onChange={(e) => setSource(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="source（可选）" />
          {msg ? <span className="muted" style={{ fontSize: 13 }}>{msg}</span> : null}
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
                <th style={{ width: 240 }}>Email</th>
                <th style={{ width: 140 }}>Name</th>
                <th style={{ width: 160 }}>Company</th>
                <th style={{ width: 140 }}>Telegram</th>
                <th style={{ width: 120 }}>Source</th>
                <th style={{ width: 120 }}>Status</th>
                <th>Note</th>
                <th style={{ width: 170 }}>Created</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{c.email}</td>
                  <td>{c.name || "-"}</td>
                  <td>{c.company || "-"}</td>
                  <td>{c.telegram || "-"}</td>
                  <td>{c.source || "-"}</td>
                  <td>
                    <span className={c.status === "invalid" ? "pill bad" : c.status === "paid" || c.status === "delivered" ? "pill good" : "pill"}>
                      {c.status}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>{c.note || ""}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{new Date(c.created_at).toLocaleString()}</td>
                  <td>
                    <button className="btn" type="button" onClick={() => openEdit(c)} style={{ padding: "6px 10px" }}>
                      编辑
                    </button>
                  </td>
                </tr>
              ))}

              {!items.length && !loading ? (
                <tr>
                  <td colSpan={9} className="muted" style={{ padding: 14 }}>
                    暂无客户。点击右上角“新增客户”录入第一条。
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

      {creating || editing ? (
        <Modal title={creating ? "新增客户" : `编辑客户 · ${editing?.email || ""}`} onClose={closeModal} onSave={save}>
          <div style={{ display: "grid", gap: 10 }}>
            {creating ? (
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>email</div>
                <input value={String(form.email || "")} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={inputStyle} placeholder="a@example.com" />
              </label>
            ) : (
              <div className="pill" style={{ justifySelf: "start" }}>
                email: {editing?.email}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>status</div>
                <select
                  className="btn"
                  value={String(form.status || "new")}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CustomerStatus }))}
                  style={{ justifyContent: "flex-start" }}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>source</div>
                <input value={String(form.source || "")} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} style={inputStyle} placeholder="telegram / website / referral" />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>name</div>
                <input value={String(form.name || "")} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>company</div>
                <input value={String(form.company || "")} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} style={inputStyle} />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>telegram</div>
              <input value={String(form.telegram || "")} onChange={(e) => setForm((p) => ({ ...p, telegram: e.target.value }))} style={inputStyle} placeholder="@yourname" />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>note</div>
              <textarea
                value={String(form.note || "")}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                style={{ ...inputStyle, maxWidth: "none", minHeight: 84, resize: "vertical" }}
                placeholder="跟进记录（可空）"
              />
            </label>

            {msg ? <div className="muted" style={{ fontSize: 13 }}>{msg}</div> : null}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function Modal(props: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 18,
        zIndex: 50,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="card" style={{ width: "min(860px, 96vw)", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 800 }}>{props.title}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" type="button" onClick={props.onClose} style={{ padding: "8px 10px" }}>
              取消
            </button>
            <button className="btn btnPrimary" type="button" onClick={props.onSave} style={{ padding: "8px 10px" }}>
              保存
            </button>
          </div>
        </div>
        {props.children}
      </div>
    </div>
  );
}

