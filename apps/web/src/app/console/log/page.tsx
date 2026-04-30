"use client";

import { useEffect, useMemo, useState } from "react";

import { isoDay, loadUsageLogs, saveUsageLogs, seedDemoUsageLogs, type UsageLog } from "@/lib/usageLogs";

type Filters = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  model: string;
  tokenName: string;
};

export default function UsageLogPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    from: "",
    to: "",
    model: "",
    tokenName: ""
  });

  useEffect(() => {
    setLogs(loadUsageLogs());
  }, []);

  const filtered = useMemo(() => {
    const from = filters.from ? new Date(filters.from + "T00:00:00Z").toISOString() : null;
    const to = filters.to ? new Date(filters.to + "T23:59:59Z").toISOString() : null;
    const modelQ = filters.model.trim().toLowerCase();
    const tokenQ = filters.tokenName.trim().toLowerCase();

    return logs.filter((l) => {
      if (from && l.at < from) return false;
      if (to && l.at > to) return false;
      if (modelQ && !l.model.toLowerCase().includes(modelQ)) return false;
      if (tokenQ && !l.tokenName.toLowerCase().includes(tokenQ)) return false;
      return true;
    });
  }, [logs, filters]);

  const tokenOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.tokenName));
    return Array.from(set).sort();
  }, [logs]);

  function apply() {
    // filters are reactive; this is just here to match UX wording.
    setShowFilters(false);
  }

  function seed() {
    const next = seedDemoUsageLogs();
    setLogs(next);
  }

  function clear() {
    saveUsageLogs([]);
    setLogs([]);
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>使用记录</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            查看每次 API 调用的详细信息，支持按时间、模型、令牌等条件过滤。
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={() => setShowFilters((v) => !v)}>
            筛选
          </button>
          <button className="btn" type="button" onClick={seed}>
            生成演示数据
          </button>
          <button className="btn" type="button" onClick={clear}>
            清空
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="card" style={{ marginTop: 14, padding: 14, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr 1.2fr", gap: 12 }}>
            <Field label="开始日期">
              <input value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} style={inputStyle} type="date" />
            </Field>
            <Field label="结束日期">
              <input value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} style={inputStyle} type="date" />
            </Field>
            <Field label="模型关键词">
              <input value={filters.model} onChange={(e) => setFilters({ ...filters, model: e.target.value })} style={inputStyle} placeholder="如 gpt-4.1" />
            </Field>
            <Field label="令牌名">
              <input
                value={filters.tokenName}
                onChange={(e) => setFilters({ ...filters, tokenName: e.target.value })}
                style={inputStyle}
                placeholder="如 生产环境"
                list="token-names"
              />
              <datalist id="token-names">
                {tokenOptions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => setFilters({ from: "", to: "", model: "", tokenName: "" })}>
              重置
            </button>
            <button className="btn btnPrimary" type="button" onClick={apply}>
              查询
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14, overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 170 }}>时间</th>
              <th style={{ width: 200 }}>模型</th>
              <th style={{ width: 140 }}>令牌</th>
              <th style={{ width: 160 }}>Tokens (in/out)</th>
              <th style={{ width: 140 }}>配额消耗</th>
              <th style={{ width: 120 }}>状态</th>
              <th style={{ width: 120 }}>延迟</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td className="muted" style={{ fontSize: 13 }}>
                  {new Date(l.at).toLocaleString()}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {isoDay(l.at)}
                  </div>
                </td>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{l.model}</td>
                <td>{l.tokenName}</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {l.inputTokens.toLocaleString()} / {l.outputTokens.toLocaleString()}
                </td>
                <td>{l.quotaCost.toLocaleString()}</td>
                <td>
                  <span className={`pill ${l.status === "ok" ? "good" : "bad"}`}>{l.status}</span>
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {l.latencyMs}ms
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted" style={{ padding: 14 }}>
                  暂无记录。可点击「生成演示数据」查看效果。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="muted" style={{ fontSize: 13 }}>
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none"
};

