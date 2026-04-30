import { NextResponse } from "next/server";

import { MODELS } from "@/lib/models";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    data: MODELS,
    updatedAt: new Date().toISOString()
  });
}

