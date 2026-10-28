/* «Tu caso en resumen» (28-10-2026): each question the person answered, short, with the answer in words. The data screen
   shows it as a card instead of leaving the result inside the assistant's last sentence. */
import type { IntakeQuestion } from "./service-intake";

export type SummaryItem = { id: string; question: string; answer: string };
/** A script question the bot let go after a second try (lib/agent/service-scripts.ts uses it too). */
export const SKIPPED = "SIN_RESPUESTA";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** The question itself, without what goes around it: «Para empezar, ¿en qué país naciste? Cuenta…» → «¿En qué país naciste?». */
export function shortQuestion(question: IntakeQuestion) {
  const text = question.retryText ?? question.text;
  const end = text.indexOf("?");
  if (end < 0) return text.trim();
  const start = text.lastIndexOf("¿", end);
  const asked = text.slice(start < 0 ? 0 : start, end + 1).trim();
  return asked.charAt(0) === "¿" ? `¿${asked.charAt(1).toUpperCase()}${asked.slice(2)}` : asked;
}

/** The answer in words: «Sí», the option's label, «15 de marzo de 2024»… */
export function answerLabel(question: IntakeQuestion, value: unknown): string | null {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.map(item => answerLabel(question, item)).filter(Boolean).join(", ") || null;
  if (typeof value !== "string" || !value.trim()) return null;
  if (value === "UNKNOWN") return question.unknownLabel ?? (question.kind === "state" ? "Aún no lo sé" : "No la sé");
  const option = question.options?.find(item => item.code === value);
  if (option) return option.label;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (date) return `${Number(date[3])} de ${MONTHS[Number(date[2]) - 1]} de ${date[1]}`;
  return value.length > 120 ? `${value.slice(0, 118).trim()}…` : value;
}

/** The summary with this answer in it (a corrected answer replaces the old one, in its place). */
export function withAnswer(summary: SummaryItem[] | undefined, question: IntakeQuestion, value: unknown): SummaryItem[] {
  const answer = answerLabel(question, value);
  const list = summary ?? [];
  if (!answer) return list;
  const item = { id: question.id, question: shortQuestion(question), answer };
  return list.some(entry => entry.id === question.id) ? list.map(entry => entry.id === question.id ? item : entry) : [...list, item];
}
