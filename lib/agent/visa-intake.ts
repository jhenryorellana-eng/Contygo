import { FEDERAL_SIJ_SOURCE, getVisaStateRule, type IntakeSource } from "./visa-state-rules";

export type IntakeField = "residence" | "birthDate" | "state" | "evidence" | "witness";
export type IntakeAnswers = Partial<{ residence: boolean; birthDate: string; state: string; evidence: boolean; witness: boolean }>;
export interface IntakeGuidance {
  status: "review" | "potential" | "outside-federal-age";
  title: string;
  detail: string;
  age: number | null;
  sources: IntakeSource[];
}
export interface IntakeResponse {
  ok: true;
  answers: IntakeAnswers;
  field: IntakeField | null;
  message: string;
  complete: boolean;
  guidance?: IntakeGuidance;
  source: "gemini" | "guided";
  retryable?: boolean;
}

export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "Distrito de Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawái" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Luisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Misisipi" }, { code: "MO", name: "Misuri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "Nuevo Hampshire" },
  { code: "NJ", name: "Nueva Jersey" }, { code: "NM", name: "Nuevo México" }, { code: "NY", name: "Nueva York" },
  { code: "NC", name: "Carolina del Norte" }, { code: "ND", name: "Dakota del Norte" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregón" }, { code: "PA", name: "Pensilvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "Carolina del Sur" }, { code: "SD", name: "Dakota del Sur" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "Virginia Occidental" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

export const INTAKE_FIELDS: readonly IntakeField[] = ["residence", "birthDate", "state", "evidence", "witness"];
export const INTAKE_QUESTIONS: Readonly<Record<IntakeField, string>> = {
  residence: "¿El joven vive actualmente en Estados Unidos?",
  birthDate: "¿Cuál es la fecha de nacimiento del joven, con día, mes y año?",
  state: "¿En qué estado de Estados Unidos vive el joven? Si aún no tiene un estado, puedes responder «Por confirmar».",
  evidence: "¿Tienes pruebas o documentos sobre el abandono del joven por parte de uno o ambos padres?",
  witness: "¿Puedes conseguir testigos que declaren sobre el abandono?",
};
export const INTAKE_EXPLANATIONS: Readonly<Record<IntakeField, string>> = {
  residence: "La presencia en Estados Unidos es uno de los puntos que se revisan para este proceso.",
  birthDate: "La edad al presentar la petición federal y los plazos de la corte estatal se revisan por separado.",
  state: "Cada estado tiene vías judiciales y plazos diferentes. El estado nos ayuda a orientar esa revisión.",
  evidence: "Pueden servir documentos o mensajes que reflejen los hechos; un profesional debe valorar su utilidad. No necesitas enviarlos ni contar detalles sensibles aquí.",
  witness: "Los testimonios pueden ayudar a explicar los hechos, pero su valor debe revisarse. Si no puedes conseguir testigos, también puedes continuar.",
};
export const INTAKE_GREETING = "¡Gracias por ver el video! Qué bueno tenerte aquí. Te haré unas preguntas cortitas sobre Visa Juvenil. Esto no es un examen; vamos paso a paso. Puedes escribir o hablar, como te resulte más cómodo.";
export const INTAKE_FINISH_VOICE = "¡Listo! Gracias por responder. Ya diste el primer paso. Ahora sí, descubre cómo ContyGo te acompaña.";
export const INTAKE_FOLLOWUPS: Readonly<Record<IntakeField, string>> = {
  residence: INTAKE_QUESTIONS.residence,
  birthDate: `Gracias. ${INTAKE_QUESTIONS.birthDate}`,
  state: `Ya tengo la fecha. ${INTAKE_QUESTIONS.state}`,
  evidence: `Gracias. ${INTAKE_QUESTIONS.evidence}`,
  witness: `Entiendo. ${INTAKE_QUESTIONS.witness}`,
};
/** Approved public scripts only: safe to pre-generate, no answers or personal data. */
export const INTAKE_VOICE_SCRIPTS = [
  `${INTAKE_GREETING} ${INTAKE_QUESTIONS.residence}`,
  ...Object.values(INTAKE_FOLLOWUPS), INTAKE_FINISH_VOICE,
];

/** Next can normalize loopback URLs to localhost; Host keeps the browser's host. */
export function isSameOriginIntakeRequest(request: { url: string; headers: Pick<Headers, "get"> }): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return false;
  try {
    const requestUrl = new URL(request.url);
    if (requestUrl.protocol !== "https:" && requestUrl.protocol !== "http:") return false;
    const host = request.headers.get("host") ?? requestUrl.host;
    // Host must be an authority, never a URL, list, path or credential pair.
    if (!host || /[\s,/@?#\\]/.test(host)) return false;
    const destination = new URL(`${requestUrl.protocol}//${host}`);
    const origin = new URL(rawOrigin);
    return origin.origin === rawOrigin && origin.origin === destination.origin;
  } catch { return false; }
}

const normalize = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const stateAliases: Record<string, string> = {
  hawaii: "HI", louisiana: "LA", mississippi: "MS", missouri: "MO", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  oregon: "OR", pennsylvania: "PA", "south carolina": "SC", "south dakota": "SD", "west virginia": "WV",
  "washington dc": "DC", "washington d.c.": "DC", "district of columbia": "DC", "d.c.": "DC",
  unknown: "UNKNOWN", "por confirmar": "UNKNOWN", "no se": "UNKNOWN", "fuera de estados unidos": "UNKNOWN",
};

/** UTC calendar date; the server, never the request, chooses today's date. */
export function todayISO(): string { return new Date().toISOString().slice(0, 10); }

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function isValidBirthDate(value: unknown, date = todayISO()): value is string {
  return isCalendarDate(value) && isCalendarDate(date) && value <= date;
}

export function calculateAge(birthDate: string, date = todayISO()): number | null {
  if (!isValidBirthDate(birthDate, date)) return null;
  const age = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return age - (date.slice(5) < birthDate.slice(5) ? 1 : 0);
}

/** Only unequivocal canonical answers pass locally; other phrasing goes to Gemini. */
export function validateIntakeAnswer(field: IntakeField, value: unknown, date = todayISO()): string | boolean | null {
  if (field === "residence" || field === "evidence" || field === "witness") {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return null;
    const text = normalize(value);
    if (["si", "sí", "yes", "true"].includes(text)) return true;
    if (["no", "false"].includes(text)) return false;
    return null;
  }
  if (typeof value !== "string") return null;
  if (field === "birthDate") return isValidBirthDate(value.trim(), date) ? value.trim() : null;
  if (field !== "state" || value.length > 80) return null;
  const text = normalize(value);
  const state = US_STATES.find(item => normalize(item.name) === text || item.code.toLowerCase() === text);
  return state?.code ?? (Object.prototype.hasOwnProperty.call(stateAliases, text) ? stateAliases[text] : null);
}

/** Strip unknown properties and stop at the first unanswered/invalid field. */
export function sanitizeIntakeAnswers(value: unknown, date = todayISO()): IntakeAnswers {
  const result: IntakeAnswers = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const field of INTAKE_FIELDS) {
    if (field === "witness" && result.evidence === true) break;
    if (!Object.prototype.hasOwnProperty.call(value, field)) break;
    const answer = validateIntakeAnswer(field, (value as Record<string, unknown>)[field], date);
    if (answer === null) break;
    Object.assign(result, { [field]: answer });
  }
  return result;
}

export function nextIntakeField(answers: IntakeAnswers): IntakeField | null {
  if (typeof answers.residence !== "boolean") return "residence";
  if (!isValidBirthDate(answers.birthDate)) return "birthDate";
  if (validateIntakeAnswer("state", answers.state) === null) return "state";
  if (typeof answers.evidence !== "boolean") return "evidence";
  if (answers.evidence === false && typeof answers.witness !== "boolean") return "witness";
  return null;
}

export function isIntakeComplete(answers: IntakeAnswers): boolean { return nextIntakeField(answers) === null; }

export function getIntakeGuidance(answers: IntakeAnswers, date = todayISO()): IntakeGuidance {
  const age = answers.birthDate ? calculateAge(answers.birthDate, date) : null;
  const state = getVisaStateRule(answers.state);
  const sources = [FEDERAL_SIJ_SOURCE, ...state.sources];
  if (age !== null && age >= 21) return {
    status: "outside-federal-age", title: "Revisemos las fechas de tu caso", age, sources,
    detail: "La regla federal exige presentar la petición SIJ antes de cumplir 21 años. Si ya se presentó a tiempo, cumplir 21 no decide por sí solo el resultado. Un profesional debe revisar las fechas y cualquier orden previa. Puedes continuar al siguiente video.",
  };
  if (answers.residence === false) return {
    status: "review", title: "Tu situación necesita una revisión individual", age, sources,
    detail: "La clasificación SIJ exige estar en Estados Unidos. Revisaremos tu situación y las opciones que correspondan; esta entrevista no decide tu elegibilidad. Puedes continuar al siguiente video.",
  };
  if (answers.evidence === false && answers.witness === false) return {
    status: "review", title: "Revisaremos cómo documentar tu historia", age, sources,
    detail: "No tener ahora documentos ni testigos no permite decidir el resultado de tu caso. Un profesional debe revisar los hechos y las formas disponibles de documentarlos. Puedes continuar al siguiente video.",
  };
  const hasSupport = answers.evidence === true || answers.witness === true;
  const agePath = age !== null && age < 21 && (age < 18 || state.adultPathwayReviewed);
  const potential = answers.residence === true && agePath && hasSupport && answers.state !== "UNKNOWN" && Boolean(answers.state);
  return {
    status: potential ? "potential" : "review", title: potential ? "Hay datos para una revisión de Visa Juvenil" : "Revisemos la vía disponible en tu estado", age, sources,
    detail: `${age !== null && age >= 18 ? state.detail + " " : ""}Esta orientación no confirma elegibilidad. Faltan revisar, entre otros puntos, el estado civil, los hechos y la orden de una corte estatal. Puedes continuar al siguiente video.`,
  };
}
