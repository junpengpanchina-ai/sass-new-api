import { NextResponse } from "next/server";

import { OPENAI_BASE_URL } from "@/lib/openaiApiBase";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      messages?: ChatMessage[];
    };

    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "缺少 API Key（令牌）" }, { status: 400 });
    }

    const base = (String(body.baseUrl || "").trim() || OPENAI_BASE_URL).replace(/\/+$/, "");
    const url = `${base}/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        stream: false
      })
    });

    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const errObj = json?.error as { message?: string } | string | undefined;
      const msg =
        (typeof errObj === "object" && errObj?.message) ||
        (typeof errObj === "string" && errObj) ||
        (typeof json?.message === "string" && json.message) ||
        `upstream ${res.status}`;
      return NextResponse.json({ ok: false, error: String(msg) }, { status: res.status });
    }

    const choices = json?.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, content: String(content) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Bad request" },
      { status: 400 }
    );
  }
}
