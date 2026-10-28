/* ============================================================
   El tiempo de la llamada con el asistente (22-10-2026)
   Cada servicio, entre 1 y 3 minutos: las preguntas que hacen falta y las dudas de la persona.
   · Pasado QUESTIONS_BUDGET_S, las preguntas del guion que falten se saltan (las de contygo y las de las
     entrevistas propias no: deciden si se puede contratar).
   · Pasado DOUBTS_BUDGET_S, la duda que se está respondiendo es la última: el resto, un asesor por WhatsApp.
   · Si las preguntas terminan antes de CALL_MIN_S, el asistente cuenta una duda habitual antes de ofrecer las suyas.
   · Las cuentas (medidas por voz, 22-10-2026): una duda son unos 25 s y la respuesta con el cierre otros 23, así que con
     135 s la última duda acaba hacia los 3 minutos; con 120 s para las preguntas, cabe al menos una duda.
   El reloj es el de la llamada en el navegador; solo decide cuántas preguntas opcionales se hacen.
   ============================================================ */
export const CALL_MIN_S = 60;
export const CALL_MAX_S = 180;
export const QUESTIONS_BUDGET_S = 120;
export const DOUBTS_BUDGET_S = 135;

/** Seconds since the call began, as the browser sends them: a whole number from 0 to an hour, or 0. */
export const readElapsed = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.min(3600, Math.max(0, Math.floor(value))) : 0;

/** Said the moment an answer goes, like a person on a call, while the assistant works out the reply. Recorded ahead
    (scripts/prepare-visa-live-voice.cjs llamada) so they sound at once: generated, they arrived with the reply. */
export const CALL_FILLERS = ["A ver…", "Mmm, déjame ver.", "Un momento."];

/* Lo que dice el asistente al terminar las preguntas y después de cada duda. La pantalla lo muestra y el servidor le
   pone voz en la misma respuesta (lib/agent/voiced-reply.ts): los dos lo arman aquí, con los mismos segundos. */
const DOUBT_PROMPT = "Antes de seguir, ¿te queda alguna duda? Pregúntame lo que quieras, o dime «no» para continuar.";
/** With the service's usual doubts (its script): «Mucha gente pregunta cuánto cuesta, qué documentos necesita o cuánto tarda.» */
const doubtPrompt = (topics?: string[]) => topics?.length
  ? `Antes de seguir, ¿te queda alguna duda? Mucha gente pregunta ${topics.length > 1 ? `${topics.slice(0, -1).join(", ")} o ${topics.at(-1)}` : topics[0]}. Pregúntame lo que quieras, o dime «no» para continuar.`
  : DOUBT_PROMPT;
const DOUBT_AGAIN = "¿Tienes otra duda?";
/** A short call: the questions ended before a minute, so the assistant tells a usual doubt unasked. */
const tipLine = (tip: { question: string; answer: string }) => `Te cuento algo que suelen preguntarnos: «${tip.question}» ${tip.answer} ¿Te queda alguna otra duda? Pregúntame lo que quieras, o dime «no» para continuar.`;
/** The call's time is up: the doubt being answered is the last one. */
const OUT_OF_TIME = "Se nos acaba el tiempo de esta llamada; si te queda alguna duda, un asesor te la responde por WhatsApp. Sigamos.";

/** The end of the questions and «¿Te queda alguna duda?»; on a short call, with a usual doubt told unasked. */
export function closingSpeech(turn: { message: string; doubtTip?: { question: string; answer: string } | null; doubtTopics?: string[] }, elapsed: number) {
  return turn.doubtTip && elapsed < CALL_MIN_S ? `${turn.message} ${tipLine(turn.doubtTip)}` : `${turn.message} ${doubtPrompt(turn.doubtTopics)}`;
}
/** A doubt's answer and «¿Tienes otra duda?»; past DOUBTS_BUDGET_S it is the last one (`last`). */
export function doubtSpeech(doubt: { reply: string; done?: boolean }, elapsed: number) {
  const last = !doubt.done && elapsed >= DOUBTS_BUDGET_S;
  return { text: doubt.done ? doubt.reply : `${doubt.reply} ${last ? OUT_OF_TIME : DOUBT_AGAIN}`, last };
}
