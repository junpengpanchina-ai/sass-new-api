"use client";

import { useMemo, useState } from "react";

import { catalogModelsAsUi, type UiModel } from "@/lib/models";

type Price = { inputPer1k: number; outputPer1k: number };

const PRICE_TABLE: Record<string, Price> = {
  "gpt-4o-mini": { inputPer1k: 0.25, outputPer1k: 1 },
  "gemini-3.1-pro": { inputPer1k: 1.5, outputPer1k: 9 },
  "gemini-3-pro": { inputPer1k: 1.5, outputPer1k: 9 }
};

function getPrice(modelId: string): Price | null {
  return PRICE_TABLE[modelId] ?? null;
}

export default function PricingPage() {
  const [query, setQuery] = useState("");

  const data = useMemo(() => catalogModelsAsUi(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
    );
  }, [data, query]);

  return (
    <main className="container" style={{ maxWidth: 1100 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="pill">Pricing</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: "-0.02em" }}>定价</h1>
            <div className="muted" style={{ fontSize: 13 }}>
              页面列出所有可用模型，展示输入/输出价格（每 1K Token 消耗的配额）。
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索模型…" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: 14, overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 260 }}>Model</th>
                <th style={{ width: 140 }}>Provider</th>
                <th>Label</th>
                <th style={{ width: 170 }}>输入价格 / 1K</th>
                <th style={{ width: 170 }}>输出价格 / 1K</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m: UiModel) => {
                const p = getPrice(m.id);
                return (
                  <tr key={m.id}>
                    <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{m.id}</td>
                    <td>{m.provider}</td>
                    <td>{m.label}</td>
                    <td>{p ? p.inputPer1k : <span className="muted">—</span>}</td>
                    <td>{p ? p.outputPer1k : <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ padding: 14 }}>
                    未找到匹配的模型
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>价格说明</div>

          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>计费规则</div>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              <li>
                <b>输入价格</b>：每 1K 输入 Token 消耗的配额
              </li>
              <li>
                <b>输出价格</b>：每 1K 输出 Token 消耗的配额
              </li>
              <li>
                实际消耗 = Token 数量 ÷ 1000 × 对应单价
              </li>
            </ul>
          </div>

          <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>分组差异</div>
            <div className="muted" style={{ fontSize: 13 }}>
              不同分组的用户可能享有不同的计费倍率，具体以实际扣减为准（后续可在充值/账单页查看余额变化）。
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 340,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none"
};

