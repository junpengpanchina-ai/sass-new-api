"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UiModel = {
  id: string;
  provider: string;
  label: string;
  contextWindow: number;
  input: "text" | "multimodal";
  enabled: boolean;
};

async function fetchModels(): Promise<UiModel[]> {
  const res = await fetch("/api/models", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const json = (await res.json()) as { data: UiModel[] };
  return json.data;
}

export default function PersonalSettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userEmail, setUserEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [supabaseReady, setSupabaseReady] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const [models, setModels] = useState<UiModel[] | null>(null);
  const [modelQuery, setModelQuery] = useState("");
  const [modelsMsg, setModelsMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) setSupabaseReady(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;
      setUserEmail(user.email ?? "");
      setUsername(String(user.user_metadata?.username ?? ""));
      setNewEmail(user.email ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchModels();
        if (!cancelled) setModels(data);
      } catch (e) {
        if (!cancelled) setModelsMsg(e instanceof Error ? e.message : "加载模型失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveUsername() {
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const { error } = await supabase.auth.updateUser({
        data: { username: username.trim() }
      });
      if (error) throw error;
      setProfileMsg("已保存");
    } catch (e) {
      setProfileMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingProfile(false);
    }
  }

  async function updateEmail() {
    setEmailMsg(null);
    setSavingEmail(true);
    try {
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setEmailMsg("已提交邮箱变更。请到新邮箱完成确认后生效。");
    } catch (e) {
      setEmailMsg(e instanceof Error ? e.message : "绑定邮箱失败");
    } finally {
      setSavingEmail(false);
    }
  }

  async function changePassword() {
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg("两次输入的新密码不一致");
      return;
    }
    setSavingPassword(true);
    try {
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const email = userEmail.trim();
      if (!email) throw new Error("当前会话未包含邮箱");

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });
      if (reauthError) throw reauthError;

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg("密码已更新");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordMsg(e instanceof Error ? e.message : "修改密码失败");
    } finally {
      setSavingPassword(false);
    }
  }

  const filteredModels = useMemo(() => {
    if (!models) return [];
    const q = modelQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
  }, [models, modelQuery]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setModelsMsg(`已复制：${text}`);
      window.setTimeout(() => setModelsMsg(null), 1200);
    } catch {
      setModelsMsg("复制失败（浏览器权限限制）");
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>个人设置</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            管理账号基本信息、安全设置与第三方账号绑定。
          </div>
        </div>
        <div className="pill">{userEmail || "Loading…"}</div>
      </div>

      {!supabaseReady ? (
        <section style={{ marginTop: 18 }}>
          <div className="pill bad" style={{ justifySelf: "start" }}>
            Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
          </div>
        </section>
      ) : null}

      <Section title="基本信息" desc="修改用户名、绑定邮箱、更改密码。">
        <Field label="用户名">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} placeholder="yourname" />
            <button className="btn btnPrimary" type="button" onClick={saveUsername} disabled={savingProfile}>
              {savingProfile ? "保存中…" : "保存"}
            </button>
            {profileMsg ? <span className="muted" style={{ alignSelf: "center", fontSize: 13 }}>{profileMsg}</span> : null}
          </div>
        </Field>

        <Field label="绑定邮箱">
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            说明：当前实现为 Supabase 的邮箱变更确认（通过邮件链接确认），暂未做“验证码输入框”版本。
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" />
            <button className="btn" type="button" onClick={updateEmail} disabled={savingEmail}>
              {savingEmail ? "提交中…" : "提交绑定"}
            </button>
            {emailMsg ? <span className="muted" style={{ alignSelf: "center", fontSize: 13 }}>{emailMsg}</span> : null}
          </div>
        </Field>

        <Field label="更改密码">
          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputStyle}
              type="password"
              placeholder="当前密码"
            />
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} type="password" placeholder="新密码" />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              type="password"
              placeholder="确认新密码"
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn" type="button" onClick={changePassword} disabled={savingPassword}>
                {savingPassword ? "修改中…" : "修改密码"}
              </button>
              {passwordMsg ? <span className="muted" style={{ fontSize: 13 }}>{passwordMsg}</span> : null}
            </div>
          </div>
        </Field>
      </Section>

      <Section title="双因素认证（2FA）" desc="暂未接入（后续可接 Supabase MFA / TOTP）。">
        <div className="pill bad" style={{ justifySelf: "start" }}>
          Coming soon
        </div>
      </Section>

      <Section title="Passkey 无密码登录" desc="暂未接入（后续可接 Supabase WebAuthn）。">
        <div className="pill bad" style={{ justifySelf: "start" }}>
          Coming soon
        </div>
      </Section>

      <Section title="第三方账号绑定" desc="如已启用 OAuth Provider，可在登录页完成绑定/登录。">
        <div className="muted" style={{ fontSize: 13 }}>
          当前版本：请在 <a className="btn" style={{ padding: "6px 10px" }} href="/login">/login</a> 使用 GitHub/Discord 等完成授权。
        </div>
      </Section>

      <Section title="邀请返利" desc="复制邀请码，邀请他人注册并消费后可获得返利配额。">
        <div className="muted" style={{ fontSize: 13 }}>
          当前实现入口在 <a className="btn" style={{ padding: "6px 10px" }} href="/console/topup">/console/topup</a>（支持复制邀请码与返利转入余额）。
        </div>
      </Section>

      <Section title="可用模型查看" desc="点击模型名称即可复制；支持搜索筛选。">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} style={inputStyle} placeholder="搜索模型…" />
          {modelsMsg ? <span className="muted" style={{ fontSize: 13 }}>{modelsMsg}</span> : null}
        </div>

        <div style={{ marginTop: 12, overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 220 }}>Model ID</th>
                <th style={{ width: 120 }}>Provider</th>
                <th>Label</th>
                <th style={{ width: 120 }}>Copy</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{m.id}</td>
                  <td>{m.provider}</td>
                  <td>{m.label}</td>
                  <td>
                    <button className="btn" type="button" onClick={() => copy(m.id)} style={{ padding: "6px 10px" }}>
                      复制
                    </button>
                  </td>
                </tr>
              ))}
              {!models ? (
                <tr>
                  <td colSpan={4} className="muted" style={{ padding: 14 }}>
                    加载中…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="通知设置 / 价格设置 / IP 记录设置 / 安全设置" desc="这一组涉及后端存储与网关策略，后续统一落到配置表。">
        <div className="pill bad" style={{ justifySelf: "start" }}>
          Coming soon
        </div>
      </Section>
    </main>
  );
}

function Section(props: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800 }}>{props.title}</div>
          {props.desc ? (
            <div className="muted" style={{ fontSize: 13 }}>
              {props.desc}
            </div>
          ) : null}
        </div>
      </div>
      {props.children}
    </section>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
      <div className="muted" style={{ fontSize: 13 }}>
        {props.label}
      </div>
      {props.children}
    </div>
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

