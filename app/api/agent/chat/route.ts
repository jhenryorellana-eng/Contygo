/* ============================================================
   POST /api/agent/chat — chat escrito con Prime (Gemini, streaming)
   Body: { messages: [{ role: "user" | "model", text }] }
   Respuesta: texto plano en streaming (chunks a medida que llegan).
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { buildSystemInstruction } from "@/lib/agent/prompt";
import { CHAT_MODEL, agentEnabled, clientIp, getGenAI, rateLimit } from "@/lib/agent/server";

export const runtime = "nodejs";

const MAX_MESSAGES = 16;
const MAX_CHARS = 2000;

interface InMsg {
  role: "user" | "model";
  text: string;
}

export async function POST(req: NextRequest) {
  if (!agentEnabled) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (!rateLimit(`chat:${clientIp(req)}`, 40, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? (body.messages as unknown[]) : [];
  const messages: InMsg[] = raw
    .filter(
      (m): m is InMsg =>
        typeof m === "object" &&
        m !== null &&
        ((m as InMsg).role === "user" || (m as InMsg).role === "model") &&
        typeof (m as InMsg).text === "string",
    )
    .map((m) => ({ role: m.role, text: m.text.trim().slice(0, MAX_CHARS) }))
    .filter((m) => m.text.length > 0)
    .slice(-MAX_MESSAGES);

  if (messages.length === 0 || messages[messages.length - 1]!.role !== "user") {
    return NextResponse.json({ ok: false, error: "no_user_message" }, { status: 400 });
  }

  try {
    const ai = getGenAI();
    const stream = await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      config: {
        systemInstruction: buildSystemInstruction("chat"),
        temperature: 0.5,
        maxOutputTokens: 800,
      },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const t = chunk.text;
            if (t) controller.enqueue(encoder.encode(t));
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n[[error]]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
