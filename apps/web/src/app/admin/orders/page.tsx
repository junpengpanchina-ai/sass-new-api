"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type PaymentStatus = "created" | "paid" | "failed" | "cancelled";
type DeliveryStatus = "pending" | "delivered" | "cancelled";

type Order = {
  id: number;
  customer_id: number | null;
  customer_email: string | null;
  product_id: string | null;
  product_code: string | null;
  product_name: string | null;
  amount: number;
  currency: "USD" | "CNY";
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  delivery_content: string | null;
  note: string | null;
  created_at: string;
  paid_at?: string | null;
  delivered_at?: string | null;
};

type ProductLite = {
  id: string;
  code: string;
  name: string;
  currency: "USD" | "CNY";
  sell_price: number;
  active: boolean;
};

type CustomerLite = { id: number; email: string; status: string };

type ListResponse<T> = {
  ok: true;
  data: T[];
  pagination?: { page: number; page_size: number; total: number };
};

type MutResponse<T> = { ok: true; data: T };

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

const paymentOptions: PaymentStatus[] = ["created", "paid", "failed", "cancelled"];
const deliveryOptions: DeliveryStatus[] = ["pending", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [deliveryStatus, setDeliveryStatus] = useState<string>("");

  const [editing, setEditing] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [createForm, setCreateForm] = useState<{
    customer_id: string;
    product_id: string;
    amount: string;
    currency: "USD" | "CNY";
    note: string;
  }>({ customer_id: "", product_id: "", amount: "", currency: "USD", note: "" });

  const [editForm, setEditForm] = useState<{
    payment_status: PaymentStatus;
    delivery_status: DeliveryStatus;
    delivery_content: string;
    note: string;
  }>({ payment_status: "created", delivery_status: "pending", delivery_content: "", note: "" });

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (paymentStatus) sp.set("payment_status", paymentStatus);
    if (deliveryStatus) sp.set("delivery_status", deliveryStatus);
    sp.set("page", "1");
    sp.set("page_size", "50");
    return sp.toString();
  }, [q, paymentStatus, deliveryStatus]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse<Order>>(`/api/admin/orders?${queryString}`);
      setItems(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function loadRefs() {
    setLoadingRefs(true);
    try {
      const [c, p] = await Promise.all([
        adminFetch<ListResponse<CustomerLite>>("/api/admin/customers?page=1&page_size=200"),
        adminFetch<ListResponse<ProductLite>>("/api/admin/products?page=1&page_size=200"),
      ]);
      setCustomers((c.data || []).map((x: any) => ({ id: x.id, email: x.email, status: x.status })));
      setProducts((p.data || []).map((x: any) => ({ id: x.id, code: x.code, name: x.name, currency: x.currency, sell_price: x.sell_price, active: x.active })));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load refs");
    } finally {
      setLoadingRefs(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setMsg(null);
    setCreateForm({ customer_id: "", product_id: "", amount: "", currency: "USD", note: "" });
    void loadRefs();
  }

  function openEdit(o: Order) {
    setCreating(false);
    setEditing(o);
    setMsg(null);
    setEditForm({
      payment_status: o.payment_status,
      delivery_status: o.delivery_status,
      delivery_content: o.delivery_content || "",
      note: o.note || "",
    });
  }

  function closeModal() {
    setEditing(null);
    setCreating(false);
  }

  async function createOrder() {
    setMsg(null);
    try {
      const payload = {
        customer_id: Number(createForm.customer_id),
        product_id: createForm.product_id,
        amount: Number(createForm.amount),
        currency: createForm.currency,
        payment_status: "created",
        delivery_status: "pending",
        note: createForm.note.trim() || null,
      };
      const res = await adminFetch<MutResponse<Order>>("/api/admin/orders", { method: "POST", body: payload });
      setItems((prev) => [res.data, ...prev]);
      setMsg("已创建订单");
      closeModal();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "创建失败");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setMsg(null);
    try {
      const payload = {
        payment_status: editForm.payment_status,
        delivery_status: editForm.delivery_status,
        delivery_content: editForm.delivery_content.trim() || null,
        note: editForm.note.trim() || null,
      };
      const res = await adminFetch<MutResponse<Order>>(`/api/admin/orders/${editing.id}`, { method: "PATCH", body: payload });
      setItems((prev) => prev.map((x) => (x.id === editing.id ? res.data : x)));
      setMsg("已保存");
      closeModal();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Orders</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            手动建单、标记付款与发货，记录交付内容。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btnPrimary" type="button" onClick={openCreate}>
            新建订单
          </button>
          <button className="btn" type="button" onClick={load} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>

      <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputStyle, maxWidth: 360 }} placeholder="搜索 email / product / order id…" />
          <select className="btn" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">Payment: All</option>
            {paymentOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className="btn" value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">Delivery: All</option>
            {deliveryOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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
                <th style={{ width: 90 }}>ID</th>
                <th style={{ width: 240 }}>Customer</th>
                <th style={{ width: 220 }}>Product</th>
                <th style={{ width: 110 }}>Amount</th>
                <th style={{ width: 80 }}>CCY</th>
                <th style={{ width: 120 }}>Payment</th>
                <th style={{ width: 120 }}>Delivery</th>
                <th>Delivery Content</th>
                <th style={{ width: 180 }}>Created</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{o.id}</td>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{o.customer_email || "-"}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{o.product_name || "-"}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{o.product_code || ""}</div>
                  </td>
                  <td>{o.amount}</td>
                  <td>{o.currency}</td>
                  <td>
                    <span className={o.payment_status === "paid" ? "pill good" : o.payment_status === "failed" || o.payment_status === "cancelled" ? "pill bad" : "pill"}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td>
                    <span className={o.delivery_status === "delivered" ? "pill good" : o.delivery_status === "cancelled" ? "pill bad" : "pill"}>
                      {o.delivery_status}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{o.delivery_content || ""}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleString()}</td>
                  <td>
                    <button className="btn" type="button" onClick={() => openEdit(o)} style={{ padding: "6px 10px" }}>
                      编辑
                    </button>
                  </td>
                </tr>
              ))}

              {!items.length && !loading ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ padding: 14 }}>
                    暂无订单。点击右上角“新建订单”创建第一条。
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ padding: 14 }}>
                    加载中…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {creating ? (
        <Modal title="新建订单" onClose={closeModal} onSave={createOrder} saveLabel="创建">
          <div style={{ display: "grid", gap: 10 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {loadingRefs ? "加载客户/产品中…" : customers.length && products.length ? "请选择客户与产品" : "客户或产品为空：请先创建 Customers / Products"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>customer</div>
                <select
                  className="btn"
                  value={createForm.customer_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, customer_id: e.target.value }))}
                  style={{ justifyContent: "flex-start" }}
                >
                  <option value="">请选择客户…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.email} ({c.status})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>product</div>
                <select
                  className="btn"
                  value={createForm.product_id}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = products.find((p) => p.id === pid);
                    setCreateForm((prev) => ({
                      ...prev,
                      product_id: pid,
                      currency: (prod?.currency || prev.currency) as any,
                      amount: prod ? String(prod.sell_price) : prev.amount,
                    }));
                  }}
                  style={{ justifyContent: "flex-start" }}
                >
                  <option value="">请选择产品…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name} {p.active ? "" : "(off)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>amount（分）</div>
                <input
                  value={createForm.amount}
                  onChange={(e) => setCreateForm((p) => ({ ...p, amount: e.target.value }))}
                  style={inputStyle}
                  inputMode="numeric"
                  placeholder="例如 9900"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>currency</div>
                <select
                  className="btn"
                  value={createForm.currency}
                  onChange={(e) => setCreateForm((p) => ({ ...p, currency: e.target.value as any }))}
                  style={{ justifyContent: "flex-start" }}
                >
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>note</div>
              <textarea
                value={createForm.note}
                onChange={(e) => setCreateForm((p) => ({ ...p, note: e.target.value }))}
                style={{ ...inputStyle, maxWidth: "none", minHeight: 80, resize: "vertical" }}
                placeholder="可选备注"
              />
            </label>

            {msg ? <div className="muted" style={{ fontSize: 13 }}>{msg}</div> : null}
          </div>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title={`编辑订单 · #${editing.id}`} onClose={closeModal} onSave={saveEdit} saveLabel="保存">
          <div style={{ display: "grid", gap: 10 }}>
            <div className="pill" style={{ justifySelf: "start" }}>
              {editing.customer_email || "-"} · {editing.product_code || "-"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>payment_status</div>
                <select
                  className="btn"
                  value={editForm.payment_status}
                  onChange={(e) => setEditForm((p) => ({ ...p, payment_status: e.target.value as PaymentStatus }))}
                  style={{ justifyContent: "flex-start" }}
                >
                  {paymentOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 13 }}>delivery_status</div>
                <select
                  className="btn"
                  value={editForm.delivery_status}
                  onChange={(e) => setEditForm((p) => ({ ...p, delivery_status: e.target.value as DeliveryStatus }))}
                  style={{ justifyContent: "flex-start" }}
                >
                  {deliveryOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>delivery_content</div>
              <textarea
                value={editForm.delivery_content}
                onChange={(e) => setEditForm((p) => ({ ...p, delivery_content: e.target.value }))}
                style={{ ...inputStyle, maxWidth: "none", minHeight: 120, resize: "vertical" }}
                placeholder="例如：API Key / Base URL / Model / 交付备注"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>note</div>
              <textarea
                value={editForm.note}
                onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                style={{ ...inputStyle, maxWidth: "none", minHeight: 80, resize: "vertical" }}
                placeholder="内部备注（可空）"
              />
            </label>

            <div className="muted" style={{ fontSize: 12 }}>
              {editing.paid_at ? `paid_at: ${new Date(editing.paid_at).toLocaleString()} ` : ""}
              {editing.delivered_at ? `delivered_at: ${new Date(editing.delivered_at).toLocaleString()}` : ""}
            </div>

            {msg ? <div className="muted" style={{ fontSize: 13 }}>{msg}</div> : null}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function Modal(props: { title: string; saveLabel: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
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
              {props.saveLabel}
            </button>
          </div>
        </div>
        {props.children}
      </div>
    </div>
  );
}

