/* ============================================================
   Un turno de la llamada que trae su propia voz (25-10-2026)
   «El agente de voz demora un poco en responder»: entender la respuesta y después pedir su voz eran dos esperas
   seguidas (~4 s + ~2,3 s hasta el primer sonido). Con la voz encendida, el navegador lo pide con VOICED_REPLY_HEADER:
   la sesión de voz se conecta mientras se entiende la respuesta, y la misma respuesta trae primero el turno (una línea
   JSON con `speech`, lo que va a decir) y después su audio. Lo grabado de antemano (PREPARED_SCRIPTS) no se genera:
   el navegador lo pide como siempre.
   ============================================================ */
import type { NextRequest } from "next/server";
import { agentEnabled, clientIp, getGenAI, rateLimit } from "./server";
import { preconnectLiveSpeech } from "./visa-live-audio";
import { VOICED_REPLY_HEADER } from "./visa-live-config";
import { INTAKE_VOICE_SCRIPTS, isSameOriginIntakeRequest } from "./visa-intake";
import { GUIDE_VOICE_SCRIPTS } from "./guide-scripts";
import { CALL_FILLERS } from "./call-time";

/** Approved public lines recorded by scripts/prepare-visa-live-voice.cjs: the interview, the voice guide and the call's fillers. */
export const PREPARED_SCRIPTS = new Set([...INTAKE_VOICE_SCRIPTS, ...GUIDE_VOICE_SCRIPTS, ...CALL_FILLERS]);

/** Runs a turn; with the voice asked for, the turn's JSON comes first and the voice of its `speech` follows it. */
export async function voicedReply(req: NextRequest, work: (voiced: boolean) => Promise<Response>): Promise<Response> {
  // The same budget as /api/agent/visa-live-speech: each voiced turn is one Live session.
  const voiced = agentEnabled && req.headers.get(VOICED_REPLY_HEADER) === "1" && isSameOriginIntakeRequest(req) && rateLimit(`visa-live:${clientIp(req)}`, 60, 10 * 60 * 1000);
  if (!voiced) return work(false);
  const live = preconnectLiveSpeech(getGenAI());
  let response: Response;
  try { response = await work(true); } catch (cause) { live.close(); throw cause; }
  const reply: unknown = response.status === 200 ? await response.clone().json().catch(() => null) : null;
  const speech = reply && typeof reply === "object" && "speech" in reply && typeof reply.speech === "string" ? reply.speech.trim() : "";
  if (!speech || speech.length > 2000 || PREPARED_SCRIPTS.has(speech)) { live.close(); return response; }
  return new Response(live.stream(speech, req.signal, reply), {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": "application/x-ndjson", "X-Accel-Buffering": "no" },
  });
}
