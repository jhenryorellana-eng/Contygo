/* ============================================================
   Reforzamiento de Asilo: ¿todavía hay tiempo de presentar pruebas?
   Las preguntas del dueño (10-10-2026), en su orden:
   1. ¿Defensivo (ante un juez de inmigración) o afirmativo (ante un oficial de asilo de USCIS)?
   2. ¿Personal o familiar? Solo se guarda: el precio y el resto del flujo no cambian.
   3. La fecha de la próxima audiencia (defensivo) o de la entrevista (afirmativo). Es la pregunta de
      fecha del catálogo de contygo cuando existe: su respuesta va a contygo tal cual.
   4. Solo defensivo: el tipo de audiencia (Preliminar 1, Preliminar 2 o Mérito final).
   Los plazos (docs/evidencia-reforzamiento-asilo.md):
   - Corte: las pruebas se entregan al menos 30 días antes de la audiencia individual (mérito final).
   - USCIS: todas las pruebas, 14 días antes de la entrevista (desde el 21-08-2026).
   Con el plazo vencido o sin fecha, el contrato lo prepara un asesor por WhatsApp; si el mérito final
   ya está encima, el agente presenta además la Apelación.
   Sus claves llevan «asilo.»: no salen hacia contygo (solo las del catálogo).
   ============================================================ */
import { normalizeAnswer } from "@/lib/contygo-api/checkout";
import type { AnswerValue, CatalogQuestion, EligibilityResult } from "@/lib/contygo-api/types";
import { dayLabel, parseWrittenDate } from "./adjustment-intake";
import { normalizeIntakeAnswer, type IntakeQuestion, type JourneyGuidance, type ServiceAnswers } from "./service-intake";

export const ASYLUM_SERVICE = "reforzar-asilo";
export const TRACK_FIELD = "asilo.tipo";
export const SCOPE_FIELD = "asilo.alcance";
export const HEARING_FIELD = "asilo.audiencia";
/** Sin la pregunta de fecha en el catálogo de contygo (catálogos anteriores al 10-10-2026), la fecha vive aquí. */
export const LOCAL_DATE_FIELD = "asilo.fecha";
/** La persona aún no tiene fecha: la pregunta de fecha queda sin responder (a contygo nunca va una fecha inventada). */
export const NO_DATE_FIELD = "asilo.sinFecha";
export const NO_DATE = "UNKNOWN";
/** EOIR, manual de las cortes 2.1(b)(2): pruebas al menos 30 días antes de la audiencia individual. */
export const COURT_EVIDENCE_DAYS = 30;
/** USCIS (desde el 21-08-2026): todas las pruebas 14 días antes de la entrevista. */
export const USCIS_EVIDENCE_DAYS = 14;

export const EOIR_DEADLINES_URL = "https://www.justice.gov/eoir/policy-manual-eoir/part-II/icpm/chapter-2-1";
export const USCIS_ASYLUM_URL = "https://www.uscis.gov/humanitarian/refugees-and-asylum/asylum";
export const BIA_APPEAL_URL = "https://www.ecfr.gov/current/title-8/chapter-V/subchapter-A/part-1003/subpart-C/section-1003.38";

export type Track = "defensivo" | "afirmativo";
export type Scope = "personal" | "familiar";
export type Hearing = "preliminar-1" | "preliminar-2" | "merito";

// ---------------- Preguntas ----------------

