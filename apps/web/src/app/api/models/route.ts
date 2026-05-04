import { NextResponse } from "next/server";

import { catalogModelsAsUi, type UiModel } from "@/lib/models";
import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

export const runtime = "nodejs";

export async function GET() {
  const updatedAt = new Date().toISOString();
  const fallback = catalogModelsAsUi();
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/models`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({
        data: fallback,
        updatedAt,
        degraded: true,
        upstreamStatus: res.status
      });
    }
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    const rows = Array.isArray(json.data) ? json.data : [];
    const data: UiModel[] = rows.map((m) => ({
      id: m.id,
      provider: "tokfai",
      label: m.id,
      contextWindow: 128_000,
      input: "text" as const,
      enabled: true
    }));
    return NextResponse.json({
      data: data.length ? data : fallback,
      updatedAt
    });
  } catch (e) {
    return NextResponse.json({
      data: fallback,
      updatedAt,
      degraded: true,
      error: e instanceof Error ? e.message : "fetch failed"
    });
  }
}
