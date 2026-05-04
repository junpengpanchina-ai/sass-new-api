"use client";

import { useEffect, useState } from "react";

import type { ModelShelfItem } from "@/lib/modelCatalog";
import { availabilityLabel, availabilityPillClass, billingLabel } from "@/lib/modelCatalog";

export function ModelShelfClient() {
  const [items, setItems] = useState<ModelShelfItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [gatewayConnected, setGatewayConnected] = useState<boolean | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/model-shelf", { cache: "no-store" });
        const json = (await res.json()) as {
          items?: ModelShelfItem[];
          updatedAt?: string;
          error?: string;
          gatewayConnected?: boolean;
          gatewayError?: string;
        };
        if (!res.ok) throw new Error(json.error || `加载失败 (${res.status})`);
        if (!cancelled) {
          setItems(json.items ?? []);
          setUpdatedAt(json.updatedAt ?? null);
          setGatewayConnected(json.gatewayConnected ?? false);
          setGatewayError(json.gatewayError ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyId(id: string) {
    await navigator.clipboard.writeText(id);
  }

  if (error) {
    return (
      <div className="pill bad" style={{ justifySelf: "start" }}>
        {error}
      </div>
    );
  }

  if (!items) {
    return <div className="muted">加载货架中…</div>;
  }

  return (
    <>
      {gatewayConnected === false ? (
        <div className="pill warn" style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.5 }}>
          当前未与网关实时对齐
          {gatewayError === "missing_internal_api_key"
            ? "（服务端未配置 TOKFAI_INTERNAL_API_KEY，仅展示目录；可用性以实际 API Key 调用为准）。"
            : gatewayError
              ? `（${gatewayError}）。`
              : "。"}
        </div>
      ) : null}
      {gatewayConnected === true && updatedAt ? (
        <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          已与网关对齐 · {new Date(updatedAt).toLocaleString()}
        </div>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14
        }}
      >
        {items.map((m) => (
          <article
            key={m.kind === "catalog" ? m.id : `gw-${m.id}`}
            className="card"
            style={{
              padding: 16,
              display: "grid",
              gap: 10,
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.12)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{m.displayName}</div>
                <div
                  className="muted"
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, marginTop: 4 }}
                >
                  {m.id}
                </div>
              </div>
              <span className={`pill ${availabilityPillClass(m.availability)}`}>{availabilityLabel(m.availability)}</span>
            </div>

            <div className="muted" style={{ fontSize: 13 }}>
              {m.category} · {m.provider}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {m.tags.map((t) => (
                <span key={t} className="pill" style={{ padding: "2px 8px" }}>
                  {t}
                </span>
              ))}
            </div>

            <dl style={{ margin: 0, display: "grid", gap: 6, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <dt className="muted">计费</dt>
                <dd style={{ margin: 0 }}>{billingLabel(m.billingType)}</dd>
              </div>
              {m.contextWindow > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <dt className="muted">上下文</dt>
                  <dd style={{ margin: 0 }}>{m.contextWindow.toLocaleString()} tokens</dd>
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <dt className="muted">价格示例</dt>
                <dd style={{ margin: 0, textAlign: "right", maxWidth: "62%" }}>{m.priceExample}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <dt className="muted">返还</dt>
                <dd style={{ margin: 0, textAlign: "right", maxWidth: "70%" }}>{m.refundPolicy}</dd>
              </div>
            </dl>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              <button className="btn btnPrimary" type="button" onClick={() => void copyId(m.id)} style={{ padding: "8px 12px" }}>
                复制模型 ID
              </button>
              {m.docsUrl ? (
                <a className="btn" href={m.docsUrl} target="_blank" rel="noreferrer" style={{ padding: "8px 12px" }}>
                  定价与说明
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
