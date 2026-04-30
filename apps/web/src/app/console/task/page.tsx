"use client";

import { useEffect, useMemo, useState } from "react";

import { addBalance, loadWallet, type WalletState } from "@/lib/wallet";
import { advanceTask, loadTasks, saveTasks, seedDemoTasks, type AsyncTask, type TaskStatus, type TaskType } from "@/lib/tasks";

export default function TaskPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [tasks, setTasks] = useState<AsyncTask[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "ALL">("ALL");
  const [type, setType] = useState<TaskType | "ALL">("ALL");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setWallet(loadWallet());
    setTasks(loadTasks());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveTasks(tasks);
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (status !== "ALL" && t.status !== status) return false;
      if (type !== "ALL" && t.type !== type) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.prompt.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
      );
    });
  }, [tasks, query, status, type]);

  function toast(text: string) {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 1400);
  }

  function seed() {
    setTasks(seedDemoTasks());
    toast("已生成演示任务");
  }

  function advance(id: string) {
    const prev = tasks.find((t) => t.id === id);
    if (!prev) return;
    const next = advanceTask(prev);
    setTasks((arr) => arr.map((t) => (t.id === id ? next : t)));

    if (prev.status === "IN_PROGRESS" && next.status === "FAILURE" && next.refundQuota && wallet) {
      const w = addBalance(wallet, next.refundQuota);
      setWallet(w);
      toast(`任务失败，已退还配额 +${next.refundQuota}（模拟）`);
      return;
    }
    toast(`任务状态：${prev.status} → ${next.status}`);
  }

  function advanceAll() {
    let refunded = 0;
    const nextTasks = tasks.map((t) => {
      const before = t.status;
      const next = advanceTask(t);
      if (before === "IN_PROGRESS" && next.status === "FAILURE" && next.refundQuota) refunded += next.refundQuota;
      return next;
    });
    setTasks(nextTasks);
    if (refunded && wallet) {
      setWallet(addBalance(wallet, refunded));
      toast(`推进完成：失败退还配额 +${refunded}（模拟）`);
    } else {
      toast("已推进任务状态（模拟）");
    }
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>任务管理</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            管理 Midjourney 绘图、Suno 音乐生成等异步任务的状态与结果（演示版）。
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索任务…" style={inputStyle} />
          <select className="btn" value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ justifyContent: "flex-start" }}>
            <option value="ALL">全部状态</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
          <select className="btn" value={type} onChange={(e) => setType(e.target.value as any)} style={{ justifyContent: "flex-start" }}>
            <option value="ALL">全部类型</option>
            <option value="MIDJOURNEY_IMAGE">MIDJOURNEY</option>
            <option value="SUNO_MUSIC">SUNO</option>
            <option value="OTHER">OTHER</option>
          </select>
          <button className="btn" type="button" onClick={seed}>
            生成演示任务
          </button>
          <button className="btn btnPrimary" type="button" onClick={advanceAll}>
            推进全部
          </button>
        </div>
      </div>

      {msg ? (
        <div className="pill good" style={{ marginTop: 12, justifySelf: "start" }}>
          {msg}
        </div>
      ) : null}

      <div style={{ marginTop: 14, overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>任务 ID</th>
              <th style={{ width: 160 }}>类型</th>
              <th style={{ width: 140 }}>状态</th>
              <th>内容</th>
              <th style={{ width: 180 }}>提交时间</th>
              <th style={{ width: 180 }}>完成时间</th>
              <th style={{ width: 140 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{t.id}</td>
                <td>{typeLabel(t.type)}</td>
                <td>
                  <span className={`pill ${pillByStatus(t.status)}`}>{t.status}</span>
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {t.prompt}
                  {t.status === "SUCCESS" && t.resultUrl ? (
                    <div style={{ marginTop: 6 }}>
                      <a className="btn" href={t.resultUrl} target="_blank" rel="noreferrer" style={{ padding: "6px 10px" }}>
                        查看结果
                      </a>
                    </div>
                  ) : null}
                  {t.status === "FAILURE" ? (
                    <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                      {t.error || "FAILED"}
                      {t.refundQuota ? ` · 已退还配额 ${t.refundQuota}` : ""}
                    </div>
                  ) : null}
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {new Date(t.submittedAt).toLocaleString()}
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {t.completedAt ? new Date(t.completedAt).toLocaleString() : "—"}
                </td>
                <td>
                  <button className="btn" type="button" onClick={() => advance(t.id)} style={{ padding: "6px 10px" }}>
                    推进
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted" style={{ padding: 14 }}>
                  暂无任务。可点击「生成演示任务」查看效果。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 14, padding: 14, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>任务状态说明</div>
        <div style={{ overflow: "hidden", borderRadius: 14, border: "1px solid var(--border)" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>状态</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>PENDING</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  任务已提交，等待处理
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>IN_PROGRESS</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  任务正在生成中
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>SUCCESS</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  任务已完成，可查看结果
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>FAILURE</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  任务生成失败，已自动退还配额（演示版在推进状态时模拟）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          当前钱包余额：<b>{wallet ? wallet.balance.toLocaleString() : "—"}</b>（失败任务会模拟退还到主余额）
        </div>
      </div>
    </main>
  );
}

function typeLabel(t: TaskType) {
  if (t === "MIDJOURNEY_IMAGE") return "Midjourney 绘图";
  if (t === "SUNO_MUSIC") return "Suno 音乐";
  return "其他";
}

function pillByStatus(s: TaskStatus) {
  if (s === "SUCCESS") return "good";
  if (s === "FAILURE") return "bad";
  return "";
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 240,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none"
};

