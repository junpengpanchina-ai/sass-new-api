"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addBalance,
  addRebate,
  loadWallet,
  redeemCode,
  transferRebateToBalance,
  type WalletState
} from "@/lib/wallet";

type PaymentProvider = "epay" | "stripe" | "creem" | "waffo";

export default function TopupPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [custom, setCustom] = useState<string>("");
  const [provider, setProvider] = useState<PaymentProvider>("stripe");

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const [transferAmount, setTransferAmount] = useState<string>("");

  useEffect(() => {
    setWallet(loadWallet());
  }, []);

  const selectedAmount = useMemo(() => {
    const c = custom.trim();
    if (c) {
      const n = Number(c);
      return Number.isFinite(n) && n > 0 ? n : amount;
    }
    return amount;
  }, [amount, custom]);

  function toast(text: string) {
    setWarn(null);
    setMsg(text);
    window.setTimeout(() => setMsg(null), 1400);
  }
  function toastWarn(text: string) {
    setMsg(null);
    setWarn(text);
    window.setTimeout(() => setWarn(null), 1800);
  }

  function simulatePaid() {
    if (!wallet) return;
    // Demo: add selected amount as quota
    const next = addBalance(wallet, selectedAmount);
    setWallet(next);
    toast(`充值成功 +${selectedAmount} 配额（模拟）`);
  }

  function onRedeem() {
    if (!wallet) return;
    const { next, error, added } = redeemCode(wallet, code);
    if (error) {
      toastWarn(error);
      return;
    }
    if (next) {
      setWallet(next);
      setCode("");
      toast(`兑换成功 +${added} 配额`);
    }
  }

  function copyInvite() {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.inviteCode);
    toast("邀请码已复制");
  }

  function simulateRebate() {
    if (!wallet) return;
    const next = addRebate(wallet, 50);
    setWallet(next);
    toast("返利到账 +50（模拟）");
  }

  function transfer() {
    if (!wallet) return;
    const n = Number(transferAmount);
    if (!Number.isFinite(n) || n <= 0) {
      toastWarn("请输入有效的转入数量");
      return;
    }
    const next = transferRebateToBalance(wallet, n);
    setWallet(next);
    setTransferAmount("");
    toast("已转入余额");
  }

  function resetWallet() {
    // Helpful during dev.
    window.localStorage.removeItem("token-saas.console.wallet.v1");
    const next = loadWallet();
    setWallet(next);
    toast("已重置钱包（本地）");
  }

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>配额与充值</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            配额是平台内部计费单位（演示版）。消耗量 = 实际 Token 数 × 模型倍率（后续接入真实计费）。
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={resetWallet}>
            重置（本地）
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
        <Stat label="主余额" value={wallet ? wallet.balance.toLocaleString() : "—"} />
        <Stat label="返利配额" value={wallet ? wallet.rebate.toLocaleString() : "—"} />
        <Stat label="邀请码" value={wallet ? wallet.inviteCode : "—"} mono />
      </div>

      {msg ? (
        <div className="pill good" style={{ marginTop: 12, justifySelf: "start" }}>
          {msg}
        </div>
      ) : null}
      {warn ? (
        <div className="pill bad" style={{ marginTop: 12, justifySelf: "start" }}>
          {warn}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, marginTop: 14 }}>
        <section className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>在线支付充值（模拟）</div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                选择充值金额
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[50, 100, 300, 1000].map((n) => (
                  <button key={n} className={`btn ${amount === n && !custom ? "btnPrimary" : ""}`} type="button" onClick={() => setAmount(n)}>
                    {n}
                  </button>
                ))}
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 180 }}
                  placeholder="自定义金额"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                选择支付方式
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className={`btn ${provider === "epay" ? "btnPrimary" : ""}`} type="button" onClick={() => setProvider("epay")}>
                  EPay
                </button>
                <button className={`btn ${provider === "stripe" ? "btnPrimary" : ""}`} type="button" onClick={() => setProvider("stripe")}>
                  Stripe
                </button>
                <button className={`btn ${provider === "creem" ? "btnPrimary" : ""}`} type="button" onClick={() => setProvider("creem")}>
                  Creem
                </button>
                <button className={`btn ${provider === "waffo" ? "btnPrimary" : ""}`} type="button" onClick={() => setProvider("waffo")}>
                  Waffo
                </button>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                当前选择：<b>{provider.toUpperCase()}</b>（演示版不跳转支付平台，点击「充值」直接模拟到账）
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="btn btnPrimary" type="button" onClick={simulatePaid} disabled={!wallet}>
                充值 +{selectedAmount}（模拟）
              </button>
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>兑换码充值</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            演示版：支持 <b>DEMO</b> 或 <b>TOPUP-数字</b>（例如 TOPUP-1000）。
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} style={{ ...inputStyle, maxWidth: "none" }} placeholder="输入兑换码" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button className="btn btnPrimary" type="button" onClick={onRedeem} disabled={!wallet}>
                兑换
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={{ padding: 14, marginTop: 12, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>邀请返利</div>
            <div className="muted" style={{ fontSize: 13 }}>
              分享邀请码给他人注册并消费后可获得返利配额（演示版提供模拟返利按钮）。
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={copyInvite} disabled={!wallet}>
              复制邀请码
            </button>
            <button className="btn" type="button" onClick={simulateRebate} disabled={!wallet}>
              模拟返利到账 +50
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="card" style={{ padding: 12, background: "rgba(0,0,0,0.22)" }}>
            <div className="muted" style={{ fontSize: 12 }}>
              返利配额余额
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{wallet ? wallet.rebate.toLocaleString() : "—"}</div>
          </div>

          <div className="card" style={{ padding: 12, background: "rgba(0,0,0,0.22)" }}>
            <div className="muted" style={{ fontSize: 12 }}>
              转入余额
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                style={{ ...inputStyle, maxWidth: 180 }}
                placeholder="转入数量"
                inputMode="decimal"
              />
              <button className="btn btnPrimary" type="button" onClick={transfer} disabled={!wallet}>
                转入余额
              </button>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              转入后即可用于调用扣费（真实扣费逻辑后续接入）。
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {props.label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          marginTop: 6,
          fontFamily: props.mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : undefined
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none"
};

