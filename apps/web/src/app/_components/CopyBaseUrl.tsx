"use client";

import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

export function CopyBaseUrl() {
  const url = OPENAI_BASE_URL;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <code
        className="card"
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "rgba(0,0,0,0.25)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        }}
      >
        {url}
      </code>
      <button
        className="btn"
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
        }}
      >
        复制
      </button>
      <a className="btn btnPrimary" href="/console/token">
        Create API Key →
      </a>
    </div>
  );
}

