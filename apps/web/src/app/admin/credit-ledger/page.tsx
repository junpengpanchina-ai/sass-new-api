"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { adminFetch } from "../_lib/adminFetch";

type LedgerRow = {
  id: number;
  created_at: string;
  user_id: string;
  token_id: string | null;
  order_id: number | null;
  kind: string;
  amount: number;
  credits: number | null;
  balance_after: number | null;
  reason: string | null;
  request_id: string | null;
  usage_log_id: number | null;
  metadata: Record<string, unknown> | null;
};

type ListResponse = {
  ok: true;
  data: LedgerRow[];
  pagination?: { page: number; page_size: number; total: number };
};

type GrantResponse = {
  ok: true;
  data: {
    credit_ledger_id: number;
    user_id: string;
    credits_balance_before: number;
    credits_balance_after: number;
    amount: number;
    via_rpc?: boolean;
  };
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

function CreditLedgerContent() {
  const searchParams = useSearchParams();
  const presetUserId = searchParams.get("user_id") || "";

  const [items, setItems] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState(presetUserId);
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const [grantUserId, setGrantUserId] = useState(presetUserId);
  const [grantAmount, setGrantAmount] = useState("100");
  const [grantReason, setGrantReason] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);

  useEffect(() => {
    setUserId((u) => (presetUserId && !u ? presetUserId : u));
    setGrantUserId((u) => (presetUserId && !u ? presetUserId : u));
  }, [presetUserId]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (userId.trim()) sp.set("user_id", userId.trim());
    if (kind) sp.set("kind", kind);
    sp.set("page", String(page));
    sp.set("page_size", String(pageSize));
    return sp.toString();
  }, [userId, kind, page]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<ListResponse>(`/api/admin/credit-ledger?${queryString}`);
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

  async function submitGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantBusy(true);
    setMsg(null);
    setError(null);
    try {
      const amount = Number.parseInt(grantAmount, 10);
      if (!grantUserId.trim()) throw new Error("请填写 user_id");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount 须为正整数");

      const json = await adminFetch<GrantResponse>("/api/admin/credit-ledger", {
        method: "POST",
        body: {
          user_id: grantUserId.trim(),
          amount,
          reason: grantReason.trim() || undefined,
        },
      });
      setMsg(
        `已入账：ledger #${json.data.credit_ledger_id}，余额 ${json.data.credits_balance_before} → ${json.data.credits_balance_after}（+${json.data.amount}）${json.data.via_rpc ? " · 原子 RPC" : " · 顺序写入（未部署 RPC）"}`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发放失败");
    } finally {
      setGrantBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="card" style={{ padding: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Credit Ledger</h2>
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          额度流水查询；下方可手工加额度（<code>credit_add</code>）。建议在 Supabase 执行 <code>docs/supabase-rpc-credits.sql</code> 启用单事务 RPC；未部署时自动回退为顺序写入。Stripe 到账仍以 Webhook 为准。
        </div>
      </div>

      <section className="card" style={{ marginTop: 16, padding: 14, background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>手工加额度</div>
        <form onSubmit={submitGrant} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
          <input
            value={grantUserId}
            onChange={(e) => setGrantUserId(e.target.value)}
            style={inputStyle}
            placeholder="user_id (UUID)"
            autoComplete="off"
          />
          <input
            value={grantAmount}
            onChange={(e) => setGrantAmount(e.target.value)}
            style={inputStyle}
            placeholder="amount（正整数 credits）"
            inputMode="numeric"
          />
          <input
            value={grantReason}
            onChange={(e) => setGrantReason(e.target.value)}
            style={inputStyle}
            placeholder="reason（可选）"
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btnPrimary" type="submit" disabled={grantBusy}>
              {grantBusy ? "提交中…" : "确认加额度"}
            </button>
            <Link className="btn" href="/admin/users">
              去用户列表
            </Link>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }} placeholder="筛选 user_id" />
          <select className="btn" value={kind} onChange={(e) => setKind(e.target.value)} style={{ justifyContent: "flex-start" }}>
            <option value="">kind: 全部</option>
            <option value="credit_add">credit_add</option>
            <option value="credit_deduct">credit_deduct</option>
            <option value="credit_refund">credit_refund</option>
            <option value="credit_adjust">credit_adjust</option>
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
          <div className="muted" style={{ fontSize: 13 }}>
            共 {total} 条 · 第 {page}/{totalPages} 页
          </div>
        </div>

        {msg ? <div className="pill good" style={{ justifySelf: "start" }}>{msg}</div> : null}
        {error ? <div className="pill bad" style={{ justifySelf: "start" }}>{error}</div> : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="button" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            上一页
          </button>
          <button className="btn" type="button" disabled={loading || page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            下一页
          </button>
        </div>

        <div style={{ overflow: "auto", borderRadius: 14, border: "1px solid var(--border)" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Created</th>
                <th style={{ width: 100 }}>Kind</th>
                <th style={{ width: 80 }}>Amount</th>
                <th style={{ width: 90 }}>Balance after</th>
                <th style={{ width: 280 }}>User</th>
                <th style={{ width: 100 }}>Usage log</th>
                <th>Reason / meta</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="muted" style={{ fontSize: 13 }}>{new Date(row.created_at).toLocaleString()}</td>
                  <td>
                    <span className="pill">{row.kind}</span>
                  </td>
                  <td>{row.amount}</td>
                  <td>{row.balance_after ?? "-"}</td>
                  <td className="muted" style={{ fontSize: 12, fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
                    {row.user_id}
                  </td>
                  <td>{row.usage_log_id ?? "-"}</td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {row.reason || "-"}
                    {row.request_id ? ` · req ${row.request_id.slice(0, 8)}…` : ""}
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 14 }}>
                    暂无流水。
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 14 }}>
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

export default function AdminCreditLedgerPage() {
  return (
    <Suspense
      fallback={
        <main className="card" style={{ padding: 18 }}>
          <div className="muted">加载中…</div>
        </main>
      }
    >
      <CreditLedgerContent />
    </Suspense>
  );
}
