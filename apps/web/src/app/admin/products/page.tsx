"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type Product = {
  id: string;
  code: string;
  name: string;
  upstream_name: string | null;
  upstream_model: string | null;
  category: "text" | "image" | "video";
  sell_price: number;
  cost_price: number | null;
  currency: "USD" | "CNY";
  active: boolean;
  featured: boolean;
  sort_order: number;
  description: string | null;
  created_at?: string;
};

type ListResponse = {
  ok: true;
  data: Product[];
  pagination?: { page: number; page_size: number; total: number };
};

type MutResponse = { ok: true; data: Product };

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

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [active, setActive] = useState<string>("");
  const [featured, setFeatured] = useState<string>("");

  const [msg, setMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState<Partial<Product>>({
    code: "",
    name: "",
    upstream_name: "",
    upstream_model: "",
    category: "text",
    sell_price: 0,
    cost_price: null,
    currency: "USD",
    active: true,
    featured: false,
    sort_order: 0,
    description: "",
  });

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (category) sp.set("category", category);
    if (active) sp.set("active", active);
    if (featured) sp.set("featured", featured);
    sp.set("page", "1");
    sp.set("page_size", "50");
    return sp.toString();
  }, [q, category, active, featured]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse>(`/api/admin/products?${queryString}`);
      setItems(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
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
      code: "",
      name: "",
      upstream_name: "",
      upstream_model: "",
      category: "text",
      sell_price: 0,
      cost_price: null,
      currency: "USD",
      active: true,
      featured: false,
      sort_order: 0,
      description: "",
    });
  }

  function openEdit(p: Product) {
    setCreating(false);
    setEditing(p);
    setForm({
      ...p,
      description: p.description || "",
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
          code: String(form.code || "").trim(),
          name: String(form.name || "").trim(),
          upstream_name: (String(form.upstream_name || "").trim() || null) as string | null,
          upstream_model: (String(form.upstream_model || "").trim() || null) as string | null,
          category: form.category,
          sell_price: Number(form.sell_price || 0),
          cost_price: form.cost_price === null || form.cost_price === undefined || form.cost_price === ("" as any) ? null : Number(form.cost_price),
          currency: form.currency,
          active: Boolean(form.active),
          featured: Boolean(form.featured),
          sort_order: Number(form.sort_order || 0),
          description: String(form.description || "").trim() || null,
        };
        const res = await adminFetch<MutResponse>("/api/admin/products", { method: "POST", body: payload });
        setMsg("已创建");
        setItems((prev) => [res.data, ...prev]);
        closeModal();
      } else if (editing) {
        const payload = {
          name: String(form.name || "").trim(),
          upstream_name: (String(form.upstream_name || "").trim() || null) as string | null,
          upstream_model: (String(form.upstream_model || "").trim() || null) as string | null,
          category: form.category,
          sell_price: Number(form.sell_price || 0),
          cost_price: form.cost_price === null || form.cost_price === undefined || form.cost_price === ("" as any) ? null : Number(form.cost_price),
          currency: form.currency,
          active: Boolean(form.active),
          featured: Boolean(form.featured),
          sort_order: Number(form.sort_order || 0),
          description: String(form.description || "").trim() || null,
        };
        const res = await adminFetch<MutResponse>(`/api/admin/products/${editing.id}`, { method: "PATCH", body: payload });
        setMsg("已保存");
        setItems((prev) => prev.map((x) => (x.id === editing.id ? res.data : x)));
        closeModal();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    }
  }

  async function quickToggle(id: string, patch: Partial<Product>) {
    setMsg(null);
    try {
      const res = await adminFetch<MutResponse>(`/api/admin/products/${id}`, { method: "PATCH", body: patch });
      setItems((prev) => prev.map((x) => (x.id === id ? res.data : x)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "更新失败");
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Products</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            管理你当前卖什么（上游模型/产品 + 定价 + 上架/推荐）。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btnPrimary" type="button" onClick={openCreate}>
            新增产品
          </button>
          <button className="btn" type="button" onClick={load} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>

      <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputStyle, maxWidth: 360 }} placeholder="搜索 code / name…" />
          <select className="btn" value={category} onChange={(e) => setCategory(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">Category: All</option>
            <option value="text">text</option>
            <option value="image">image</option>
            <option value="video">video</option>
          </select>
          <select className="btn" value={active} onChange={(e) => setActive(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">Active: All</option>
            <option value="true">active</option>
            <option value="false">inactive</option>
          </select>
          <select className="btn" value={featured} onChange={(e) => setFeatured(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">Featured: All</option>
            <option value="true">featured</option>
            <option value="false">normal</option>
          </select>
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
                <th style={{ width: 190 }}>Code</th>
                <th>Name</th>
                <th style={{ width: 90 }}>Category</th>
                <th style={{ width: 120 }}>Upstream</th>
                <th style={{ width: 190 }}>Upstream Model</th>
                <th style={{ width: 100 }}>Sell</th>
                <th style={{ width: 90 }}>Cost</th>
                <th style={{ width: 80 }}>CCY</th>
                <th style={{ width: 90 }}>Active</th>
                <th style={{ width: 100 }}>Featured</th>
                <th style={{ width: 90 }}>Sort</th>
                <th style={{ width: 170 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{p.code}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    {p.description ? <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{p.description}</div> : null}
                  </td>
                  <td>{p.category}</td>
                  <td>{p.upstream_name || "-"}</td>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{p.upstream_model || "-"}</td>
                  <td>{p.sell_price}</td>
                  <td>{p.cost_price ?? "-"}</td>
                  <td>{p.currency}</td>
                  <td>{p.active ? <span className="pill good">active</span> : <span className="pill bad">off</span>}</td>
                  <td>{p.featured ? <span className="pill good">yes</span> : <span className="pill">no</span>}</td>
                  <td>{p.sort_order}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn" type="button" onClick={() => openEdit(p)} style={{ padding: "6px 10px" }}>
                        编辑
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => quickToggle(p.id, { active: !p.active })}
                        style={{ padding: "6px 10px" }}
                      >
                        {p.active ? "下架" : "上架"}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => quickToggle(p.id, { featured: !p.featured })}
                        style={{ padding: "6px 10px" }}
                      >
                        {p.featured ? "取消推荐" : "推荐"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!items.length && !loading ? (
                <tr>
                  <td colSpan={12} className="muted" style={{ padding: 14 }}>
                    暂无产品。点击右上角“新增产品”创建第一条。
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={12} className="muted" style={{ padding: 14 }}>
                    加载中…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {creating || editing ? (
        <Modal title={creating ? "新增产品" : `编辑产品 · ${editing?.code || ""}`} onClose={closeModal} onSave={save} savingText="保存">
          <div style={{ display: "grid", gap: 10 }}>
            {creating ? (
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>code（不可重复）</div>
                <input value={String(form.code || "")} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} style={inputStyle} placeholder="nano-banana-pro" />
              </label>
            ) : (
              <div className="pill" style={{ justifySelf: "start" }}>
                code: {editing?.code}
              </div>
            )}

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>name</div>
              <input value={String(form.name || "")} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Nano Banana Pro" />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>category</div>
                <select className="btn" value={String(form.category || "text")} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as any }))} style={{ justifyContent: "flex-start" }}>
                  <option value="text">text</option>
                  <option value="image">image</option>
                  <option value="video">video</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>currency</div>
                <select className="btn" value={String(form.currency || "USD")} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as any }))} style={{ justifyContent: "flex-start" }}>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>sell_price（分）</div>
                <input
                  value={String(form.sell_price ?? 0)}
                  onChange={(e) => setForm((p) => ({ ...p, sell_price: Number(e.target.value) }))}
                  style={inputStyle}
                  inputMode="numeric"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>cost_price（分，可空）</div>
                <input
                  value={form.cost_price === null || form.cost_price === undefined ? "" : String(form.cost_price)}
                  onChange={(e) => setForm((p) => ({ ...p, cost_price: e.target.value === "" ? null : Number(e.target.value) }))}
                  style={inputStyle}
                  inputMode="numeric"
                  placeholder="(optional)"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>sort_order</div>
                <input
                  value={String(form.sort_order ?? 0)}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                  style={inputStyle}
                  inputMode="numeric"
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>upstream_name</div>
                <input value={String(form.upstream_name || "")} onChange={(e) => setForm((p) => ({ ...p, upstream_name: e.target.value }))} style={inputStyle} placeholder="grsai" />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>upstream_model</div>
                <input value={String(form.upstream_model || "")} onChange={(e) => setForm((p) => ({ ...p, upstream_model: e.target.value }))} style={inputStyle} placeholder="nano-banana-pro" />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>description</div>
              <textarea
                value={String(form.description || "")}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                style={{ ...inputStyle, maxWidth: "none", minHeight: 84, resize: "vertical" }}
                placeholder="简短说明（可空）"
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label className="btn" style={{ justifyContent: "flex-start", gap: 10 }}>
                <input type="checkbox" checked={Boolean(form.active)} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
                active
              </label>
              <label className="btn" style={{ justifyContent: "flex-start", gap: 10 }}>
                <input type="checkbox" checked={Boolean(form.featured)} onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))} />
                featured
              </label>
              {msg ? <span className="muted" style={{ fontSize: 13 }}>{msg}</span> : null}
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function Modal(props: {
  title: string;
  savingText: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
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
      <div className="card" style={{ width: "min(920px, 96vw)", padding: 14 }}>
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

