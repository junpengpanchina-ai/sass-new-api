"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminFetch } from "./_lib/adminFetch";

type Dashboard = {
  ok: true;
  data: {
    products: { total: number; active: number };
    customers: { total: number; new: number };
    orders: { total: number; paid: number; pending_delivery: number };
    activity_24h: { usage_logs: number; audit_logs: number };
    generated_at: string;
  };
};

export default function AdminHomePage() {
  const [data, setData] = useState<Dashboard["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const json = await adminFetch<Dashboard>("/api/admin/dashboard");
        if (!cancelled) setData(json.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Admin Dashboard</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            一眼看清：卖什么、谁来买、谁付钱、谁待发货。
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {data ? `更新：${new Date(data.generated_at).toLocaleString()}` : null}
        </div>
      </div>

      {error ? (
        <div className="pill bad" style={{ justifySelf: "start", marginTop: 12 }}>
          {error}
        </div>
      ) : null}

      <section style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <Card title="Products" subtitle="卖什么" value={data ? `${data.products.active}/${data.products.total}` : "…"} hint="active / total" href="/admin/products" />
          <Card title="Customers" subtitle="谁来买" value={data ? `${data.customers.new}/${data.customers.total}` : "…"} hint="new / total" href="/admin/customers" />
          <Card title="Orders" subtitle="谁付钱" value={data ? `${data.orders.paid}/${data.orders.total}` : "…"} hint="paid / total" href="/admin/orders" />
          <Card title="Pending Delivery" subtitle="待发货" value={data ? `${data.orders.pending_delivery}` : "…"} hint="paid but not delivered" href="/admin/orders" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>快捷入口</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btn btnPrimary" href="/admin/products">去上架产品</Link>
              <Link className="btn" href="/admin/customers">去看客户池</Link>
              <Link className="btn" href="/admin/orders">去建单发货</Link>
            </div>
          </div>

          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>最近 24h 活动</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div className="muted" style={{ fontSize: 13 }}>Usage logs：{data ? data.activity_24h.usage_logs : "…"}</div>
              <div className="muted" style={{ fontSize: 13 }}>Audit logs：{data ? data.activity_24h.audit_logs : "…"}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <Link className="btn" href="/admin/usage-logs" style={{ padding: "8px 10px" }}>查看 Usage Logs</Link>
                <Link className="btn" href="/admin/audit-logs" style={{ padding: "8px 10px" }}>查看 Audit Logs</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Card(props: { title: string; subtitle: string; value: string; hint: string; href: string }) {
  return (
    <Link className="card" href={props.href} style={{ padding: 14, background: "rgba(255,255,255,0.03)", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 800 }}>{props.title}</div>
        <span className="pill">{props.subtitle}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>{props.value}</div>
      <div className="muted" style={{ fontSize: 12 }}>{props.hint}</div>
    </Link>
  );
}

