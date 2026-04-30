export type WalletState = {
  balance: number;
  rebate: number;
  inviteCode: string;
  updatedAt: string; // ISO
};

const STORAGE_KEY = "token-saas.console.wallet.v1";

export function loadWallet(): WalletState {
  if (typeof window === "undefined") {
    return { balance: 0, rebate: 0, inviteCode: "INVITE-DEMO", updatedAt: new Date(0).toISOString() };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initWallet();
    const data = JSON.parse(raw) as Partial<WalletState>;
    if (typeof data.balance !== "number" || typeof data.rebate !== "number" || typeof data.inviteCode !== "string") {
      return initWallet();
    }
    return {
      balance: Math.max(0, data.balance),
      rebate: Math.max(0, data.rebate),
      inviteCode: data.inviteCode,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString()
    };
  } catch {
    return initWallet();
  }
}

export function saveWallet(state: WalletState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function addBalance(state: WalletState, amount: number): WalletState {
  const next = {
    ...state,
    balance: Math.max(0, round2(state.balance + amount)),
    updatedAt: new Date().toISOString()
  };
  saveWallet(next);
  return next;
}

export function addRebate(state: WalletState, amount: number): WalletState {
  const next = {
    ...state,
    rebate: Math.max(0, round2(state.rebate + amount)),
    updatedAt: new Date().toISOString()
  };
  saveWallet(next);
  return next;
}

export function transferRebateToBalance(state: WalletState, amount: number): WalletState {
  const a = Math.min(state.rebate, Math.max(0, amount));
  const next = {
    ...state,
    rebate: round2(state.rebate - a),
    balance: round2(state.balance + a),
    updatedAt: new Date().toISOString()
  };
  saveWallet(next);
  return next;
}

export function redeemCode(state: WalletState, code: string): { next?: WalletState; error?: string; added?: number } {
  const c = code.trim().toUpperCase();
  if (!c) return { error: "请输入兑换码" };

  // Demo rule:
  // - TOPUP-<number> adds that number as quota (e.g. TOPUP-1000)
  // - DEMO adds 1000
  if (c === "DEMO") {
    const added = 1000;
    return { next: addBalance(state, added), added };
  }

  const m = /^TOPUP-(\d{1,9})$/.exec(c);
  if (m) {
    const added = Number(m[1]);
    if (!Number.isFinite(added) || added <= 0) return { error: "兑换码金额无效" };
    return { next: addBalance(state, added), added };
  }

  return { error: "兑换码无效（演示版支持 DEMO 或 TOPUP-<数字>）" };
}

function initWallet(): WalletState {
  const inviteCode = "INV-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const state: WalletState = { balance: 0, rebate: 0, inviteCode, updatedAt: new Date().toISOString() };
  saveWallet(state);
  return state;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

