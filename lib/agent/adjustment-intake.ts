/* ============================================================
   Ajuste de estatus I-485 (SIJ): la fecha de prioridad
   contygo pregunta «¿La fecha de prioridad del I-360 está vigente en el Visa Bulletin
   (EB-4)?», y casi nadie sabe responderla. Aquí el agente pregunta la FECHA, explica qué
   es y la compara con la tabla que USCIS indica ese mes (lib/agent/visa-bulletin.ts).
   La respuesta a contygo sale de esa comparación: nunca se adivina.
   - Vigente → invita a contratar (el segundo vídeo lo detalla).
   - Aún no → recomienda el contrato previo, por sus garantías y la oferta del segundo vídeo,
     con un tono distinto si la fecha está próxima (≤ NEAR_MONTHS) o todavía en el futuro.
   Sus claves llevan «ajuste.»: no salen hacia contygo (solo las del catálogo).
   Fuentes y decisiones: docs/evidencia-fecha-de-prioridad.md.
   ============================================================ */
import { isPastOrTodayDate } from "@/lib/contygo-api/checkout";
import type { CatalogQuestion, EligibilityResult } from "@/lib/contygo-api/types";
import type { IntakeQuestion, JourneyGuidance, ServiceAnswers } from "./service-intake";
import { USCIS_PRIORITY_DATES_URL, type BulletinColumn, type Eb4Bulletin } from "./visa-bulletin";

export const ADJUSTMENT_SERVICE = "i-485";
export const PRIORITY_FIELD = "ajuste.priorityDate";
const BORN_PREFIX = "ajuste.nacio.";
export const PRIORITY_UNKNOWN = "UNKNOWN";
/** USCIS empezó a asignar fechas de prioridad SIJ mucho después; antes de esto es un error de tecleo. */
const OLDEST_PRIORITY_DATE = "1990-01-01";

export type PriorityStatus = "current" | "waiting" | "unknown";
export interface PriorityVerdict {
  status: PriorityStatus;
  /** unknown: «date» = la persona no tiene la fecha a mano; «bulletin» = no hay boletín confiable este mes. */
  reason?: "date" | "bulletin";
  column: BulletinColumn | null;
  /** La columna no es la general (la persona nació en un país con fecha propia). */
  country: string | null;
  /** waiting: la fecha está próxima (a NEAR_MONTHS o menos de la del boletín) y a cuántos meses. */
  near?: boolean;
  gapMonths?: number;
}
/** Lo que el navegador guarda al terminar: decide el cierre del segundo vídeo y la ficha del contrato. */
export interface PriorityOutcome { status: PriorityStatus; reason?: "date" | "bulletin"; near?: boolean; month: string | null; previo: boolean }

/**
 * Hasta cuántos meses después de la fecha del boletín la fecha es «próxima».
 * APUESTA: ninguna fuente oficial define «próxima». EB-4 se movió así según USCIS: «U» (sin visas) de
 * abril a septiembre de 2025, retroceso de 2021 a 2019 en marzo de 2025, y de 2021-02-15 (oct. 2025) a
 * 2025-01-01 (oct. 2026). Seis meses es un margen corto frente a ese vaivén. Se cambia aquí.
 */
export const NEAR_MONTHS = 6;

/** Meses que la fecha de prioridad va por detrás de la fecha de corte (un mes empezado cuenta entero). */
export function monthsAfter(cutoff: string, date: string) {
  const [cy, cm, cd] = cutoff.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  return Math.max(0, (y - cy) * 12 + (m - cm) + (d > cd ? 1 : 0));
}

/** La pregunta del catálogo de contygo que esta conversación responde sola. */
export const isBulletinQuestion = (question: Pick<CatalogQuestion, "kind" | "prompt">) =>
  question.kind === "yes_no" && (/fecha de prioridad/i.test(question.prompt?.es ?? "") || /priority date/i.test(question.prompt?.en ?? ""));

// ---------------- Textos ----------------

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** "2026-10" → «octubre de 2026». */
export const monthLabel = (month: string) => { const [year, number] = month.split("-"); return `${MONTH_NAMES[Number(number) - 1]} de ${year}`; };
/** "2025-01-01" → «1 de enero de 2025». */
export const dayLabel = (ymd: string) => { const [year, month, day] = ymd.split("-"); return `${Number(day)} de ${MONTH_NAMES[Number(month) - 1]} de ${year}`; };

