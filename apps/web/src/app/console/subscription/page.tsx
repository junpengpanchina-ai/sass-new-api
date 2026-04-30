"use client";

import { useEffect, useMemo, useState } from "react";

import { addBalance, loadWallet, type WalletState } from "@/lib/wallet";
import {
  createSubscription,
  isActive,
  loadSubscription,
  PLANS,
  saveSubscription,
  toggleAutoRenew,
  type SubscriptionPlan,
  type SubscriptionState
} from "@/lib/subscription";

export default function SubscriptionPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [sub, setSub] = useState<SubscriptionState | null>(null);

  const [buying, setBuying] = useState<SubscriptionPlan | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setWallet(loadWallet());
    setSub(loadSubscription());
  }, []);

  const active = useMemo(() => (sub ? isActive(sub) : false), [sub]);

  function toast(text: string) {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 1400);
  }

  function cancelSubscription() {
    saveSubscription(null);
    setSub(null);
    toast("已清除订阅（本地）");
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>订阅计划</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            订阅是按周期购买的套餐。购买后在有效期内享受套餐内的配额或特权（演示版）。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/console/topup">
            去钱包管理
          </a>
          <button className="btn" type="button" onClick={cancelSubscription}>
            清除订阅（本地）
          </button>
        </div>
      </div>

      {msg ? (
        <div className="pill good" style={{ marginTop: 12, justifySelf: "start" }}>
          {msg}
        </div>
      ) : null}

      <section className="card" style={{ marginTop: 14, padding: 14, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>当前订阅状态</div>
        {sub && active ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="pill good">Active</span>
              <b>{sub.planName}</b>
              <span className="muted" style={{ fontSize: 13 }}>
                截止：{new Date(sub.expiresAt).toLocaleString()}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              套餐内剩余配额：<b>{sub.quotaRemaining.toLocaleString()}</b>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label className="btn" style={{ justifyContent: "flex-start", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={sub.autoRenew}
                  onChange={(e) => {
                    const next = toggleAutoRenew(sub, e.target.checked);
                    setSub(next);
                    toast(e.target.checked ? "已开启自动续费（演示）" : "已关闭自动续费（演示）");
                  }}
                />
                自动续费
              </label>
              <span className="muted" style={{ fontSize: 12 }}>
                演示版仅保存开关，真实续费将接入支付与账单。
              </span>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>
            当前没有有效订阅。可在下方选择套餐购买。
          </div>
        )}
      </section>

      <section style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>可购买套餐</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              支持日 / 周 / 月周期套餐（演示版）。
            </div>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            当前余额：<b>{wallet ? wallet.balance.toLocaleString() : "—"}</b>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
          {PLANS.map((p) => (
            <div key={p.id} className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 900 }}>{p.name}</div>
                <div className="pill">{periodLabel(p.period)}</div>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                价格：<b>{p.price}</b>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                包含配额：<b>{p.quotaIncluded.toLocaleString()}</b>
              </div>
              {p.perks?.length ? (
                <ul className="muted" style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
                  {p.perks.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : null}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn btnPrimary" type="button" onClick={() => setBuying(p)}>
                  购买
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {buying ? (
        <BuyModal
          plan={buying}
          onClose={() => setBuying(null)}
          onPaid={() => {
            // Demo: set subscription and also add quotaIncluded to main balance as a convenience.
            const nextSub = createSubscription(buying);
            saveSubscription(nextSub);
            setSub(nextSub);
            if (wallet) {
              const nextWallet = addBalance(wallet, buying.quotaIncluded);
              setWallet(nextWallet);
            }
            setBuying(null);
            toast("购买成功（模拟）：订阅已生效，配额已入账");
          }}
        />
      ) : null}
    </main>
  );
}

function BuyModal(props: { plan: SubscriptionPlan; onClose: () => void; onPaid: () => void }) {
  return (
    <ModalFrame title="订阅详情" onClose={props.onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            套餐
          </div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{props.plan.name}</div>
        </div>
        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.04)" }}>
          <div className="muted" style={{ fontSize: 13, display: "grid", gap: 6 }}>
            <div>
              周期：<b>{periodLabel(props.plan.period)}</b>
            </div>
            <div>
              价格：<b>{props.plan.price}</b>
            </div>
            <div>
              包含配额：<b>{props.plan.quotaIncluded.toLocaleString()}</b>
            </div>
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          演示版：点击「确认购买」将直接模拟支付成功并开通订阅。
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={props.onClose}>
            取消
          </button>
          <button className="btn btnPrimary" type="button" onClick={props.onPaid}>
            确认购买（模拟）
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

function periodLabel(p: SubscriptionPlan["period"]) {
  if (p === "day") return "日";
  if (p === "week") return "周";
  return "月";
}