export const TRACK_QUESTION = "¿Tu asilo es defensivo, ante un juez de inmigración, o afirmativo, ante un oficial de asilo de USCIS?";
export const SCOPE_QUESTION = "¿Tu asilo es personal o familiar, es decir, incluye a tu pareja o a tus hijos?";
export const COURT_DATE_QUESTION = "¿Cuándo es tu próxima audiencia en la corte de inmigración? Dímela o escríbela.";
export const INTERVIEW_DATE_QUESTION = "¿Cuándo es tu entrevista de asilo en USCIS? Está en tu aviso de entrevista. Dímela o escríbela.";
export const HEARING_QUESTION = "¿Qué tipo de audiencia es: preliminar 1, preliminar 2 o de mérito final, la audiencia individual donde el juez decide tu caso?";
export const NO_DATE_LABEL = "Aún no tengo fecha";
const OPTIONS = {
  [TRACK_FIELD]: [{ code: "defensivo", label: "Defensivo · ante un juez" }, { code: "afirmativo", label: "Afirmativo · ante USCIS" }],
  [SCOPE_FIELD]: [{ code: "personal", label: "Personal" }, { code: "familiar", label: "Familiar" }],
  [HEARING_FIELD]: [{ code: "preliminar-1", label: "Preliminar 1" }, { code: "preliminar-2", label: "Preliminar 2" }, { code: "merito", label: "Mérito final" }],
};

const choice = (id: keyof typeof OPTIONS, text: string): IntakeQuestion => ({ id, kind: "choice", text, options: OPTIONS[id] });
const dateQuestion = (id: string, track: Track | null): IntakeQuestion => ({
  id, kind: "date", dateMode: "future_event", allowUnknown: true, unknownLabel: NO_DATE_LABEL,
  text: track === "afirmativo" ? INTERVIEW_DATE_QUESTION : COURT_DATE_QUESTION,
  retryText: track === "afirmativo" ? "¿Cuándo es tu entrevista de asilo en USCIS?" : "¿Cuándo es tu próxima audiencia en la corte de inmigración?",
});

/** La pregunta de fecha del catálogo de contygo («¿Cuál es la fecha de su próxima audiencia en corte?»). */
export const isHearingDateQuestion = (question: Pick<CatalogQuestion, "kind" | "dateMode">) =>
  question.kind === "date" && question.dateMode === "future_event";

// ---------------- Respuestas ----------------

const fold = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim();
/** Lo que la persona escribe o dice, sin pasar por Gemini. Si coinciden dos opciones, no se adivina. */
const WORDS: Record<string, [RegExp, string][]> = {
  [TRACK_FIELD]: [[/\b(defensiv|juez|corte)/, "defensivo"], [/\b(afirmativ|uscis|oficial)/, "afirmativo"]],
  [SCOPE_FIELD]: [[/\b(personal|solo yo|solo para mi|solo mio)\b/, "personal"], [/\b(familiar|familia|pareja|espos[ao]|hij[oa]s?)\b/, "familiar"]],
  [HEARING_FIELD]: [
    [/^(1|uno)$|\bpreliminar (1|uno|una)\b|\bprimera\b/, "preliminar-1"],
    [/^(2|dos)$|\bpreliminar (2|dos)\b|\bsegunda\b/, "preliminar-2"],
    [/\b(merito|meritos|final|individual)\b/, "merito"],
  ],
};
const NO_DATE_WORDS = /^(aun |todavia )?no (tengo|me (han )?(dado|dan|asignado)|hay|se)( (la |una )?fecha)?\b|^sin fecha\b|^no (la )?(se|tengo)\b/;

/** Las respuestas de las preguntas de asilo; las demás del catálogo, con sus reglas de siempre. */
export function normalizeAsylumAnswer(question: IntakeQuestion, value: unknown): AnswerValue | null {
  if (question.kind === "choice") {
    if (typeof value !== "string" || value.length > 200) return null;
    if (question.options?.some(option => option.code === value)) return value;
    const text = fold(value);
    const codes = new Set((WORDS[question.id] ?? []).filter(([pattern]) => pattern.test(text)).map(([, code]) => code));
    return codes.size === 1 ? Array.from(codes)[0] : null;
  }
  if (question.kind === "date" && question.allowUnknown) {
    if (value === NO_DATE) return NO_DATE;
    if (typeof value !== "string" || value.length > 60) return null;
    if (NO_DATE_WORDS.test(fold(value))) return NO_DATE;
    const written = /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : parseWrittenDate(value, { dateMode: "future_event" });
    return normalizeAnswer({ kind: "date", dateMode: "future_event" }, written ?? value);
  }
  return normalizeIntakeAnswer(question, value);
}

