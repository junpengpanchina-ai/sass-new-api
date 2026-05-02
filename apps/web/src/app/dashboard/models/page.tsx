type UiModel = {
  id: string;
  provider: string;
  label: string;
  contextWindow: number;
  input: "text" | "multimodal";
  enabled: boolean;
};

import { MODELS } from "@/lib/models";

export default async function ModelsPage() {
  const data = MODELS as UiModel[];
  const updatedAt = new Date().toISOString();

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>模型</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            本地静态配置（后续替换为 gateway `/v1/models` 或 Supabase 配置表）。更新：{new Date(updatedAt).toLocaleString()}
          </div>
        </div>
        <a className="btn btnPrimary" href="/api/models" target="_blank" rel="noreferrer">
          查看 JSON
        </a>
      </div>

      <div style={{ marginTop: 14, overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>Model ID</th>
              <th style={{ width: 120 }}>Provider</th>
              <th>Label</th>
              <th style={{ width: 140 }}>Input</th>
              <th style={{ width: 160 }}>Context</th>
              <th style={{ width: 120 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {m.id}
                </td>
                <td>{m.provider}</td>
                <td>{m.label}</td>
                <td>{m.input}</td>
                <td>{m.contextWindow.toLocaleString()}</td>
                <td>
                  <span className={`pill ${m.enabled ? "good" : "bad"}`}>{m.enabled ? "enabled" : "disabled"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

