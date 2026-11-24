/* POST /api/agent/team-chat — el asistente de la carta del equipo (/links; lib/agent/team-chat.ts).
   Body: { question, history?, serviceId? }. Responde { ok, reply, covered, serviceIds? }. Con serviceId (la pregunta se
   escribió en la ficha de ese servicio) el asistente se alimenta de ese producto. Sabe lo mismo que la página enseña, más el
   precio y las formas de pago en vivo de cada paquete. Sin IA, o si falla, da la ficha del servicio que la pregunta
   nombra; si no, lo dice. No guarda la conversación ni registra la pregunta. */
import { NextRequest, NextResponse } from "next/server";
import { CHAT_MODEL, agentEnabled, clientIp, getGenAI, rateLimit, turnThinking } from "@/lib/agent/server";
import { isSameOriginIntakeRequest } from "@/lib/agent/visa-intake";
import { readTurnBody } from "@/lib/agent/request";
import { TEAM_CHAT_RULES, TEAM_NO_ANSWER, isTeamService, localTeamReply, readTeamHistory, readTeamReply, teamFocusRule, teamKnowledge, type TeamReply } from "@/lib/agent/team-chat";
import { loadCatalog } from "@/lib/contygo-api/catalog";
import type { CatalogService } from "@/lib/contygo-api/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export async function POST(req: NextRequest) {
  if (!isSameOriginIntakeRequest(req)) return json({ ok: false, error: "forbidden_origin" }, 403);
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ ok: false, error: "json_required" }, 415);
  // The page is open to whoever has its link: a ceiling per IP, short and long, keeps the shared key from being drained.
  const ip = clientIp(req);
  if (!rateLimit(`team-chat:${ip}`, 30, 600000) || !rateLimit(`team-chat-day:${ip}`, 300, 86400000)) return json({ ok: false, error: "rate_limited" }, 429);
  const read = await readTurnBody(req);
  if ("error" in read) return json({ ok: false, error: read.error }, read.status);
  const body = read.body;
  const question = record(body) && typeof body.question === "string" ? body.question.replace(/\s+/g, " ").trim() : "";
  if (!question || question.length > 600) return json({ ok: false, error: "invalid_question" }, 400);
  const history = record(body) ? readTeamHistory(body.history) : [];
  const given = record(body) ? body.serviceId : undefined;
  if (given !== undefined && !isTeamService(given)) return json({ ok: false, error: "invalid_service" }, 400);
  const focusId = isTeamService(given) ? given : undefined;

  let remotes: CatalogService[] = [];
  try { remotes = await loadCatalog(); } catch { /* Without the live catalogue the assistant answers the process and leaves prices to the page. */ }
  const fallback: TeamReply = localTeamReply(question, remotes, focusId) ?? { reply: TEAM_NO_ANSWER, covered: false };

  let answer: TeamReply = fallback;
  if (agentEnabled) {
    try {
      const response = await getGenAI().models.generateContent({
        model: CHAT_MODEL,
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ conversacionAnterior: history, pregunta: question }) }] }],
        config: {
          systemInstruction: `${TEAM_CHAT_RULES}${teamFocusRule(focusId)}\n\nCONOCIMIENTO:\n${teamKnowledge(remotes, focusId)}`,
          responseMimeType: "application/json",
          responseJsonSchema: { type: "object", additionalProperties: false, properties: { reply: { type: "string" }, covered: { type: "boolean" }, serviceIds: { type: "array", items: { type: "string" } } }, required: ["reply", "covered"] },
          temperature: .2, maxOutputTokens: 900, thinkingConfig: turnThinking(CHAT_MODEL), abortSignal: AbortSignal.timeout(25000),
        },
      });
      answer = readTeamReply(JSON.parse(response.text ?? "")) ?? fallback;
      // On a service's row the answer is about that service: it needs no «Ver …» of itself.
      if (focusId && answer.serviceIds) answer = { ...answer, serviceIds: answer.serviceIds.filter(id => id !== focusId) };
    } catch { /* No answer from the model: the service's sheet, or the honest «no pude». */ }
  }
  // Only that it happened, never the question.
  if (!answer.covered) console.info("[chat-equipo:sin-respuesta]");
  return json({ ok: true, ...answer });
}
