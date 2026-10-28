/* ============================================================
   Preparación de audiencia con Henry Orellana: ¿qué preparación le toca?
   Criterio de links.usalatinoprime.com/asesoria (12-10-2026): «La de tu próxima cita en la corte. Si es una
   audiencia preliminar, la segunda; si es tu audiencia de mérito, donde se presenta tu caso completo, la tercera.»
   Las preguntas que aprobó el dueño (12-10-2026), en su orden:
   1. ¿Tiene una audiencia programada en la corte de inmigración? Sin audiencia, Henry orienta por WhatsApp.
   2. ¿Cuándo es? («No la tengo a mano» vale). Solo sirve para avisar si es en muy pocos días.
   3. ¿Es la de mérito? Sí → la preparación para la tercera audiencia; no → la de la segunda (preliminar).
   Sus claves llevan «audiencia.»: no salen hacia contygo. Contygo hace dos preguntas propias (14-10-2026): la fecha
   de la próxima audiencia (future_event, 7 días de antelación) y «¿En qué audiencia se encuentra?» (single_choice, que
   limita el paquete: Segunda → $150, Tercera → $350). No se repiten: sus respuestas salen de las de este chat
   (hearingRemoteAnswers). Con «No la tengo a mano» la fecha queda sin responder y la pide la ficha del contrato.
   ============================================================ */
import { normalizeAnswer, questionKind, text } from "@/lib/contygo-api/checkout";
import type { AnswerValue, CatalogQuestion, EligibilityResult, I18nText } from "@/lib/contygo-api/types";
import { dayLabel } from "./adjustment-intake";
import { NO_DATE, isHearingDateQuestion, normalizeAsylumAnswer } from "./asylum-intake";
import type { IntakeQuestion, JourneyGuidance, ServiceAnswers } from "./service-intake";

export const HEARING_SERVICE = "preparacion-audiencia";
export const HAS_FIELD = "audiencia.tiene";
export const DATE_FIELD = "audiencia.fecha";
export const MERIT_FIELD = "audiencia.merito";
export { NO_DATE };
export const NO_DATE_LABEL = "No la tengo a mano";
/** A hearing this close (in days): book right away, the session needs a free hour with Henry. */
export const SOON_DAYS = 3;
export const HENRY_FAQ_URL = "https://links.usalatinoprime.com/asesoria";

export const HAS_QUESTION = "¿Tienes una audiencia programada en la corte de inmigración?";
export const DATE_QUESTION = "¿Cuándo es tu próxima audiencia? Dímela o escríbela.";
export const MERIT_QUESTION = "¿Esa audiencia es la de mérito, donde se presenta tu caso completo?";

const HAS: IntakeQuestion = { id: HAS_FIELD, kind: "yesno", text: HAS_QUESTION };
const WHEN: IntakeQuestion = { id: DATE_FIELD, kind: "date", dateMode: "future_event", allowUnknown: true, unknownLabel: NO_DATE_LABEL, text: DATE_QUESTION, retryText: "¿Cuándo es tu próxima audiencia?" };
const MERIT: IntakeQuestion = { id: MERIT_FIELD, kind: "yesno", text: MERIT_QUESTION };

/** The same rules as Reforzamiento de Asilo: a future date written, said or picked (or «no la tengo a mano»), and yes/no. */
export const normalizeHearingAnswer = normalizeAsylumAnswer;

export type HearingKind = "segunda" | "tercera" | "none";
/** What the browser keeps: it decides the closing, the contract package and, without a hearing, WhatsApp with Henry.
 *  `tooClose`: contygo needs more notice than the hearing leaves (event_too_close): Henry takes it on WhatsApp. */
export interface HearingOutcome { kind: HearingKind; date: string | null; soon: boolean; advisor: boolean; tooClose?: boolean }

