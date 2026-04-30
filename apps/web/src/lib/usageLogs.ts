export type UsageLog = {
  id: string;
  at: string; // ISO
  model: string;
  tokenId: string;
  tokenName: string;
  inputTokens: number;
  outputTokens: number;
  quotaCost: number;
  status: "ok" | "error";
  latencyMs: number;
};

const STORAGE_KEY = "token-saas.console.usageLogs.v1";

export function loadUsageLogs(): UsageLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as UsageLog[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveUsageLogs(logs: UsageLog[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function seedDemoUsageLogs(): UsageLog[] {
  const models = ["gpt-4.1-mini", "gpt-4.1", "o4-mini"];
  const tokens = [
    { id: "tok_demo_prod", name: "生产环境" },
    { id: "tok_demo_test", name: "测试用" }
  ];

  const now = Date.now();
  const days = 14;
  const logs: UsageLog[] = [];

  for (let d = 0; d < days; d++) {
    const dayStart = now - d * 24 * 60 * 60 * 1000;
    const n = 10 + Math.floor(Math.random() * 16);
    for (let i = 0; i < n; i++) {
      const at = new Date(dayStart - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString();
      const m = models[Math.floor(Math.random() * models.length)];
      const t = tokens[Math.floor(Math.random() * tokens.length)];
      const inputTokens = 50 + Math.floor(Math.random() * 1500);
      const outputTokens = 30 + Math.floor(Math.random() * 1800);
      const quotaCost = round2((inputTokens + outputTokens) / 1000 * (m === "gpt-4.1" ? 10 : 2));
      const ok = Math.random() > 0.06;
      logs.push({
        id: `log_${crypto.randomUUID()}`,
        at,
        model: m,
        tokenId: t.id,
        tokenName: t.name,
        inputTokens,
        outputTokens,
        quotaCost,
        status: ok ? "ok" : "error",
        latencyMs: 180 + Math.floor(Math.random() * 900)
      });
    }
  }

  logs.sort((a, b) => (a.at < b.at ? 1 : -1));
  saveUsageLogs(logs);
  return logs;
}

export function isoDay(iso: string) {
  return iso.slice(0, 10);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

