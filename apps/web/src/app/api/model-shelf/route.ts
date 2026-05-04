import { NextResponse } from "next/server";

import { buildModelShelf } from "@/lib/modelCatalog";
import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

export const runtime = "nodejs";

function normalizeInternalApiKey(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function keyDiagnostics(rawInternalApiKey: string | undefined, internalApiKey: string) {
  return {
    internalKeyPresent: Boolean(rawInternalApiKey),
    internalKeyNormalizedPresent: Boolean(internalApiKey),
    internalKeyPrefix: internalApiKey ? internalApiKey.slice(0, 4) : null,
    internalKeyLength: internalApiKey.length
  };
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const rawInternalApiKey = process.env.TOKFAI_INTERNAL_API_KEY;
  const internalApiKey = normalizeInternalApiKey(rawInternalApiKey);
  const diag = keyDiagnostics(rawInternalApiKey, internalApiKey);

  if (!internalApiKey) {
    return NextResponse.json({
      items: buildModelShelf(new Set()),
      updatedAt,
      gatewayConnected: false,
      gatewayCount: 0,
      gatewayError: "missing_internal_api_key",
      ...diag
    });
  }

  if (!internalApiKey.startsWith("tsk_")) {
    return NextResponse.json({
      items: buildModelShelf(new Set()),
      updatedAt,
      gatewayConnected: false,
      gatewayCount: 0,
      gatewayError: "invalid_internal_api_key_format",
      ...diag
    });
  }

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/models`, {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${internalApiKey}`
      }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const gatewayBodyPreview = text.slice(0, 300);
      return NextResponse.json({
        items: buildModelShelf(new Set()),
        updatedAt,
        gatewayConnected: false,
        gatewayCount: 0,
        gatewayError: `upstream_${res.status}`,
        gatewayStatus: res.status,
        gatewayBodyPreview,
        ...diag
      });
    }

    const json = (await res.json()) as { data?: Array<{ id: string }> };
    const gatewayIds = new Set<string>();
    for (const row of json.data ?? []) {
      if (row?.id) gatewayIds.add(row.id);
    }

    const items = buildModelShelf(gatewayIds);
    return NextResponse.json({
      items,
      updatedAt,
      gatewayConnected: true,
      gatewayCount: gatewayIds.size,
      ...diag
    });
  } catch (e) {
    return NextResponse.json({
      items: buildModelShelf(new Set()),
      updatedAt,
      gatewayConnected: false,
      gatewayCount: 0,
      gatewayError: e instanceof Error ? e.message : "fetch_failed",
      ...diag
    });
  }
}