const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** The questions in play, the answers that still count (consecutive and valid) and the outcome (null while something is missing). */
export function hearingFlow(input: unknown, today = todayYmd()): { questions: IntakeQuestion[]; answers: ServiceAnswers; outcome: HearingOutcome | null } {
  const raw = isRecord(input) ? input : {};
  const has = typeof raw[HAS_FIELD] === "boolean" ? raw[HAS_FIELD] as boolean : null;
  const questions = has === false ? [HAS] : [HAS, WHEN, MERIT];
  const answers: ServiceAnswers = {};
  if (has === null) return { questions, answers, outcome: null };
  answers[HAS_FIELD] = has;
  if (!has) return { questions, answers, outcome: { kind: "none", date: null, soon: false, advisor: true } };
  const date = raw[DATE_FIELD] === NO_DATE ? NO_DATE : normalizeAnswer({ kind: "date", dateMode: "future_event" }, raw[DATE_FIELD], today);
  if (typeof date !== "string") return { questions, answers, outcome: null };
  answers[DATE_FIELD] = date;
  if (typeof raw[MERIT_FIELD] !== "boolean") return { questions, answers, outcome: null };
  const merit = raw[MERIT_FIELD] as boolean;
  answers[MERIT_FIELD] = merit;
  const known = date === NO_DATE ? null : date;
  return { questions, answers, outcome: { kind: merit ? "tercera" : "segunda", date: known, soon: Boolean(known && daysBetween(today, known) <= SOON_DAYS), advisor: false } };
}

// ---------------- Las preguntas de contygo ----------------

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const KIND_WORDS: Record<Exclude<HearingKind, "none">, RegExp> = { segunda: /segunda|preliminar/, tercera: /tercera|merito/ };
const optionWords = (option: NonNullable<CatalogQuestion["options"]>[number]) =>
  fold([option.code, ...[option.name, option.label].map(value => typeof value === "string" ? value : value && typeof value === "object" ? text(value as I18nText) : "")].join(" "));

/** The option of contygo's «¿En qué audiencia se encuentra?» for a hearing kind, if exactly one fits. */
export function hearingOption(question: CatalogQuestion, kind: Exclude<HearingKind, "none">): string | null {
  const fits = (question.options ?? []).filter(option => KIND_WORDS[kind].test(optionWords(option)));
  return fits.length === 1 ? fits[0].code : null;
}

/** Which of contygo's questions this chat answers: the hearing date (future_event) and the hearing kind (single_choice
 *  whose options name the second and the third hearing). Found by kind and options, never by position or id. */
export function hearingRemoteQuestions(questions: CatalogQuestion[]): { date?: CatalogQuestion; choice?: CatalogQuestion } {
  const date = questions.find(isHearingDateQuestion);
  const choice = questions.find(question => questionKind(question) === "choice" && hearingOption(question, "segunda") && hearingOption(question, "tercera"));
  return { ...(date ? { date } : {}), ...(choice ? { choice } : {}) };
}

/** contygo's answers, derived from this chat's: the date (unless «No la tengo a mano») and the hearing kind. */
export function hearingRemoteAnswers(answers: ServiceAnswers, remote: ReturnType<typeof hearingRemoteQuestions>): Record<string, AnswerValue> {
  const out: Record<string, AnswerValue> = {};
  if (answers[HAS_FIELD] !== true) return out;
  const date = answers[DATE_FIELD];
  if (remote.date && typeof date === "string" && date !== NO_DATE) out[remote.date.id] = date;
  const merit = answers[MERIT_FIELD];
  const code = remote.choice && typeof merit === "boolean" ? hearingOption(remote.choice, merit ? "tercera" : "segunda") : null;
  if (remote.choice && code) out[remote.choice.id] = code;
  return out;
}

