/* ============================================================
   Conversación del recorrido: preguntas de elegibilidad
   Las preguntas salen de GET /catalog de contygo (eligibilityQuestions),
   no de listas escritas a mano. Aquí solo se redactan los mensajes.
   ============================================================ */
import { publicQuestion } from "@/lib/contygo-api/catalog";
import { sanitizeAnswers, text, type QuestionKind } from "@/lib/contygo-api/checkout";
import type { AnswerValue, CatalogQuestion, DisqualifiedReason, EligibilityResult } from "@/lib/contygo-api/types";
import { INTAKE_FINISH_VOICE } from "./visa-intake";

export type ServiceAnswers = Record<string, AnswerValue>;
/**
 * Lo que el navegador necesita de cada pregunta. kind "state": options [{code, label}] (la respuesta es el código de
 * 2 letras). kind "date": dateMode past/birthdate (hasta hoy) o future_event (desde hoy; minNotice es informativo).
 * kind "unknown": no se puede responder; la ficha ofrece WhatsApp.
 */
export interface IntakeQuestion {
  id: string;
  kind: QuestionKind;
  text: string;
  dateMode?: string;
  minNotice?: Record<string, unknown>;
  options?: { code: string; label: string }[];
}
export interface JourneyGuidance { status: "potential" | "review"; title: string; detail: string; sources: { title: string; url: string }[] }

export const intakeQuestions = (questions: CatalogQuestion[]): IntakeQuestion[] =>
  questions.map(question => {
    const { kind, dateMode, minNotice, options } = publicQuestion(question) as ReturnType<typeof publicQuestion> & { options?: { code: string; label: string }[] };
    return {
      id: question.id,
      kind,
      text: text(question.prompt, "es"),
      ...(dateMode ? { dateMode } : {}),
      ...(minNotice ? { minNotice } : {}),
      ...(options ? { options } : {}),
    };
  });

export const sanitizeServiceAnswers = (questions: CatalogQuestion[], input: unknown): ServiceAnswers => sanitizeAnswers(questions, input);

export const nextServiceQuestion = (questions: IntakeQuestion[], answers: ServiceAnswers) =>
  questions.find(question => answers[question.id] === undefined) ?? null;

export const INTAKE_NO_QUESTIONS_FINISH = "¡Listo! Para este servicio no necesito hacerte preguntas previas. Ya diste el primer paso. Ahora sí, descubre cómo ContyGo te acompaña.";

export function serviceGreeting(serviceName: string, questions: IntakeQuestion[], hasVideo = true) {
  const thanks = `¡Gracias por ${hasVideo ? "ver el vídeo" : "estar aquí"}!`;
  if (!questions.length) return `${thanks} ${INTAKE_NO_QUESTIONS_FINISH.replace(/^¡Listo! /, "")}`;
  return `${thanks} Te haré ${questions.length === 1 ? "una pregunta corta" : "unas preguntas cortas"} sobre ${serviceName}. Esto no es un examen; vamos paso a paso. Puedes escribir o hablar, como te resulte más cómodo. ${questions[0].text}`;
}

export const serviceFollowup = (question: IntakeQuestion) => `Gracias. ${question.text}`;
export const SERVICE_FINISH = INTAKE_FINISH_VOICE;

/** Locuciones públicas del servicio (sin datos de la persona): se precargan durante el vídeo. */
export const serviceVoiceScripts = (serviceName: string, questions: IntakeQuestion[], hasVideo = true) =>
  [serviceGreeting(serviceName, questions, hasVideo), ...questions.slice(1).map(serviceFollowup), ...(questions.length ? [SERVICE_FINISH] : [])];

/** Frases neutras por motivo: ninguna dice «no aplica» ni promete que alguien llamará. */
const REASON_DETAIL: Record<string, string> = {
  answer: "Con tus respuestas, este servicio conviene revisarlo con más detalle.",
  deadline_passed: "Por la fecha que nos diste, conviene revisar bien el plazo de este trámite.",
  deadline_too_close: "La fecha que nos diste está muy cerca, así que conviene revisarlo cuanto antes.",
  future_date: "Revisa la fecha que indicaste: parece estar en el futuro.",
  event_too_close: "La fecha del evento está muy próxima, así que conviene revisarlo cuanto antes.",
  age_limit_too_close: "Por la edad y el estado que indicaste, el tiempo disponible es corto: conviene revisarlo cuanto antes.",
  age_limit_passed: "Por la edad y el estado que indicaste, este servicio conviene revisarlo con más detalle.",
};
const REASON_FALLBACK = "Con lo que nos contaste, este servicio conviene revisarlo con más detalle.";

export const reasonDetail = (reason: DisqualifiedReason) => REASON_DETAIL[reason] ?? REASON_FALLBACK;

/** Orientación que ve la persona al terminar. Nunca decide por ella ni da asesoría legal. */
export function eligibilityGuidance(result: EligibilityResult | null | undefined, questions: CatalogQuestion[]): JourneyGuidance | undefined {
  if (!result || !questions.length) return undefined;
  const notices = result.notices.map(notice => notice.message?.es).filter((value): value is string => Boolean(value));
  if (result.eligible) return {
    status: "potential",
    title: "Tus respuestas encajan con este servicio",
    detail: ["Con lo que nos contaste, puedes preparar tu contrato al final del recorrido.", ...notices, "Esta orientación no es asesoría legal."].join(" "),
    sources: [],
  };
  // Cada motivo una sola vez, en el orden en que contygo los da.
  const reasons = Array.from(new Set((result.disqualified ?? []).map(item => item.reason)));
  return {
    status: "review",
    title: "Revisemos tu caso con más detalle",
    detail: [...(reasons.length ? reasons.map(reasonDetail) : [REASON_FALLBACK]), ...notices, "Puedes escribirnos por WhatsApp para revisarlo, o continuar al siguiente vídeo."].join(" "),
    sources: [],
  };
}