const COUNTRY_NAMES: [RegExp, string][] = [
  [/el salvador|guatemala|honduras/i, "El Salvador, Guatemala u Honduras"],
  [/china/i, "China continental"],
  [/india/i, "India"],
  [/mexico/i, "México"],
  [/philippines/i, "Filipinas"],
  [/vietnam/i, "Vietnam"],
];
const countryName = (header: string) => COUNTRY_NAMES.find(([pattern]) => pattern.test(header))?.[1] ?? header.toLowerCase().replace(new RegExp("(^|\\s)(\\p{L})", "gu"), (_, space: string, letter: string) => space + letter.toUpperCase());
const columnKey = (header: string) => header.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Las palabras del dueño (10-10-2026), a la medida de la pantalla: con el calendario, la ayuda y «No la tengo a mano»
 * debajo caben unas 37 palabras en un celular de 390 px (medido en la vista previa).
 * No es de sí o no: dice cómo responder (escribir, hablar o el calendario).
 */
export const PRIORITY_QUESTION = "Ahora, la fecha de prioridad: la que el gobierno asigna a tu caso para saber cuándo puedes iniciar la residencia; por eso importa el boletín de visas. Es la «Priority Date» del I-797. Escríbela o dímela.";
export const PRIORITY_UNKNOWN_LABEL = "No la tengo a mano";
export const PRIORITY_RETRY = "¿Cuál es la fecha de prioridad del menor? Es la «Priority Date» del aviso I-797.";

const chartName = (bulletin: Eb4Bulletin) => bulletin.chart === "filing" ? "«Dates for Filing»" : "«Final Action Dates»";

/** «USCIS acepta ajustes EB-4 con fecha de prioridad anterior al 1 de enero de 2025» (o al día / sin visas). */
function rule(column: BulletinColumn, country: string | null) {
  const forWhom = country ? ` para personas nacidas en ${country}` : "";
  if (column.cutoff === "C") return `la categoría EB-4${forWhom} está al día`;
  if (column.cutoff === "U") return `la categoría EB-4${forWhom} no tiene visas disponibles este mes`;
  return `USCIS acepta ajustes EB-4${country ? ` de personas nacidas en ${country}` : ""} con fecha de prioridad anterior al ${dayLabel(column.cutoff)}`;
}

const WHERE_TO_FIND = "No pasa nada: la encuentras como «Priority Date» en el aviso I-797 del I-360.";

/** Lo que el agente dice en cuanto sabe el resultado; después sigue con la próxima pregunta. */
export function verdictMessage(verdict: PriorityVerdict, bulletin: Eb4Bulletin | null) {
  if (verdict.status === "unknown" && verdict.reason === "date" && !bulletin) return WHERE_TO_FIND;
  if (verdict.reason === "bulletin" || !bulletin) return "Gracias. Este mes no pude confirmar el boletín de visas, así que un asesor revisará tu fecha contigo.";
  const month = monthLabel(bulletin.month);
  const column = verdict.column ?? bulletin.columns[0];
  const text = rule(column, verdict.country);
  if (verdict.status === "unknown") return `No pasa nada. Como referencia, en el boletín de visas de ${month} ${text}.`;
  if (verdict.status === "current") return column.cutoff === "C"
    ? `¡Buenas noticias! En el boletín de visas de ${month}, ${text}, así que la fecha del menor ya está vigente.`
    : `¡Buenas noticias! En el boletín de visas de ${month}, ${text}, y la del menor ya está dentro.`;
  // Próxima: se dice la distancia entre las dos fechas, nunca un plazo (el boletín avanza y retrocede).
  if (verdict.near) return `Tu fecha está muy cerca: en el boletín de visas de ${month}, ${text}, y la del menor está a ${gapLabel(verdict.gapMonths ?? 0)} de esa fecha.`;
  return column.cutoff === "U"
    ? `En el boletín de visas de ${month}, ${text}. Tu fecha aún está en el futuro, y el boletín cambia cada mes.`
    : `En el boletín de visas de ${month}, ${text}. La del menor todavía está lejos de esa fecha, y el boletín cambia cada mes.`;
}

const gapLabel = (months: number) => months <= 1 ? "solo un mes" : `solo ${months} meses`;

