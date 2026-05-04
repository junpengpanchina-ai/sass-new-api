"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

type UiModel = {
  id: string;
  provider: string;
  label: string;
  contextWindow: number;
  input: "text" | "multimodal";
  enabled: boolean;
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function getModels() {
  const res = await fetch("/api/models", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  return (await res.json()) as { data: UiModel[]; updatedAt: string };
}

export default function PlaygroundPage() {
  const [baseUrl, setBaseUrl] = useState(OPENAI_BASE_URL);
  const [apiKey, setApiKey] = useState("");

  const [models, setModels] = useState<UiModel[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: "你是一个有帮助的助手。" }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingModels(true);
      try {
        const { data } = await getModels();
        if (cancelled) return;
        setModels(data.filter((m) => m.enabled));
        setModelId((prev) => prev || data.find((m) => m.enabled)?.id || "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载模型失败");
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const enabledModels = useMemo(() => models, [models]);

  async function send() {
    if (!input.trim() || !modelId) return;
    setError(null);
    setSending(true);
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/playground/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          model: modelId,
          messages: [...messages.filter((m) => m.role !== "system"), userMsg]
        })
      });

      const json = (await res.json()) as { ok: boolean; content?: string; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `请求失败: ${res.status}`);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: json.content || "" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "发送失败";
      setError(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `请求失败：${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>操练场</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            在线测试工具：无需写代码即可对话，适合快速验证令牌与模型配置。
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, marginTop: 14 }}>
        <aside className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>配置</div>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                API Base URL
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={{ ...inputStyle, maxWidth: "none" }} />
                <button
                  className="btn"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(baseUrl);
                  }}
                  style={{ padding: "8px 10px" }}
                >
                  复制
                </button>
              </div>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                API Key（令牌）
              </div>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ ...inputStyle, maxWidth: "none" }}
                placeholder="sk- / ts_..."
              />
              <div className="muted" style={{ fontSize: 12 }}>
                可在「令牌」页创建并复制（注意：Key 仅显示一次）。
              </div>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                模型
              </div>
              <select
                className="btn"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                style={{ justifyContent: "flex-start" }}
                disabled={loadingModels}
              >
                {enabledModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} ({m.provider})
                  </option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 12 }}>
                {loadingModels ? "加载模型中…" : enabledModels.length ? "从 /api/models 读取" : "暂无可用模型"}
              </div>
            </label>

            {error ? (
              <div className="pill bad" style={{ justifySelf: "start" }}>
                {error}
              </div>
            ) : null}

            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              操练场经 `/api/playground/chat` 转发至 OpenAI 兼容网关（默认 {OPENAI_BASE_URL}）。
            </div>
          </div>
        </aside>

        <section className="card" style={{ padding: 14, background: "rgba(255,255,255,0.03)" }}>
          <div
            ref={listRef}
            style={{
              height: "min(62dvh, 560px)",
              overflow: "auto",
              padding: 6,
              display: "grid",
              gap: 10
            }}
          >
            {messages
              .filter((m) => m.role !== "system")
              .map((m, idx) => (
                <div key={idx} style={{ display: "grid", justifyContent: m.role === "user" ? "end" : "start" }}>
                  <div
                    className="card"
                    style={{
                      padding: "10px 12px",
                      maxWidth: "78ch",
                      background: m.role === "user" ? "rgba(124,92,255,0.14)" : "rgba(255,255,255,0.05)",
                      borderColor: "rgba(255,255,255,0.10)"
                    }}
                  >
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      {m.role === "user" ? "你" : "模型"}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  </div>
                </div>
              ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息…"
              rows={3}
              style={{ ...inputStyle, maxWidth: "none", flex: 1, resize: "vertical" }}
            />
            <button className="btn btnPrimary" type="button" onClick={send} disabled={sending || !input.trim() || !modelId}>
              {sending ? "发送中…" : "发送"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none"
};