// ---------------- Plazos ----------------

const todayYmd = () => new Date().toISOString().slice(0, 10);
const shiftDays = (ymd: string, days: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
/**
 * Corte: el día de la audiencia es el «día 0» y se cuentan días naturales hacia atrás. Si el plazo cae en
 * sábado o domingo, pasa al siguiente día hábil (manual de las cortes, 2.1(c)(B)). Los feriados no se
 * cuentan aquí: el día que se dice es igual o anterior al oficial, nunca posterior.
 */
export function courtDeadline(hearing: string) {
  const deadline = shiftDays(hearing, -COURT_EVIDENCE_DAYS);
  const weekday = new Date(`${deadline}T00:00:00Z`).getUTCDay();
  return weekday === 6 ? shiftDays(deadline, 2) : weekday === 0 ? shiftDays(deadline, 1) : deadline;
}
/** USCIS: 14 días naturales antes de la entrevista (su página no menciona fines de semana). */
export const interviewDeadline = (interview: string) => shiftDays(interview, -USCIS_EVIDENCE_DAYS);

export interface AsylumVerdict {
  status: "time" | "late" | "nodate";
  track: Track;
  scope: Scope;
  hearing: Hearing | null;
  date: string | null;
  /** El último día para entregar pruebas; null si la próxima audiencia es preliminar o aún no hay fecha. */
  deadline: string | null;
}

const pick = (id: keyof typeof OPTIONS, value: unknown) => typeof value === "string" && OPTIONS[id].some(option => option.code === value) ? value : null;
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Las preguntas de asilo en orden, las respuestas que siguen en juego (consecutivas y válidas) y el veredicto
 * (null mientras falte algo). dateId: el id de la pregunta de fecha del catálogo de contygo, o la local.
 */
export function asylumFlow(input: unknown, dateId: string = LOCAL_DATE_FIELD, today = todayYmd()): { questions: IntakeQuestion[]; answers: ServiceAnswers; verdict: AsylumVerdict | null } {
  const raw = isRecord(input) ? input : {};
  const track = pick(TRACK_FIELD, raw[TRACK_FIELD]) as Track | null;
  const scope = track ? pick(SCOPE_FIELD, raw[SCOPE_FIELD]) as Scope | null : null;
  const noDate = Boolean(scope) && (raw[NO_DATE_FIELD] === true || raw[dateId] === NO_DATE);
  const questions = [choice(TRACK_FIELD, TRACK_QUESTION), choice(SCOPE_FIELD, SCOPE_QUESTION),
    ...(noDate ? [] : [dateQuestion(dateId, track), ...(track === "afirmativo" ? [] : [choice(HEARING_FIELD, HEARING_QUESTION)])])];
  const answers: ServiceAnswers = {};
  if (!track) return { questions, answers, verdict: null };
  answers[TRACK_FIELD] = track;
  if (!scope) return { questions, answers, verdict: null };
  answers[SCOPE_FIELD] = scope;
  const base = { track, scope, hearing: null, date: null, deadline: null };
  if (noDate) { answers[NO_DATE_FIELD] = true; return { questions, answers, verdict: { ...base, status: "nodate" } }; }
  const date = normalizeAnswer({ kind: "date", dateMode: "future_event" }, raw[dateId], today);
  if (typeof date !== "string") return { questions, answers, verdict: null };
  answers[dateId] = date;
  if (track === "afirmativo") {
    const deadline = interviewDeadline(date);
    return { questions, answers, verdict: { ...base, date, deadline, status: today > deadline ? "late" : "time" } };
  }
  const hearing = pick(HEARING_FIELD, raw[HEARING_FIELD]) as Hearing | null;
  if (!hearing) return { questions, answers, verdict: null };
  answers[HEARING_FIELD] = hearing;
  // Una audiencia preliminar: la final aún no llega, así que todavía hay tiempo.
  if (hearing !== "merito") return { questions, answers, verdict: { ...base, hearing, date, status: "time" } };
  const deadline = courtDeadline(date);
  return { questions, answers, verdict: { ...base, hearing, date, deadline, status: today > deadline ? "late" : "time" } };
}

// ---------------- Al terminar ----------------

/**
 * Lo que el navegador guarda: decide el cierre del segundo vídeo y la ficha del contrato.
 * «soon»: hay tiempo para la final, pero contygo no deja contratar en línea (la próxima audiencia es en menos de
 * 5 días hábiles, probado el 10-10-2026). advisor: el contrato lo prepara un asesor. appeal: se presenta la Apelación.
 */
export type AsylumKind = "time" | "soon" | "late" | "nodate";
export interface AsylumOutcome { kind: AsylumKind; track: Track; scope: Scope; hearing: Hearing | null; date: string | null; deadline: string | null; advisor: boolean; appeal: boolean }

export function asylumOutcome(verdict: AsylumVerdict, result: EligibilityResult | null | undefined, dateId: string): AsylumOutcome {
  const tooClose = Boolean(result?.disqualified?.some(item => item.questionId === dateId && item.reason === "event_too_close"));
  const kind: AsylumKind = verdict.status === "time" && tooClose ? "soon" : verdict.status;
  return { kind, track: verdict.track, scope: verdict.scope, hearing: verdict.hearing, date: verdict.date, deadline: verdict.deadline, advisor: kind !== "time", appeal: kind === "late" && verdict.track === "defensivo" };
}

const INVITE = "Te invito a hacer tu contrato con nosotros; en el siguiente vídeo te mostramos cómo te acompañamos.";
const NEXT_VIDEO = "En el siguiente vídeo te mostramos cómo te acompañamos.";
const CONGRATS = "¡Felicitaciones! Todavía tienes tiempo de presentar tu reforzamiento de asilo";

/** Lo último que dice el agente antes del segundo vídeo. */
export function asylumFinish(outcome: AsylumOutcome) {
  const { kind, track, date, deadline } = outcome;
  if (kind === "late") return track === "afirmativo"
    ? `Tu entrevista es el ${dayLabel(date!)}, y USCIS solo recibe pruebas hasta 14 días antes: las que lleguen después pueden quedar fuera. Un asesor revisará tu caso contigo por WhatsApp. ${NEXT_VIDEO}`
    : `Tu audiencia final es el ${dayLabel(date!)}, y las pruebas solo se reciben hasta 30 días antes: ya no hay tiempo de presentar el reforzamiento. Un asesor revisará tu caso contigo por WhatsApp. Si el juez niega tu asilo, el plazo para apelar es corto, y con nuestra Apelación te acompañamos.`;
  if (kind === "soon") return `Todavía tienes tiempo antes de tu audiencia final, pero tu próxima audiencia es en pocos días. Un asesor revisará tu caso contigo por WhatsApp para empezar cuanto antes. ${NEXT_VIDEO}`;
  const rule = track === "afirmativo" ? "USCIS recibe las pruebas hasta 14 días antes de tu entrevista" : "las pruebas se pueden entregar hasta 30 días antes de tu audiencia final";
  if (kind === "nodate") return `${CONGRATS}: ${rule}. Como aún no tienes fecha, un asesor preparará tu contrato contigo por WhatsApp. ${NEXT_VIDEO}`;
  return `${CONGRATS}: ${rule}${deadline ? `, es decir, hasta el ${dayLabel(deadline)}` : ""}. ${INVITE}`;
}

const LEGAL = "Esta orientación no es asesoría legal.";
const COURT_RULE = "Según el manual de las cortes de inmigración, para la audiencia individual (de mérito final) las pruebas se entregan al menos 30 días antes.";
const JUDGE_RULE = "Si estás detenido o el juez fijó otro plazo, vale el que indique el juez.";
const USCIS_RULE = "Según USCIS, desde el 21 de agosto de 2026 todas las pruebas se entregan a la oficina de asilo 14 días antes de la entrevista; las que lleguen después pueden no incluirse o la entrevista puede reprogramarse.";
const APPEAL_RULE = "Si el juez niega el asilo, la apelación ante la BIA se presenta dentro de los 30 días siguientes a su decisión, o de 10 si lo niega por una de las causas de la sección 208(a)(2)(A)-(C) de la ley, como el plazo de un año.";
const CONTRACT = "Con tus respuestas, puedes preparar tu contrato al final del recorrido.";
const ADVISOR = "Un asesor revisa tu caso contigo por WhatsApp.";

/** Orientación del final («Ver mi orientación inicial»): el plazo que aplica, sus fuentes y el siguiente paso. */
export function asylumGuidance(outcome: AsylumOutcome, result: EligibilityResult | null | undefined): JourneyGuidance {
  const notices = (result?.notices ?? []).map(notice => notice.message?.es).filter((value): value is string => Boolean(value));
  const court = outcome.track === "defensivo";
  const sources = [
    court ? { title: "EOIR · Manual de las cortes de inmigración, 2.1 (plazos para presentar)", url: EOIR_DEADLINES_URL } : { title: "USCIS · Asilo (pruebas antes de la entrevista)", url: USCIS_ASYLUM_URL },
    ...(outcome.appeal ? [{ title: "8 CFR 1003.38 · Plazo para apelar ante la BIA", url: BIA_APPEAL_URL }] : []),
  ];
  const rules = court ? [COURT_RULE, JUDGE_RULE] : [USCIS_RULE];
  const when = outcome.date && outcome.deadline
    ? `Para tu ${court ? "audiencia" : "entrevista"} del ${dayLabel(outcome.date)}, el plazo ${outcome.kind === "late" ? "venció" : "vence"} el ${dayLabel(outcome.deadline)}.` : null;
  const guidance = (status: JourneyGuidance["status"], title: string, lines: (string | null)[]): JourneyGuidance =>
    ({ status, title, detail: [...lines.filter((line): line is string => Boolean(line)), ...notices, LEGAL].join(" "), sources });
  if (outcome.kind === "late") return court
    ? guidance("review", "Tu audiencia final está muy cerca", [...rules, when, ADVISOR, APPEAL_RULE])
    : guidance("review", "Tu entrevista está muy cerca", [...rules, when, ADVISOR]);
  if (outcome.kind === "soon") return guidance("review", "Revisemos tu caso cuanto antes", [...rules, "Tu próxima audiencia es en pocos días.", ADVISOR]);
  if (outcome.kind === "nodate") return guidance("review", "Todavía tienes tiempo de reforzar tu asilo", [...rules, `Cuando tengas la fecha de tu ${court ? "audiencia" : "entrevista"}, el plazo se cuenta desde ella.`, "Un asesor prepara tu contrato contigo por WhatsApp."]);
  const preliminary = court && outcome.hearing !== "merito" ? "Tu próxima audiencia es preliminar: todavía puedes reforzar tu caso antes de la final." : null;
  return guidance("potential", "Todavía tienes tiempo de reforzar tu asilo", [...rules, when ?? preliminary, CONTRACT]);
}

/** Locuciones públicas (sin datos de la persona) para precargar durante el vídeo. Los cierres con fecha se generan al momento. */
export const asylumVoiceScripts = () => {
  const outcome = (kind: AsylumKind, track: Track): AsylumOutcome => ({ kind, track, scope: "personal", hearing: track === "defensivo" ? "preliminar-1" : null, date: null, deadline: null, advisor: kind !== "time", appeal: false });
  return [
    ...[SCOPE_QUESTION, COURT_DATE_QUESTION, INTERVIEW_DATE_QUESTION, HEARING_QUESTION].map(text => `Gracias. ${text}`),
    asylumFinish(outcome("time", "defensivo")), asylumFinish(outcome("soon", "defensivo")),
    asylumFinish(outcome("nodate", "defensivo")), asylumFinish(outcome("nodate", "afirmativo")),
  ];
};
