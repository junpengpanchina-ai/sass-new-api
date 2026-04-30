export type PlanPeriod = "day" | "week" | "month";

export type SubscriptionPlan = {
  id: string;
  name: string;
  period: PlanPeriod;
  price: number; // display only
  quotaIncluded: number;
  perks?: string[];
};

export type SubscriptionState = {
  planId: string;
  planName: string;
  period: PlanPeriod;
  startedAt: string; // ISO
  expiresAt: string; // ISO
  quotaRemaining: number;
  autoRenew: boolean;
};

const STORAGE_KEY = "token-saas.console.subscription.v1";

export const PLANS: SubscriptionPlan[] = [
  { id: "sub_day_1k", name: "日包 · 1K", period: "day", price: 9.9, quotaIncluded: 1000, perks: ["适合临时测试"] },
  { id: "sub_week_10k", name: "周包 · 10K", period: "week", price: 49.0, quotaIncluded: 10_000, perks: ["适合短期稳定用量"] },
  { id: "sub_month_50k", name: "月包 · 50K", period: "month", price: 169.0, quotaIncluded: 50_000, perks: ["适合长期稳定用量"] }
];

export function loadSubscription(): SubscriptionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SubscriptionState;
    if (!data || typeof data.planId !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSubscription(s: SubscriptionState | null) {
  if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function createSubscription(plan: SubscriptionPlan): SubscriptionState {
  const startedAt = new Date();
  const expiresAt = addPeriod(startedAt, plan.period);
  return {
    planId: plan.id,
    planName: plan.name,
    period: plan.period,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    quotaRemaining: plan.quotaIncluded,
    autoRenew: false
  };
}

export function isActive(sub: SubscriptionState) {
  return new Date(sub.expiresAt).getTime() > Date.now();
}

export function toggleAutoRenew(sub: SubscriptionState, next: boolean): SubscriptionState {
  const updated = { ...sub, autoRenew: next };
  saveSubscription(updated);
  return updated;
}

function addPeriod(date: Date, period: PlanPeriod) {
  const d = new Date(date.getTime());
  if (period === "day") d.setDate(d.getDate() + 1);
  if (period === "week") d.setDate(d.getDate() + 7);
  if (period === "month") d.setMonth(d.getMonth() + 1);
  return d;
}

