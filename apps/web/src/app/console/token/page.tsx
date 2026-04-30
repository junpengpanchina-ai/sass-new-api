"use client";

import { useEffect, useMemo, useState } from "react";

type TokenRecord = {
  id: string;
  name: string;
  createdAt: string;
  status: "active" | "revoked";
  expiresAt: string | null; // ISO
  quotaRemaining: number | null; // null => unlimited (or unknown)
  quotaUnlimited: boolean;
  models: string[]; // empty => no limit
  ipWhitelist: string[]; // empty => no limit
  group: string;
};

type CreateTokenInput = {
  name: string;
  expiresAt: string; // empty => never
  quotaRemaining: string; // empty => unlimited (unless quotaUnlimited=false? keep simple)
  quotaUnlimited: boolean;
  models: string; // comma separated
  ipWhitelist: string; // comma separated
  group: string;
};

const STORAGE_KEY = "token-saas.console.tokens.v1";

function loadTokens(): TokenRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as TokenRecord[];
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function saveTokens(tokens: TokenRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function createTokenKey() {
  // Display-only token key, persisted nowhere. Real implementation should store hash server-side.
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `ts_${body}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseCsv(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function TokenManagementPage() {
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [editing, setEditing] = useState<TokenRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState<TokenRecord | null>(null);

  useEffect(() => {
    setTokens(loadTokens());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveTokens(tokens);
  }, [tokens]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [tokens, query]);

  function onCreate(input: CreateTokenInput) {
    const key = createTokenKey();
    const id = `tok_${crypto.randomUUID()}`;
    const expiresAt = input.expiresAt.trim() ? new Date(input.expiresAt).toISOString() : null;
    const quotaUnlimited = Boolean(input.quotaUnlimited);
    const quotaRemaining = quotaUnlimited ? null : input.quotaRemaining.trim() ? Number(input.quotaRemaining) : null;

    const token: TokenRecord = {
      id,
      name: input.name.trim(),
      createdAt: nowIso(),
      status: "active",
      expiresAt,
      quotaRemaining: Number.isFinite(quotaRemaining as number) ? (quotaRemaining as number) : null,
      quotaUnlimited,
      models: parseCsv(input.models),
      ipWhitelist: parseCsv(input.ipWhitelist),
      group: input.group.trim()
    };

    setTokens((prev) => [token, ...prev]);
    setShowCreate(false);
    setCreatedKey(key);
  }

  function onUpdate(next: TokenRecord) {
    setTokens((prev) => prev.map((t) => (t.id === next.id ? next : t)));
    setEditing(null);
  }

  function onDelete(id: string) {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
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
          <button className="btn btnPrimary" type="button" onClick={() => setShowCreate(true)}>
            创建令牌
          </button>
        </div>
      </div>

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
              <th style={{ width: 160 }}>剩余配额</th>
              <th style={{ width: 200 }}>过期时间</th>
              <th>限制</th>
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
                <td>{t.quotaUnlimited ? <span className="pill good">∞</span> : t.quotaRemaining ?? <span className="muted">—</span>}</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {t.expiresAt ? new Date(t.expiresAt).toLocaleString() : "永不过期"}
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {formatLimits(t)}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" type="button" onClick={() => setImporting(t)} style={{ padding: "6px 10px" }}>
                      导入/配置
                    </button>
                    <button className="btn" type="button" onClick={() => setEditing(t)} style={{ padding: "6px 10px" }}>
                      编辑
                    </button>
                    <button className="btn" type="button" onClick={() => setDeletingId(t.id)} style={{ padding: "6px 10px" }}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 14 }}>
                  暂无令牌。点击右上角「创建令牌」开始。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showCreate ? <TokenModal title="创建令牌" onClose={() => setShowCreate(false)} onSubmit={onCreate} /> : null}
      {editing ? (
        <EditModal
          token={editing}
          onClose={() => setEditing(null)}
          onSubmit={(next) => onUpdate(next)}
        />
      ) : null}
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

function formatLimits(t: TokenRecord) {
  const parts: string[] = [];
  if (t.models.length) parts.push(`模型: ${t.models.slice(0, 3).join(", ")}${t.models.length > 3 ? "…" : ""}`);
  if (t.ipWhitelist.length) parts.push(`IP: ${t.ipWhitelist.slice(0, 3).join(", ")}${t.ipWhitelist.length > 3 ? "…" : ""}`);
  if (t.group) parts.push(`分组: ${t.group}`);
  return parts.length ? parts.join(" · ") : "不限制";
}

function TokenModal(props: { title: string; onClose: () => void; onSubmit: (input: CreateTokenInput) => void }) {
  const [form, setForm] = useState<CreateTokenInput>({
    name: "",
    expiresAt: "",
    quotaRemaining: "",
    quotaUnlimited: true,
    models: "",
    ipWhitelist: "",
    group: ""
  });

  const canSubmit = form.name.trim().length > 0;

  return (
    <ModalFrame title={props.title} onClose={props.onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="令牌名称">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="如：生产环境 / 测试用" />
        </Field>

        <Field label="过期时间（可选）">
          <input
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            style={inputStyle}
            placeholder="YYYY-MM-DDTHH:mm"
          />
          <div className="muted" style={{ fontSize: 12 }}>
            留空表示永不过期。
          </div>
        </Field>

        <Field label="剩余配额 / 无限配额">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label className="btn" style={{ justifyContent: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                checked={form.quotaUnlimited}
                onChange={(e) => setForm({ ...form, quotaUnlimited: e.target.checked })}
              />
              无限配额
            </label>
            <input
              value={form.quotaRemaining}
              onChange={(e) => setForm({ ...form, quotaRemaining: e.target.value })}
              style={{ ...inputStyle, maxWidth: 220, opacity: form.quotaUnlimited ? 0.6 : 1 }}
              placeholder="如：100000"
              disabled={form.quotaUnlimited}
              inputMode="numeric"
            />
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            注意：无限配额仍受账户总配额约束（后续接入）。
          </div>
        </Field>

        <Field label="模型限制（可选）">
          <input value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} style={inputStyle} placeholder="用逗号分隔，如 gpt-4.1, gpt-4o-mini" />
        </Field>

        <Field label="IP 白名单（可选）">
          <input value={form.ipWhitelist} onChange={(e) => setForm({ ...form, ipWhitelist: e.target.value })} style={inputStyle} placeholder="用逗号分隔，如 1.2.3.4, 5.6.7.8" />
        </Field>

        <Field label="分组（可选）">
          <input value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} style={inputStyle} placeholder="如：prod / staging" />
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

function EditModal(props: { token: TokenRecord; onClose: () => void; onSubmit: (token: TokenRecord) => void }) {
  const [t, setT] = useState<TokenRecord>(props.token);

  return (
    <ModalFrame title="编辑令牌" onClose={props.onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          注意：编辑不包含令牌 Key 本身（Key 仅创建时完整显示一次）。
        </div>

        <Field label="名称">
          <input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} style={inputStyle} />
        </Field>

        <Field label="状态">
          <select
            className="btn"
            value={t.status}
            onChange={(e) => setT({ ...t, status: e.target.value as TokenRecord["status"] })}
            style={{ justifyContent: "flex-start" }}
          >
            <option value="active">active</option>
            <option value="revoked">revoked</option>
          </select>
        </Field>

        <Field label="过期时间">
          <input
            value={t.expiresAt ? new Date(t.expiresAt).toISOString().slice(0, 16) : ""}
            onChange={(e) => setT({ ...t, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            style={inputStyle}
            placeholder="YYYY-MM-DDTHH:mm"
          />
        </Field>

        <Field label="剩余配额 / 无限配额">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label className="btn" style={{ justifyContent: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                checked={t.quotaUnlimited}
                onChange={(e) => setT({ ...t, quotaUnlimited: e.target.checked, quotaRemaining: e.target.checked ? null : t.quotaRemaining })}
              />
              无限配额
            </label>
            <input
              value={t.quotaRemaining ?? ""}
              onChange={(e) => setT({ ...t, quotaRemaining: e.target.value ? Number(e.target.value) : null })}
              style={{ ...inputStyle, maxWidth: 220, opacity: t.quotaUnlimited ? 0.6 : 1 }}
              placeholder="如：100000"
              disabled={t.quotaUnlimited}
              inputMode="numeric"
            />
          </div>
        </Field>

        <Field label="模型限制">
          <input value={t.models.join(", ")} onChange={(e) => setT({ ...t, models: parseCsv(e.target.value) })} style={inputStyle} placeholder="逗号分隔" />
        </Field>

        <Field label="IP 白名单">
          <input value={t.ipWhitelist.join(", ")} onChange={(e) => setT({ ...t, ipWhitelist: parseCsv(e.target.value) })} style={inputStyle} placeholder="逗号分隔" />
        </Field>

        <Field label="分组">
          <input value={t.group} onChange={(e) => setT({ ...t, group: e.target.value })} style={inputStyle} />
        </Field>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
          <button className="btn" type="button" onClick={props.onClose}>
            取消
          </button>
          <button className="btn btnPrimary" type="button" onClick={() => props.onSubmit(t)} disabled={!t.name.trim()}>
            保存
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ImportModal(props: { token: TokenRecord; onClose: () => void }) {
  const [baseUrl, setBaseUrl] = useState("https://your-platform.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [app, setApp] = useState<
    "ai-as-workspace" | "ama" | "opencat" | "chatgpt-next-web" | "lobe" | "other"
  >("ai-as-workspace");

  useEffect(() => {
    setBaseUrl(`${window.location.origin}/v1`);
  }, []);

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

