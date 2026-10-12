/* ============================================================
   Elegir entre variantes de un servicio (Visa Juvenil Básico o Premium)
   La conversación guarda sus respuestas con los ids de las preguntas del servicio del chat.
   Si la variante elegida hace la misma pregunta (mismo texto y tipo) y la respuesta le sirve,
   se reutiliza; lo que falte lo pide la ficha del contrato. contygo vuelve a evaluar al contratar.
   ============================================================ */
import { normalizeAnswer, text } from "./checkout";
import type { PublicServiceView } from "./catalog";
import type { AnswerValue } from "./types";

export type ContractQuestion = PublicServiceView["questions"][number];

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sameQuestion = (a: ContractQuestion, b: ContractQuestion) => a.kind === b.kind && fold(text(a.prompt)) === fold(text(b.prompt));

/** The answers for `target`, reusing those given to an identical question in `sources`. Nothing else changes. */
export function carryAnswers(target: ContractQuestion[], sources: ContractQuestion[], answers: Record<string, AnswerValue> = {}): Record<string, AnswerValue> {
  const carried = { ...answers };
  for (const question of target) {
    if (carried[question.id] !== undefined) continue;
    const match = sources.find(source => answers[source.id] !== undefined && sameQuestion(source, question));
    const value = match ? normalizeAnswer(question, answers[match.id]) : null;
    if (value !== null) carried[question.id] = value;
  }
  return carried;
}

/** The questions of the chosen service that still have no answer. */
export const missingQuestions = (questions: ContractQuestion[], answers: Record<string, AnswerValue> = {}) =>
  questions.filter(question => answers[question.id] === undefined);