/** Lo último antes del segundo vídeo: invita a contratar o recomienda el contrato previo, según cómo esté la fecha. */
export const ADJUSTMENT_FINISH: Readonly<Record<"current" | "near" | "far" | "date" | "bulletin", string>> = {
  current: "¡Listo! La fecha de prioridad del menor está vigente: ya puede presentar su ajuste de estatus. Te invito a hacer tu contrato con nosotros; en el siguiente vídeo te mostramos cómo te acompañamos.",
  near: "¡Listo! Tu fecha está muy cerca, y este es el momento de adelantarte: con el contrato previo aseguras tu lugar y tendrás todo listo para presentar en cuanto llegue. En el siguiente vídeo te contamos sus garantías y la oferta.",
  far: "¡Listo! Tu fecha aún está en el futuro, pero no tienes que esperar con las manos vacías: con el contrato previo aseguras hoy tu lugar. En el siguiente vídeo te contamos sus garantías y la oferta.",
  date: "¡Listo! Con la fecha de prioridad del I-797 sabremos si el menor ya puede presentar. Mientras tanto, te recomendamos asegurar tu lugar con el contrato previo. En el siguiente vídeo te contamos sus garantías y la oferta.",
  bulletin: "¡Listo! Gracias por responder. Un asesor revisará contigo la fecha de prioridad con el boletín de este mes. Ahora sí, descubre cómo ContyGo te acompaña.",
};
export const adjustmentFinish = (verdict: PriorityVerdict) =>
  ADJUSTMENT_FINISH[verdict.status === "unknown" ? verdict.reason ?? "date" : verdict.status === "current" ? "current" : verdict.near ? "near" : "far"];

// ---------------- Respuestas y preguntas ----------------

const NOT_AT_HAND = /^(no\s+(la|lo)?\s*(s[eé]|tengo|recuerdo|encuentro|me acuerdo)|ni idea|no tengo idea|no s[eé])\b/i;

const EN_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const ymd = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
};
/**
 * Una fecha escrita: «15 de marzo de 2024», «March 15, 2024» (así la imprime el I-797) o «15/03/2024».
 * Con números, si el día y el mes pueden intercambiarse (los dos 12 o menos) no se adivina: null.
 */
/**
 * «15 de marzo de 2024», «March 15 2024» or «15/03/2024». With `infer` (21-10-2026, the voice chat), a day and month
 * without the year take the obvious one: the most recent for something past, the next one for an event to come.
 * Birth dates and priority dates never infer: there the year is the answer.
 */
export function parseWrittenDate(text: string, infer?: { dateMode?: string | null; today?: string }): string | null {
  const clean = text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  const es = /^(?:el )?(\d{1,2}) de ([a-z]+) (?:de |del )?(\d{4})$/.exec(clean);
  if (es) { const month = MONTH_NAMES.indexOf(es[2] === "setiembre" ? "septiembre" : es[2]); return month < 0 ? null : ymd(+es[3], month + 1, +es[1]); }
  const noYear = infer && (infer.dateMode === "past" || infer.dateMode === "future_event") ? /^(?:(?:fue|es|sera) )?(?:el )?(\d{1,2}) de ([a-z]+)$/.exec(clean) : null;
  if (noYear) {
    const month = MONTH_NAMES.indexOf(noYear[2] === "setiembre" ? "septiembre" : noYear[2]);
    if (month < 0) return null;
    const today = infer!.today ?? new Date().toISOString().slice(0, 10), year = +today.slice(0, 4);
    const same = ymd(year, month + 1, +noYear[1]);
    if (!same) return null;
    return infer!.dateMode === "past" ? same <= today ? same : ymd(year - 1, month + 1, +noYear[1]) : same >= today ? same : ymd(year + 1, month + 1, +noYear[1]);
  }
  const en = /^([a-z]+) (\d{1,2}) (\d{4})$/.exec(clean);
  if (en) { const month = EN_MONTHS.findIndex(name => name === en[1] || name.slice(0, 3) === en[1]); return month < 0 ? null : ymd(+en[3], month + 1, +en[2]); }
  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(clean);
  if (!numeric) return null;
  const [a, b, year] = [+numeric[1], +numeric[2], +numeric[3]];
  if (a > 12 && b <= 12) return ymd(year, b, a);
  if (b > 12 && a <= 12) return ymd(year, a, b);
  return a === b ? ymd(year, a, b) : null;
}

