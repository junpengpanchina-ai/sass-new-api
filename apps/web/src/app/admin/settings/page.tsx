"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type SettingsResponse = { ok: true; data: { settings: Record<string, any> } };
type UpdateResponse = { ok: true; data: { key: string; value: any; updated_at: string } };

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none",
};

export default function AdminSettingsPage() {
  const [docsUrl, setDocsUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const json = await adminFetch<SettingsResponse>("/api/admin/settings");
      const general = json.data.settings?.general || {};
      setDocsUrl(String(general.docs_url || ""));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await adminFetch<UpdateResponse>("/api/admin/settings", {
        method: "PATCH",
        body: { docs_url: docsUrl.trim() || null },
      });
      setMsg("已保存");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Settings</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            运营后台配置（V1 先做文档链接）。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" type="button" onClick={load} disabled={loading || saving}>
            {loading ? "刷新中…" : "刷新"}
          </button>
          <button className="btn btnPrimary" type="button" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      <section style={{ marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>文档链接（docs_url）</div>
        <input
          value={docsUrl}
          onChange={(e) => setDocsUrl(e.target.value)}
          style={inputStyle}
          placeholder="https://docs.example.com"
        />
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          保存后，你可以在后台侧边栏点击“Docs”直接打开该链接（下一步我会把入口加上）。
        </div>
        {msg ? <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>{msg}</div> : null}
      </section>
    </main>
  );
}