const NEXT_VIDEO = "En el siguiente vídeo te mostramos cómo te acompañamos.";
/** contygo disqualifies a hearing that leaves less notice than its date question asks (event_too_close; 7 days on 14-10-2026). */
export const TOO_CLOSE_LINE = "Tu audiencia es muy pronto para reservar la preparación en línea: Henry necesita al menos 7 días para prepararla contigo. Escríbele por WhatsApp y él te dice qué hacer.";
const PLAN_LINE: Record<Exclude<HearingKind, "none">, string> = {
  tercera: "Te corresponde la preparación para tu tercera audiencia, la de mérito: 45 minutos con Henry para recorrer tu historia y practicar las preguntas más difíciles.",
  segunda: "Te corresponde la preparación para tu segunda audiencia, la preliminar: 45 minutos con Henry para repasar qué pasa ese día, ordenar tus preguntas y practicar con calma.",
};

/** The agent's last line before the second film. */
export function hearingFinish(outcome: HearingOutcome) {
  if (outcome.kind === "none") return `Esta preparación es para quien ya tiene una audiencia en la corte de inmigración. Henry puede orientarte por WhatsApp sobre tu caso. ${NEXT_VIDEO}`;
  if (outcome.tooClose) return `${TOO_CLOSE_LINE} ${NEXT_VIDEO}`;
  const soon = outcome.soon && outcome.date ? ` Tu audiencia es el ${dayLabel(outcome.date)}: reserva tu sesión cuanto antes.` : "";
  return `${PLAN_LINE[outcome.kind]}${soon} ${NEXT_VIDEO}`;
}

const LEGAL = "Henry es consultor migratorio certificado en el estado de Utah, no abogado: la sesión es orientación personal y no incluye representación legal.";
const UNSURE = "Si no estás seguro de cuál es tu audiencia, escríbele a Henry antes de reservar.";

/** The orientation at the end («Ver mi orientación inicial»): which preparation fits and why. */
export function hearingGuidance(outcome: HearingOutcome, result?: EligibilityResult | null): JourneyGuidance {
  const notices = (result?.notices ?? []).map(notice => notice.message?.es).filter((value): value is string => Boolean(value));
  const sources = [{ title: "Preparación de audiencia con Henry Orellana · Preguntas frecuentes", url: HENRY_FAQ_URL }];
  const guidance = (status: JourneyGuidance["status"], title: string, lines: (string | null)[]): JourneyGuidance =>
    ({ status, title, detail: [...lines.filter((line): line is string => Boolean(line)), ...notices, LEGAL].join(" "), sources });
  if (outcome.tooClose) return guidance("review", "Tu audiencia es muy pronto: escríbele a Henry", [TOO_CLOSE_LINE]);
  if (outcome.kind === "none") return guidance("review", "Escríbele a Henry antes de reservar", ["Esta preparación es para una audiencia ya programada en la corte de inmigración: la segunda (preliminar) o la de mérito.", "Si aún no tienes una, Henry te orienta por WhatsApp."]);
  const soon = outcome.soon && outcome.date ? `Tu audiencia es el ${dayLabel(outcome.date)}: reserva tu sesión cuanto antes.` : null;
  return outcome.kind === "tercera"
    ? guidance("potential", "Te corresponde la preparación para la tercera audiencia", ["Tu próxima audiencia es la de mérito, donde se presenta tu caso completo. En 45 minutos con Henry recorren tu historia de principio a fin, practicas las preguntas más difíciles y llegas con un plan claro.", soon, "Puedes preparar tu contrato al final del recorrido.", UNSURE])
    : guidance("potential", "Te corresponde la preparación para la segunda audiencia", ["Tu próxima audiencia es preliminar. En 45 minutos con Henry repasan qué pasa ese día y en qué orden, ordenas tus preguntas y practicas cómo responder con calma.", soon, "Puedes preparar tu contrato al final del recorrido.", UNSURE]);
}

/** Public lines (no personal data) to warm while the page loads. A closing with a date is generated when it happens. */
export const hearingVoiceScripts = () => [
  `Gracias. ${DATE_QUESTION}`, `Gracias. ${MERIT_QUESTION}`,
  ...(["none", "segunda", "tercera"] as const).map(kind => hearingFinish({ kind, date: null, soon: false, advisor: kind === "none" })),
];
