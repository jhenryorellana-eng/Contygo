/* POST /api/agent/team-chat — el asistente de la carta del equipo (/links; lib/agent/team-chat.ts).
   Body: { question, history?, serviceId? }. Responde { ok, reply, covered, serviceIds? }. Con serviceId (la pregunta se
   escribió en la ficha de ese servicio) el asistente se alimenta de ese producto. Sabe lo mismo que la página enseña, más el
   precio y las formas de pago en vivo de cada paquete. Sin IA, o si falla, da la ficha del servicio que la pregunta
   nombra; si no, lo dice. Lo que ContyGo no tiene escrito de un servicio lo lee en sus páginas oficiales y lo
   entrega con sus enlaces (sources) para comprobarlo. No guarda la conversación ni registra la pregunta. */
import { NextRequest, NextResponse } from "next/server";
import { CHAT_MODEL, agentEnabled, clientIp, getGenAI, rateLimit, turnThinking } from "@/lib/agent/server";
import { isSameOriginIntakeRequest } from "@/lib/agent/visa-intake";
import { readTurnBody } from "@/lib/agent/request";
import { TEAM_CHAT_RULES, TEAM_NO_ANSWER, isJuvenileQuestion, isTeamService, localTeamReply, readTeamHistory, readTeamLookup, readTeamReply, teamFocusRule, teamKnowledge, type TeamReply } from "@/lib/agent/team-chat";
import { BRAIN_RULES, brainFor, brainState } from "@/lib/agent/sijs-brain";
import { OFFICIAL_PAGES, readOfficial } from "@/lib/agent/official-pages";
import { loadEb4Bulletin, type Eb4Bulletin } from "@/lib/agent/visa-bulletin";
import { VISIBLE_SERVICES } from "@/lib/contygo-catalog";
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

  // The page shows each step as it really happens («Buscando en el Cerebro: Texas»): with Accept: application/x-ndjson the
  // answer comes as lines, one per step and the last with the answer. Without it, one JSON as before.
  if (req.headers.get("accept")?.includes("application/x-ndjson")) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (value: unknown) => { try { controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`)); } catch { /* the reader left */ } };
        try { send({ done: await answerFor({ question, history, focusId }, step => send({ step })) }); }
        catch { send({ done: { ok: true, reply: TEAM_NO_ANSWER, covered: false } }); }
        try { controller.close(); } catch { /* already closed */ }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Content-Type-Options": "nosniff", "X-Accel-Buffering": "no" } });
  }
  return json(await answerFor({ question, history, focusId }, () => {}));
}

/** A step of the work, as it happens: what the screen animates while the answer is on its way. */
type Step = { kind: "prices"; ok: boolean } | { kind: "brain"; states: string[]; codes: string[]; county?: string } | { kind: "sheet"; service: string } | { kind: "writing" } | { kind: "official"; sites: string[] };

async function answerFor({ question, history, focusId }: { question: string; history: ReturnType<typeof readTeamHistory>; focusId?: string }, emit: (step: Step) => void) {
  let remotes: CatalogService[] = [];
  try { remotes = await loadCatalog(); } catch { /* Without the live catalogue the assistant answers the process and leaves prices to the page. */ }
  let bulletin: Eb4Bulletin | null = null;
  try { bulletin = await loadEb4Bulletin(); } catch { /* Without the bulletin the assistant says it has no cut-off date. */ }
  emit({ kind: "prices", ok: remotes.length > 0 });
  const focus = focusId ? VISIBLE_SERVICES.find(service => service.id === focusId) : undefined;
  if (focus) emit({ kind: "sheet", service: focus.name });
  const fallback: TeamReply = localTeamReply(question, remotes, focusId) ?? { reply: TEAM_NO_ANSWER, covered: false };

  // The brain's states (lib/agent/sijs-brain.ts): the national table and the sheet of the places the question names —
  // or of the ones the last turns named, for a follow-up like «¿y en qué corte?».
  const juvenile = isJuvenileQuestion(question, focusId);
  const places = `${question} ${history.map(turn => turn.q).join(" ")}`;
  const names = (codes: string[]) => codes.map(code => brainState(code)?.name ?? code);
  const generate = async (brain: { text: string; states: string[] } | null) => {
    const response = await getGenAI().models.generateContent({
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: JSON.stringify({ conversacionAnterior: history, pregunta: question }) }] }],
      config: {
        systemInstruction: `${TEAM_CHAT_RULES}${brain ? ` ${BRAIN_RULES}` : ""}${teamFocusRule(focusId)}\n\nCONOCIMIENTO:\n${teamKnowledge(remotes, focusId, bulletin, brain?.text)}`,
        responseMimeType: "application/json",
        responseJsonSchema: { type: "object", additionalProperties: false, properties: { reply: { type: "string" }, covered: { type: "boolean" }, serviceIds: { type: "array", items: { type: "string" } },
          lookup: { type: "object", additionalProperties: false, properties: { state: { type: "string" }, county: { type: "string" } }, required: ["state"] } }, required: ["reply", "covered"] },
        temperature: .2, maxOutputTokens: 1100, thinkingConfig: turnThinking(CHAT_MODEL), abortSignal: AbortSignal.timeout(25000),
      },
    });
    return JSON.parse(response.text ?? "") as unknown;
  };

  let answer: TeamReply = fallback;
  /** What the answer leaned on, for the screen to say it: the brain's states, and whether live prices were at hand. */
  let used: { brain?: string[]; prices?: boolean } = remotes.length ? { prices: true } : {};
  if (agentEnabled) {
    try {
      let brain = juvenile ? brainFor(places) : null;
      if (brain) emit({ kind: "brain", states: names(brain.states), codes: brain.states });
      emit({ kind: "writing" });
      let parsed = await generate(brain);
      // The model placed the question in a state whose sheet it did not have (a city, a county): one more round, with it.
      const lookup = juvenile ? readTeamLookup(parsed) : null;
      if (lookup && brainState(lookup.state) && (!brain?.states.includes(lookup.state) || lookup.county)) {
        brain = brainFor(places, lookup);
        emit({ kind: "brain", states: names([lookup.state]), codes: [lookup.state], ...(lookup.county ? { county: lookup.county } : {}) });
        emit({ kind: "writing" });
        parsed = await generate(brain);
      }
      const read = readTeamReply(parsed);
      if (read) { answer = read; if (brain) used = { ...used, brain: names(brain.states) }; }
    } catch { /* No answer from the model: the service's sheet, or the honest «no pude». */ }
  }
  // What ContyGo has not written, for a known service: read on that service's official pages and handed over only with
  // their links (lib/agent/official-pages.ts). Which service: the row it was asked on, or the one the answer names.
  if (agentEnabled && !answer.covered) {
    const about = VISIBLE_SERVICES.find(service => service.id === (focusId ?? answer.serviceIds?.[0]));
    if (about && OFFICIAL_PAGES[about.id]?.length) {
      emit({ kind: "official", sites: Array.from(new Set(OFFICIAL_PAGES[about.id].map(url => new URL(url).hostname.replace(/^www\./, "")))) });
      try {
        const found = await readOfficial({ serviceId: about.id, serviceName: about.name, question, ...(answer.reply !== TEAM_NO_ANSWER ? { known: answer.reply } : {}) });
        if (found) answer = { ...answer, reply: found.reply, sources: found.sources };
      } catch { /* The pages did not answer: the honest «no tengo ese dato» stays. */ }
    }
  }
  // On a service's row the answer is about that service: it needs no «Ver …» of itself.
  if (focusId && answer.serviceIds) answer = { ...answer, serviceIds: answer.serviceIds.filter(id => id !== focusId) };
  // Only that it happened, never the question.
  if (!answer.covered) console.info(answer.sources ? "[chat-equipo:fuente-oficial]" : "[chat-equipo:sin-respuesta]");
  return { ok: true as const, ...answer, used };
}