/** Fecha de prioridad: pasada (desde 1990), escrita o en ISO, o «UNKNOWN» si la persona no la tiene a mano. */
export function normalizePriorityAnswer(value: unknown): string | null {
  if (value === PRIORITY_UNKNOWN) return PRIORITY_UNKNOWN;
  if (typeof value === "string" && value.length <= 60 && NOT_AT_HAND.test(value.trim())) return PRIORITY_UNKNOWN;
  const date = typeof value === "string" && value.length <= 60 && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? parseWrittenDate(value) : value;
  return isPastOrTodayDate(date) && date >= OLDEST_PRIORITY_DATE ? date : null;
}

const statusFor = (date: string, cutoff: BulletinColumn["cutoff"]): "current" | "waiting" =>
  cutoff === "C" ? "current" : cutoff === "U" ? "waiting" : date < cutoff ? "current" : "waiting";

/** El veredicto de una columna; si aún no llega, también si está próxima. «U» (sin visas) nunca es próxima. */
function judge(date: string, column: BulletinColumn, country: string | null): PriorityVerdict {
  const status = statusFor(date, column.cutoff);
  if (status === "current" || column.cutoff === "U") return { status, column, country };
  const gapMonths = monthsAfter(column.cutoff, date);
  return { status, column, country, near: gapMonths <= NEAR_MONTHS, gapMonths };
}

const priorityQuestion = (): IntakeQuestion => ({ id: PRIORITY_FIELD, kind: "date", dateMode: "past", text: PRIORITY_QUESTION, allowUnknown: true, unknownLabel: PRIORITY_UNKNOWN_LABEL, retryText: PRIORITY_RETRY });

/**
 * Las preguntas propias del ajuste, en orden, las respuestas que siguen en juego y el veredicto
 * (null mientras falte algo). El país solo se pregunta si cambia el resultado: hoy (oct. 2026)
 * EB-4 tiene la misma fecha para todos, así que no se pregunta.
 */
export function adjustmentFlow(input: unknown, bulletin: Eb4Bulletin | null): { questions: IntakeQuestion[]; answers: ServiceAnswers; verdict: PriorityVerdict | null } {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const questions = [priorityQuestion()];
  const date = normalizePriorityAnswer(raw[PRIORITY_FIELD]);
  if (!date) return { questions, answers: {}, verdict: null };
  const answers: ServiceAnswers = { [PRIORITY_FIELD]: date };
  if (date === PRIORITY_UNKNOWN) return { questions, answers, verdict: { status: "unknown", reason: "date", column: null, country: null } };
  if (!bulletin) return { questions, answers, verdict: { status: "unknown", reason: "bulletin", column: null, country: null } };
  const [general, ...others] = bulletin.columns;
  for (const column of others.filter(item => statusFor(date, item.cutoff) !== statusFor(date, general.cutoff))) {
    const id = `${BORN_PREFIX}${columnKey(column.header)}`;
    const country = countryName(column.header);
    questions.push({ id, kind: "yesno", text: `¿El menor nació en ${country}?` });
    const born = raw[id];
    if (typeof born !== "boolean") return { questions, answers, verdict: null };
    answers[id] = born;
    if (born) return { questions, answers, verdict: judge(date, column, country) };
  }
  return { questions, answers, verdict: judge(date, general, null) };
}

/** La respuesta a la pregunta del catálogo: sale de comparar la fecha con el boletín. Sin veredicto, no hay respuesta. */
export const bulletinAnswer = (verdict: PriorityVerdict | null) =>
  verdict && verdict.status !== "unknown" ? verdict.status === "current" : undefined;

// ---------------- Al terminar ----------------

/** ¿contygo pone otro reparo además de la fecha (I-360 sin aprobar, matrimonio, deportación)? */
export function otherBlockers(result: EligibilityResult | null | undefined, bulletinQuestionId: string | undefined) {
  if (!result) return false;
  return [...result.disqualifiedQuestionIds, ...result.missingQuestionIds].some(id => id !== bulletinQuestionId);
}

export function priorityOutcome(verdict: PriorityVerdict, bulletin: Eb4Bulletin | null, blocked: boolean): PriorityOutcome {
  return {
    status: verdict.status,
    ...(verdict.reason ? { reason: verdict.reason } : {}),
    ...(verdict.status === "waiting" ? { near: Boolean(verdict.near) } : {}),
    month: bulletin ? monthLabel(bulletin.month) : null,
    // El contrato previo es para quien solo espera su fecha; con otro reparo, la orientación general.
    previo: verdict.status !== "current" && verdict.reason !== "bulletin" && !blocked,
  };
}

