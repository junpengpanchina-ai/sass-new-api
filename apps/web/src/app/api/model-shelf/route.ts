import { NextResponse } from "next/server";

import { buildModelShelf } from "@/lib/modelCatalog";
import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

export const runtime = "nodejs";

export async function GET() {
  const updatedAt = new Date().toISOString();
  const internalKey = process.env.TOKFAI_INTERNAL_API_KEY?.trim();

  if (!internalKey) {
    const items = buildModelShelf(new Set());
    return NextResponse.json({
      items,
      updatedAt,
      gatewayConnected: false,
      gatewayCount: 0,
      gatewayError: "missing_internal_api_key"
    });
  }

  const gatewayIds = new Set<string>();
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/models`, {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${internalKey}`
      }
    });

    if (!res.ok) {
      const items = buildModelShelf(new Set());
      return NextResponse.json({
        items,
        updatedAt,
        gatewayConnected: false,
        gatewayCount: 0,
        gatewayError: `upstream_${res.status}`
      });
    }

    const json = (await res.json()) as { data?: Array<{ id: string }> };
    for (const row of json.data ?? []) {
      if (row?.id) gatewayIds.add(row.id);
    }

    const items = buildModelShelf(gatewayIds);
    return NextResponse.json({
      items,
      updatedAt,
      gatewayConnected: true,
      gatewayCount: gatewayIds.size
    });
  } catch (e) {
    const items = buildModelShelf(new Set());
    return NextResponse.json({
      items,
      updatedAt,
      gatewayConnected: false,
      gatewayCount: 0,
      gatewayError: e instanceof Error ? e.message : "fetch_failed"
    });
  }
}
