"use client";

import { useEffect, useMemo, useState } from "react";

import { isoDay, loadUsageLogs, seedDemoUsageLogs, type UsageLog } from "@/lib/usageLogs";

type DayAgg = { day: string; calls: number; quota: number };

export default function ConsoleOverviewPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    setLogs(loadUsageLogs());
  }, []);

  const agg = useMemo(() => aggregateByDay(logs, 14), [logs]);
  const totals = useMemo(() => {
    const calls = logs.length;
    const quota = round2(logs.reduce((s, l) => s + l.quotaCost, 0));
    const ok = logs.filter((l) => l.status === "ok").length;
    const err = calls - ok;
    return { calls, quota, ok, err };
  }, [logs]);

  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>数据看板</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            展示每日 API 调用量与配额消耗趋势（本地模拟数据，后续接入真实日志）。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              const next = seedDemoUsageLogs();
              setLogs(next);
            }}
          >
            生成演示数据
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
        <StatCard label="调用次数" value={totals.calls.toLocaleString()} />
        <StatCard label="配额消耗" value={totals.quota.toLocaleString()} />
        <StatCard label="成功" value={totals.ok.toLocaleString()} />
        <StatCard label="失败" value={totals.err.toLocaleString()} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <ChartCard title="每日调用量">
          <MiniBars
            data={agg}
            valueKey="calls"
            valueFormatter={(n) => `${n} calls`}
          />
        </ChartCard>
        <ChartCard title="每日配额消耗">
          <MiniBars
            data={agg}
            valueKey="quota"
            valueFormatter={(n) => `${n} quota`}
          />
        </ChartCard>
      </div>

      <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        提示：进入 <a className="btn" style={{ padding: "6px 10px" }} href="/console/log">/console/log</a> 可按时间/模型/令牌过滤查看明细。
      </div>
    </main>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {props.label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{props.value}</div>
    </div>
  );
}

function ChartCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 14, background: "rgba(255,255,255,0.04)" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{props.title}</div>
      {props.children}
    </div>
  );
}

function MiniBars<T extends { day: string }>(props: {
  data: T[];
  valueKey: keyof T;
  valueFormatter: (n: number) => string;
}) {
  const values = props.data.map((d) => Number(d[props.valueKey]));
  const max = Math.max(1, ...values);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${props.data.length}, 1fr)`, gap: 6, alignItems: "end", height: 140 }}>
      {props.data.map((d) => {
        const v = Number(d[props.valueKey]);
        const h = Math.max(4, Math.round((v / max) * 120));
        return (
          <div key={d.day} title={`${d.day}\n${props.valueFormatter(v)}`} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
            <div style={{ width: "100%", height: h, borderRadius: 10, background: "rgba(124,92,255,0.35)", border: "1px solid rgba(124,92,255,0.45)" }} />
            <div className="muted" style={{ fontSize: 11 }}>
              {d.day.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function aggregateByDay(logs: UsageLog[], days: number): DayAgg[] {
  const byDay = new Map<string, DayAgg>();
  for (const l of logs) {
    const day = isoDay(l.at);
    const prev = byDay.get(day) || { day, calls: 0, quota: 0 };
    prev.calls += 1;
    prev.quota = round2(prev.quota + l.quotaCost);
    byDay.set(day, prev);
  }

  const out: DayAgg[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const day = isoDay(d.toISOString());
    out.push(byDay.get(day) || { day, calls: 0, quota: 0 });
  }
  return out;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

