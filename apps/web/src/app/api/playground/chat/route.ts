import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      messages?: ChatMessage[];
    };

    const model = String(body.model || "unknown");
    const last = Array.isArray(body.messages) ? body.messages[body.messages.length - 1] : null;
    const prompt = last?.content ? String(last.content) : "";

    // Placeholder implementation: gateway is not wired yet.
    const content =
      `（操练场本地模拟）\n` +
      `model: ${model}\n` +
      (body.baseUrl ? `base_url: ${body.baseUrl}\n` : "") +
      (body.apiKey ? `api_key: ${mask(body.apiKey)}\n` : "") +
      `\n你说：${prompt}\n\n` +
      `接下来：当网关实现 /v1/chat/completions 后，这里会改为真实转发。`;

    return NextResponse.json({ ok: true, content });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Bad request" },
      { status: 400 }
    );
  }
}

function mask(key: string) {
  const k = String(key);
  if (k.length <= 10) return "***";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

