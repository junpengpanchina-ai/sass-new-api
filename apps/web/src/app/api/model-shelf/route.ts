import { NextResponse } from "next/server";

import { buildModelShelf } from "@/lib/modelCatalog";
import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

export const runtime = "nodejs";

export async function GET() {
  const updatedAt = new Date().toISOString();
  const gatewayIds = new Set<string>();
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/models`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      for (const row of json.data ?? []) {
        if (row?.id) gatewayIds.add(row.id);
      }
    }
  } catch {
    /* ignore */
  }

  const items = buildModelShelf(gatewayIds);
  return NextResponse.json({ items, updatedAt, gatewayCount: gatewayIds.size });
}
