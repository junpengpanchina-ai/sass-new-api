"use client";

import { useEffect, useMemo, useState } from "react";

import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

import { consoleFetch } from "../_lib/consoleFetch";

type ApiToken = {
  id: string;
  name: string;
  status: "active" | "disabled" | "deleted";
  allowed_models: unknown | null;
  created_at?: string;
  last_used_at?: string | null;
};

type CreateTokenInput = {
  name: string;
  allowedModels: string; // comma separated
};

function parseCsv(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function TokenManagementPage() {
  const [tokens, setTokens] = useState<ApiToken[] | null>(null);
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState<ApiToken | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await consoleFetch<{ ok: true; data: ApiToken[] }>("/api/tokens");
        if (!cancelled) setTokens(json.data);
      } catch (e) {
        if (!cancelled) {
          setTokens([]);
          setMsg(e instanceof Error ? e.message : "加载 API Key 失败");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!tokens) return [];
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [tokens, query]);

  async function refreshTokens() {
    const json = await consoleFetch<{ ok: true; data: ApiToken[] }>("/api/tokens");
    setTokens(json.data);
  }

  async function onCreate(input: CreateTokenInput) {
    setMsg(null);
    setLoading(true);
    try {
      const allowed_models = parseCsv(input.allowedModels);
      const payload = { name: input.name.trim(), allowed_models: allowed_models.length ? allowed_models : null };
      const json = await consoleFetch<{ ok: true; data: ApiToken & { plain_token: string } }>("/api/tokens", {
        method: "POST",
        body: payload,
      });
      setCreatedKey(json.data.plain_token);
      await refreshTokens();
      setShowCreate(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function onToggleStatus(t: ApiToken) {
    setMsg(null);
    setLoading(true);
    try {
      const next = t.status === "active" ? "disabled" : "active";
      await consoleFetch<{ ok: true; data: ApiToken }>(`/api/tokens/${encodeURIComponent(t.id)}`, {
        method: "PATCH",
        body: { status: next },
      });
      await refreshTokens();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setMsg(null);
    setLoading(true);
    try {
      await consoleFetch<{ ok: true; data: ApiToken }>(`/api/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshTokens();
      setDeletingId(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>令牌管理</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            令牌是调用 API 的凭证。每个令牌可独立配置权限范围和配额上限。
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索令牌…" style={inputStyle} />
          <button className="btn btnPrimary" type="button" onClick={() => setShowCreate(true)} disabled={loading}>
            创建令牌
          </button>
        </div>
      </div>

      {msg ? (
        <div className="pill bad" style={{ justifySelf: "start", marginTop: 12 }}>
          {msg}
        </div>
      ) : null}

      {createdKey ? (
        <div className="card" style={{ marginTop: 14, padding: 14, background: "rgba(255,92,119,0.08)", borderColor: "rgba(255,92,119,0.35)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>令牌创建成功：请立即复制保存完整 Key（仅显示一次）</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <code style={codeStyle}>{createdKey}</code>
            <button
              className="btn"
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(createdKey);
              }}
            >
              复制
            </button>
            <button className="btn" type="button" onClick={() => setCreatedKey(null)}>
              我已保存
            </button>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            警告：令牌 Key 具有完整的 API 调用权限，请勿泄露给他人，不要提交到代码仓库。
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14, overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>名称</th>
              <th style={{ width: 120 }}>状态</th>
              <th>模型限制</th>
              <th style={{ width: 180 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {t.id}
                  </div>
                </td>
                <td>
                  <span className={`pill ${t.status === "active" ? "good" : "bad"}`}>{t.status}</span>
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {Array.isArray(t.allowed_models) && t.allowed_models.length ? String(t.allowed_models.join(", ")) : "不限制"}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" type="button" onClick={() => setImporting(t)} style={{ padding: "6px 10px" }} disabled={loading}>
                      导入/配置
                    </button>
                    <button className="btn" type="button" onClick={() => onToggleStatus(t)} style={{ padding: "6px 10px" }} disabled={loading}>
                      {t.status === "active" ? "禁用" : "启用"}
                    </button>
                    <button className="btn" type="button" onClick={() => setDeletingId(t.id)} style={{ padding: "6px 10px" }} disabled={loading}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tokens === null ? (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 14 }}>
                  加载中…
                </td>
              </tr>
            ) : null}
            {tokens !== null && filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 14 }}>
                  暂无令牌。点击右上角「创建令牌」开始。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showCreate ? <TokenModal title="创建令牌" onClose={() => setShowCreate(false)} onSubmit={onCreate} /> : null}
      {importing ? <ImportModal token={importing} onClose={() => setImporting(null)} /> : null}
      {deletingId ? (
        <ConfirmModal
          title="删除令牌"
          desc="确认后该令牌立即失效，无法恢复。"
          confirmText="确认删除"
          onClose={() => setDeletingId(null)}
          onConfirm={() => onDelete(deletingId)}
        />
      ) : null}
    </main>
  );
}

function TokenModal(props: { title: string; onClose: () => void; onSubmit: (input: CreateTokenInput) => void }) {
  const [form, setForm] = useState<CreateTokenInput>({
    name: "",
    allowedModels: "",
  });

  const canSubmit = form.name.trim().length > 0;

  return (
    <ModalFrame title={props.title} onClose={props.onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="令牌名称">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="如：生产环境 / 测试用" />
        </Field>

        <Field label="模型限制（可选）">
          <input
            value={form.allowedModels}
            onChange={(e) => setForm({ ...form, allowedModels: e.target.value })}
            style={inputStyle}
            placeholder="用逗号分隔，如 gpt-4.1, gpt-4o-mini"
          />
          <div className="muted" style={{ fontSize: 12 }}>
            留空表示不限制。更复杂的权限（IP 白名单、配额、分组）后续落到 token 元数据与网关策略。
          </div>
        </Field>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
          <button className="btn" type="button" onClick={props.onClose}>
            取消
          </button>
          <button className="btn btnPrimary" type="button" disabled={!canSubmit} onClick={() => props.onSubmit(form)}>
            提交
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ImportModal(props: { token: ApiToken; onClose: () => void }) {
  const [baseUrl, setBaseUrl] = useState(OPENAI_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [app, setApp] = useState<
    "ai-as-workspace" | "ama" | "opencat" | "chatgpt-next-web" | "lobe" | "other"
  >("ai-as-workspace");

  async function copyAll() {
    const text = `API Base URL: ${baseUrl}\nAPI Key: ${apiKey || "(请粘贴令牌 Key)"}\nToken: ${props.token.name} (${props.token.id})`;
    await navigator.clipboard.writeText(text);
    setMsg("已复制配置到剪贴板");
    window.setTimeout(() => setMsg(null), 1200);
  }

  return (
    <ModalFrame title="聊天应用集成" onClose={props.onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          当前令牌：<b>{props.token.name}</b> <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>({props.token.id})</span>
        </div>

        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="目标聊天应用">
              <select className="btn" value={app} onChange={(e) => setApp(e.target.value as typeof app)} style={{ justifyContent: "flex-start" }}>
                <option value="ai-as-workspace">AI as Workspace（支持一键导入：占位）</option>
                <option value="ama">AMA 问天（支持一键导入：占位）</option>
                <option value="opencat">OpenCat（支持一键导入：占位）</option>
                <option value="chatgpt-next-web">ChatGPT Next Web（暂停部署）</option>
                <option value="lobe">Lobe Chat（需手动填写）</option>
                <option value="other">其他应用（OpenAI 兼容）</option>
              </select>
            </Field>

            {app === "chatgpt-next-web" ? (
              <div className="pill bad" style={{ justifySelf: "start" }}>
                ChatGPT Next Web 目前暂停部署
              </div>
            ) : null}

            {app === "lobe" ? (
              <div className="pill bad" style={{ justifySelf: "start" }}>
                Lobe Chat 当前不支持一键导入，需要手动填写
              </div>
            ) : null}
          </div>
        </div>

        <Field label="API Base URL">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={{ ...inputStyle, maxWidth: "none", flex: 1 }} />
            <button className="btn" type="button" onClick={async () => navigator.clipboard.writeText(baseUrl)} style={{ padding: "8px 10px" }}>
              复制
            </button>
          </div>
        </Field>

        <Field label="API Key（令牌 Key）">
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            说明：出于安全考虑，令牌 Key 不会被保存到浏览器存储；如需导入到聊天应用，请在此粘贴一次。
          </div>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ ...inputStyle, maxWidth: "none" }} placeholder="ts_... / sk-..." />
        </Field>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={copyAll}>
            复制配置
          </button>
          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => {
              // Placeholder: real deep-links will be added when app schemas are confirmed.
              setMsg("已准备好配置：请在目标应用粘贴 Base URL + API Key（后续将接入真实一键导入链接）");
              window.setTimeout(() => setMsg(null), 1600);
            }}
            disabled={app === "chatgpt-next-web"}
          >
            一键导入（占位）
          </button>
        </div>

        {msg ? (
          <div className="pill good" style={{ justifySelf: "start" }}>
            {msg}
          </div>
        ) : null}

        <div className="muted" style={{ fontSize: 12 }}>
          通用说明：大多数支持 OpenAI API 的应用都可以通过填写自定义 API 地址的方式接入（Base URL + API Key）。
        </div>
      </div>
    </ModalFrame>
  );
}

function ConfirmModal(props: {
  title: string;
  desc: string;
  confirmText: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalFrame title={props.title} onClose={props.onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="muted">{props.desc}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={props.onClose}>
            取消
          </button>
          <button className="btn btnPrimary" type="button" onClick={props.onConfirm}>
            {props.confirmText}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ModalFrame(props: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        zIndex: 50
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="card" style={{ width: "min(720px, 100%)", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>{props.title}</div>
          <button className="btn" type="button" onClick={props.onClose} style={{ padding: "6px 10px" }}>
            关闭
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{props.children}</div>
      </div>
    </div>
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
  maxWidth: 340,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none"
};

const codeStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  overflowX: "auto",
  maxWidth: "100%"
};

