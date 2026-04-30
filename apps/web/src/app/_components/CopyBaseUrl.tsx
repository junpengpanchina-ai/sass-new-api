"use client";

import { useEffect, useState } from "react";

export function CopyBaseUrl() {
  const [url, setUrl] = useState("https://your-platform.com/v1");

  useEffect(() => {
    setUrl(`${window.location.origin}/v1`);
  }, []);

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
      <a className="btn btnPrimary" href="/console/playground">
        去操练场
      </a>
    </div>
  );
}

