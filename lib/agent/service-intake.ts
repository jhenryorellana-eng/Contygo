/* ============================================================
   Conversación del recorrido: preguntas de elegibilidad
   Las preguntas salen de GET /catalog de contygo (eligibilityQuestions),
   no de listas escritas a mano. Aquí solo se redactan los mensajes.
   ============================================================ */
import { questionKind, sanitizeAnswers, text, type QuestionKind } from "@/lib/contygo-api/checkout";
import type { AnswerValue, CatalogQuestion, EligibilityResult } from "@/lib/contygo-api/types";
import { INTAKE_FINISH_VOICE } from "./visa-intake";

export type ServiceAnswers = Record<string, AnswerValue>;
export interface IntakeQuestion { id: string; kind: QuestionKind; text: string }
export interface JourneyGuidance { status: "potential" | "review"; title: string; detail: string; sources: { title: string; url: string }[] }

export const intakeQuestions = (questions: CatalogQuestion[]): IntakeQuestion[] =>
  questions.map(question => ({ id: question.id, kind: questionKind(question), text: text(question.prompt, "es") }));

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
  return {
    status: "review",
    title: "Este trámite podría no aplicar a tu caso",
    detail: ["Según tus respuestas, este servicio podría no ser el adecuado. Un asesor puede revisarlo contigo.", ...notices, "Puedes continuar al siguiente vídeo."].join(" "),
    sources: [],
  };
}
