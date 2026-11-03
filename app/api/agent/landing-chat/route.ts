/* POST /api/agent/landing-chat — el chat de la esquina de la portada (lib/agent/landing-chat.ts).
   Body: { question, history? }. Responde { ok, reply, covered, serviceIds? }. Las preguntas de cada servicio no
   pasan por aquí: el chat usa /api/agent/service-intake, el mismo de la guía. Sin IA, o si falla, responde lo que sabe
   seguro; si no, que lo atiende un asesor. La invitación a WhatsApp la pone la pantalla. No guarda la conversación. */
import { NextRequest, NextResponse } from "next/server";
import { TURN_MODEL, agentEnabled, clientIp, getGenAI, rateLimit, turnThinking } from "@/lib/agent/server";
import { isSameOriginIntakeRequest } from "@/lib/agent/visa-intake";
import { readTurnBody } from "@/lib/agent/request";
import { LANDING_CHAT_RULES, LANDING_NO_ANSWER, landingKnowledge, localLandingReply, readLandingHistory, readLandingReply, type LandingPrices, type LandingReply } from "@/lib/agent/landing-chat";
import { loadCatalog, priceSummary } from "@/lib/contygo-api/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export async function POST(req: NextRequest) {
  if (!isSameOriginIntakeRequest(req)) return json({ ok: false, error: "forbidden_origin" }, 403);
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ ok: false, error: "json_required" }, 415);
  if (!rateLimit(`landing-chat:${clientIp(req)}`, 20, 600000)) return json({ ok: false, error: "rate_limited" }, 429);
  const read = await readTurnBody(req);
  if ("error" in read) return json({ ok: false, error: read.error }, read.status);
  const body = read.body;
  const question = record(body) && typeof body.question === "string" ? body.question.replace(/\s+/g, " ").trim() : "";
  if (!question || question.length > 500) return json({ ok: false, error: "invalid_question" }, 400);
  const history = record(body) ? readLandingHistory(body.history) : [];

  let prices: LandingPrices | null = null;
  try { prices = priceSummary(await loadCatalog()); } catch { /* Without live prices the chat quotes only the page's «desde». */ }
  const fallback: LandingReply = localLandingReply(question, prices) ?? { reply: LANDING_NO_ANSWER, covered: false };

  let answer: LandingReply = fallback;
  if (agentEnabled) {
    try {
      const response = await getGenAI().models.generateContent({
        model: TURN_MODEL,
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ conversacionAnterior: history, pregunta: question }) }] }],
        config: {
          systemInstruction: `${LANDING_CHAT_RULES}\n\nCONOCIMIENTO:\n${landingKnowledge(prices)}`,
          responseMimeType: "application/json",
          responseJsonSchema: { type: "object", additionalProperties: false, properties: { reply: { type: "string" }, covered: { type: "boolean" }, serviceIds: { type: "array", items: { type: "string" } } }, required: ["reply", "covered"] },
          temperature: .2, maxOutputTokens: 400, thinkingConfig: turnThinking(TURN_MODEL), abortSignal: AbortSignal.timeout(15000),
        },
      });
      answer = readLandingReply(JSON.parse(response.text ?? "")) ?? fallback;
    } catch { /* No answer from the model: what is known for certain, or an advisor. */ }
  }
  // Only that it happened, never the question: the team sees how often the chat falls short.
  if (!answer.covered) console.info("[chat-portada:sin-respuesta]");
  return json({ ok: true, ...answer });
}