export function adjustmentSources(bulletin: Eb4Bulletin | null): JourneyGuidance["sources"] {
  return [
    ...(bulletin ? [{ title: `USCIS · Tabla para presentar el ajuste (${monthLabel(bulletin.month)})`, url: bulletin.chartUrl }] : []),
    ...(bulletin?.bulletinUrl ? [{ title: `Departamento de Estado · Visa Bulletin de ${monthLabel(bulletin.month)}`, url: bulletin.bulletinUrl }] : []),
    { title: "USCIS · Disponibilidad de visas y fechas de prioridad", url: USCIS_PRIORITY_DATES_URL },
  ];
}

/** Orientación del final («Ver mi orientación inicial»): la regla del mes, sus fuentes y el siguiente paso. */
export function adjustmentGuidance(verdict: PriorityVerdict, bulletin: Eb4Bulletin | null, result: EligibilityResult | null | undefined): JourneyGuidance {
  const notices = (result?.notices ?? []).map(notice => notice.message?.es).filter((value): value is string => Boolean(value));
  const sources = adjustmentSources(bulletin);
  const legal = "Esta orientación no es asesoría legal.";
  const find = "La fecha de prioridad es el día en que USCIS recibió el I-360 del menor y aparece como «Priority Date» en su aviso I-797.";
  if (!bulletin && verdict.reason === "date") return {
    status: "review", title: "Busca la fecha de prioridad en el I-797",
    detail: [find, "Te recomendamos asegurar tu lugar con el contrato previo.", ...notices, legal].join(" "), sources,
  };
  if (!bulletin || verdict.reason === "bulletin") return {
    status: "review", title: "Revisemos tu fecha de prioridad",
    detail: ["Este mes no pudimos confirmar el boletín de visas. Un asesor revisará contigo la fecha de prioridad del menor.", ...notices, legal].join(" "), sources,
  };
  const column = verdict.column ?? bulletin.columns[0];
  const base = `Según la tabla que USCIS indica para presentar el ajuste en ${monthLabel(bulletin.month)} (${chartName(bulletin)} del boletín de visas), ${rule(column, verdict.country)}.`;
  if (verdict.status === "current") return {
    status: "potential", title: "La fecha de prioridad del menor está vigente",
    detail: [base, "Con tus respuestas, puedes preparar tu contrato al final del recorrido.", ...notices, legal].join(" "), sources,
  };
  const moves = "El boletín se publica cada mes y puede avanzar, detenerse o retroceder.";
  if (verdict.status === "waiting" && verdict.near) return {
    status: "review", title: "Tu fecha de prioridad está muy cerca",
    detail: [base, `La del menor está a ${gapLabel(verdict.gapMonths ?? 0)} de esa fecha.`, moves, "Te recomendamos asegurar tu lugar desde ahora con el contrato previo, para presentar en cuanto llegue.", ...notices, legal].join(" "), sources,
  };
  if (verdict.status === "waiting") return {
    status: "review", title: "Tu fecha de prioridad aún está en el futuro",
    detail: [base, "La del menor todavía está lejos de esa fecha.", moves, "Con el contrato previo aseguras tu lugar desde ahora.", ...notices, legal].join(" "), sources,
  };
  return {
    status: "review", title: "Busca la fecha de prioridad en el I-797",
    detail: [find, `Como referencia: ${base.charAt(0).toLowerCase()}${base.slice(1)}`, "Te recomendamos asegurar tu lugar con el contrato previo.", ...notices, legal].join(" "), sources,
  };
}

/** Locuciones públicas (sin datos de la persona) para precargar durante el vídeo: cada veredicto con la pregunta que le sigue. */
export function adjustmentVoiceScripts(bulletin: Eb4Bulletin | null, nextQuestion: IntakeQuestion | null) {
  const general = bulletin?.columns[0] ?? null;
  const verdicts: PriorityVerdict[] = bulletin && general
    ? [{ status: "current", column: general, country: null }, { status: "waiting", column: general, country: null, near: false }, { status: "waiting", column: general, country: null, near: true, gapMonths: NEAR_MONTHS }, { status: "unknown", reason: "date", column: null, country: null }]
    : [{ status: "unknown", reason: "bulletin", column: null, country: null }];
  return [
    `Gracias. ${PRIORITY_QUESTION}`,
    ...verdicts.map(verdict => nextQuestion ? `${verdictMessage(verdict, bulletin)} ${nextQuestion.text}` : adjustmentFinish(verdict)),
    ...verdicts.map(adjustmentFinish),
  ];
}
