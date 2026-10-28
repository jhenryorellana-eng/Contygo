import { NextRequest, NextResponse } from "next/server";
import { agentEnabled, clientIp, rateLimit } from "@/lib/agent/server";
import { isSameOriginIntakeRequest } from "@/lib/agent/visa-intake";
import { readTurnAudio, readTurnBody } from "@/lib/agent/request";
import { answerDoubt, localDoubt, NO_ANSWER, type DoubtReply } from "@/lib/agent/doubts";
import { serviceKnowledge } from "@/lib/agent/service-knowledge";
import { LOTTERY_COST_REPLY, LOTTERY_SERVICE } from "@/lib/agent/lottery-intake";
import { doubtSpeech, readElapsed } from "@/lib/agent/call-time";
import { voicedReply } from "@/lib/agent/voiced-reply";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { loadCatalog } from "@/lib/contygo-api/catalog";
import type { CatalogService } from "@/lib/contygo-api/types";

// «¿Te queda alguna duda?» (21-10-2026): al terminar las preguntas, la persona pregunta lo que quiera, por escrito o
// con su voz, y el bot responde con lo que sabe del servicio (lib/agent/service-knowledge.ts). Sin estado: no guarda
// la conversación. Lo que no sabe lo dice (covered:false) y ofrece WhatsApp; esa duda queda para que el equipo la responda.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export async function POST(req: NextRequest) {
  return voicedReply(req, voiced => handle(req, voiced));
}

async function handle(req: NextRequest, voiced: boolean) {
  if (!isSameOriginIntakeRequest(req)) return json({ ok: false, error: "forbidden_origin" }, 403);
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ ok: false, error: "json_required" }, 415);
  if (!rateLimit(`service-doubt:${clientIp(req)}`, 30, 600000)) return json({ ok: false, error: "rate_limited" }, 429);
  const read = await readTurnBody(req);
  if ("error" in read) return json({ ok: false, error: read.error }, read.status);
  const body = read.body;
  if (!record(body) || typeof body.serviceId !== "string") return json({ ok: false, error: "invalid_service" }, 400);
  const local = CONTYGO_SERVICES.find(service => service.id === body.serviceId);
  if (!local) return json({ ok: false, error: "invalid_service" }, 400);
  const audio = body.audio === undefined ? null : readTurnAudio(body.audio);
  if (body.audio !== undefined && !audio) return json({ ok: false, error: "invalid_audio" }, 400);
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!audio && (!question || question.length > 600)) return json({ ok: false, error: "invalid_question" }, 400);

  const costReply = local.id === LOTTERY_SERVICE ? LOTTERY_COST_REPLY : undefined;
  // Without the model (no credit, down), a written doubt still gets what is known for certain (28-10-2026).
  const fallback: DoubtReply = (!audio && localDoubt({ serviceId: local.id, question, costReply })) || { heard: question, reply: NO_ANSWER, covered: false };
  if (!agentEnabled) return json({ ok: true, ...fallback });
  let remotes: CatalogService[] = [];
  try { remotes = await loadCatalog(); } catch { /* Without live prices the sheet still answers; prices are left to the contract. */ }
  let doubt: DoubtReply = fallback;
  try {
    doubt = await answerDoubt({ serviceName: local.name, knowledge: serviceKnowledge(local.id, remotes), ...(audio ? { audio } : { question }), ...(costReply ? { costReply } : {}) }) ?? fallback;
  } catch { /* The model did not answer: the same honest fallback, with WhatsApp. */ }
  if (!doubt.covered) console.info(`[bot:duda-sin-respuesta] ${local.id}`);
  // With the voice on, the answer and «¿Tienes otra duda?» come voiced with it (lib/agent/voiced-reply.ts).
  return json({ ok: true, ...doubt, ...(voiced ? { speech: doubtSpeech(doubt, readElapsed(body.elapsed)).text } : {}) });
}
