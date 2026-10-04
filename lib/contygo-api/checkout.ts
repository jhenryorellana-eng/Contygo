/* ============================================================
   ContyGo · contratación: validación, cuerpo y resultados
   Lógica pura (sin red ni secretos): la usan el servidor, los
   tests y la ficha del navegador para validar al momento.

   · El cuerpo de POST /contracts es estricto: solo campos del
     OpenAPI. Nunca importes, planes de pago ni precios.
   · Elegibilidad: /eligibility/evaluate usa answers[{questionId,
     value}]; /contracts usa eligibilityAnswers[{questionId, answer}].
   ============================================================ */
import type { AnswerValue, CatalogQuestion, ContractBody, ContractCreated, ContractParty, I18nText, Locale, PartyRole } from "./types";
import type { ApiResponse } from "./client";
import { effectiveApiBase } from "./api-base";

export const text = (value: I18nText | null | undefined, locale: Locale = "es") =>
  (locale === "en" ? value?.en : null) || value?.es || "";

/**
 * Cómo se responde cada pregunta: lo dice `kind` en GET /catalog (guía §4, paso 0; en el
 * OpenAPI de producción es obligatorio): yes_no con un booleano, date con "YYYY-MM-DD" y
 * us_state con el código de 2 letras de `options`. Manda siempre `kind`: el texto engaña
 * («¿La fecha de prioridad del I-360 está vigente…?» es de sí/no en el catálogo real).
 * Un kind que no conocemos NO se adivina: es "unknown", no se puede responder y el flujo
 * escala a una persona (OpenAPI). Deducirlo del texto queda solo como defensa para un
 * catálogo antiguo que llegara SIN kind.
 */
export type QuestionKind = "yesno" | "date" | "state" | "unknown";
export function questionKind(question: Pick<CatalogQuestion, "prompt"> & { kind?: string | null }): QuestionKind {
  if (question.kind === "yes_no") return "yesno";
  if (question.kind === "date") return "date";
  if (question.kind === "us_state") return "state";
  if (typeof question.kind === "string" && question.kind) return "unknown";
  return /\bfecha\b/i.test(question.prompt?.es ?? "") || /\bdate\b/i.test(question.prompt?.en ?? "") ? "date" : "yesno";
}

/** externalRef lo genera la UI al empezar la conversación: «web-» + un UUID (guía §2 bis). */
export const isExternalRef = (value: unknown): value is string => typeof value === "string" && /^web-[A-Za-z0-9-]{16,64}$/.test(value);

/** La Idempotency-Key de cada intento la genera la UI con crypto.randomUUID() (guía §2 bis). */
export const isIdempotencyKey = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** El rol `lead` lo ocupa el propio cliente (clientPartyMode por defecto: principal). */
export const partyRolesToAsk = <R extends Pick<PartyRole, "roleKey">>(roles: R[]) => roles.filter(role => role.roleKey !== "lead");

// ---------------- Fechas y respuestas de elegibilidad ----------------

const todayYmd = () => new Date().toISOString().slice(0, 10);

/** "YYYY-MM-DD" que existe en el calendario (1900-2100). */
export function isValidYmd(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** El día siguiente o anterior de un «YYYY-MM-DD» (calendario UTC). */
function shiftYmd(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Las fechas de las respuestas se comparan con el «hoy» UTC del servidor, pero el navegador
 * limita el selector con SU «hoy» local: pueden diferir un día (por la tarde en América, al este de
 * UTC por la mañana). Se tolera un día en cada sentido; quien decide la elegibilidad es contygo.
 */
export function isPastOrTodayDate(value: unknown, today = todayYmd()): value is string {
  return isValidYmd(value) && value <= shiftYmd(today, 1);
}

/** future_event: la fecha de un hecho por venir (p. ej. una audiencia): desde hoy (con un día de tolerancia). */
export function isTodayOrFutureDate(value: unknown, today = todayYmd()): value is string {
  return isValidYmd(value) && value >= shiftYmd(today, -1);
}

/** Lo que hace falta de una pregunta para normalizar su respuesta. */
export interface AnswerTarget { kind: QuestionKind; dateMode?: string | null; options?: { code: string; label?: unknown; name?: unknown }[] }

const fold = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");

const textsOf = (value: unknown): string[] => {
  if (typeof value === "string") return value ? [value] : [];
  if (value && typeof value === "object") return [(value as I18nText).es, (value as I18nText).en].filter((item): item is string => typeof item === "string" && item !== "");
  return [];
};
/** contygo publica el rótulo en `name: {es, en}`; `label` queda como respaldo de catálogos antiguos. */
const optionLabels = (option: { label?: unknown; name?: unknown }) => [...textsOf(option.name), ...textsOf(option.label)];

/** us_state: el código de 2 letras que existe en las options de la pregunta (o, sin options, un estado de EE. UU.). */
function normalizeState(value: unknown, options?: AnswerTarget["options"]): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const valid = (code: string) => (options?.length ? options.some(option => option.code === code) : US_STATE_CODES.has(code));
  if (/^[A-Za-z]{2}$/.test(text)) { const code = text.toUpperCase(); return valid(code) ? code : null; }
  // «Texas» tal cual lo rotulan las options: sin adivinar nada que contygo no ofrezca.
  const wanted = fold(text);
  if (wanted.length < 4 || !options?.length) return null;
  return options.find(option => optionLabels(option).some(label => fold(label) === wanted))?.code ?? null;
}

/**
 * Normaliza una respuesta a la forma que acepta la API, o null si no vale. Con un `kind` suelto
 * (compatibilidad) una fecha es «hasta hoy» y un estado cualquiera de EE. UU.; con la pregunta
 * completa manda su `dateMode` y sus `options`. Un kind "unknown" nunca se puede responder.
 * minNotice no se aplica aquí: es solo informativo, quien decide es contygo.
 */
export function normalizeAnswer(target: QuestionKind | AnswerTarget, value: unknown, today = todayYmd()): AnswerValue | null {
  const { kind, dateMode, options } = typeof target === "string" ? { kind: target, dateMode: undefined, options: undefined } : target;
  if (kind === "unknown") return null;
  if (kind === "date") {
    if (dateMode === "future_event") return isTodayOrFutureDate(value, today) ? value : null;
    return isPastOrTodayDate(value, today) ? value : null;
  }
  if (kind === "state") return normalizeState(value, options);
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const word = value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,]/g, "");
  if (["si", "yes", "true"].includes(word)) return true;
  if (["no", "false"].includes(word)) return false;
  return null;
}

export const answerTarget = (question: Pick<CatalogQuestion, "prompt" | "kind" | "dateMode" | "options">): AnswerTarget =>
  ({ kind: questionKind(question), dateMode: question.dateMode, options: question.options });

type SanitizableQuestion = Pick<CatalogQuestion, "id" | "prompt" | "kind"> & Partial<Pick<CatalogQuestion, "dateMode" | "options">>;

/** Solo respuestas consecutivas y válidas, en el orden del catálogo. Una pregunta de kind desconocido corta la cadena. */
export function sanitizeAnswers(questions: SanitizableQuestion[], input: unknown, today = todayYmd()): Record<string, AnswerValue> {
  const answers: Record<string, AnswerValue> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return answers;
  for (const question of questions) {
    if (!Object.prototype.hasOwnProperty.call(input, question.id)) break;
    const value = normalizeAnswer(answerTarget(question), (input as Record<string, unknown>)[question.id], today);
    if (value === null) break;
    answers[question.id] = value;
  }
  return answers;
}

/** ¿Hay una pregunta que esta web no sabe responder? Entonces el servicio se escala (OpenAPI). */
export const hasUnknownQuestion = (questions: Pick<CatalogQuestion, "prompt" | "kind">[]) => questions.some(question => questionKind(question) === "unknown");

export const toEvaluateAnswers = (questions: Pick<CatalogQuestion, "id">[], answers: Record<string, AnswerValue>) =>
  questions.filter(question => answers[question.id] !== undefined).map(question => ({ questionId: question.id, value: answers[question.id] }));

export const toContractAnswers = (questions: Pick<CatalogQuestion, "id">[], answers: Record<string, AnswerValue>) =>
  questions.filter(question => answers[question.id] !== undefined).map(question => ({ questionId: question.id, answer: answers[question.id] }));

// ---------------- Datos de la persona ----------------

const NAME = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} '.-]*$", "u");
const clean = (value: unknown) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

/** Mismo criterio que el bot: sin espacios, puntos, guiones ni paréntesis; «00» es «+». */
function phoneCandidate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!/^\+?[\d\s().-]{7,25}$/.test(value)) return null;
  const compact = value.replace(/[\s().-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

/** NANP: el código de área y la central empiezan por 2-9 (+1 y diez dígitos). */
const isNanp = (e164: string) => /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(e164);

/**
 * El teléfono de CONTACTO del lead (PUT /leads): E.164, puede ser internacional. Diez dígitos sin
 * prefijo, o «1» + diez, se entienden como EE. UU. (+1). El del CONTRATO es normalizeContractPhone.
 */
export function normalizePhone(raw: unknown): string | null {
  const value = phoneCandidate(raw);
  if (!value) return null;
  let e164: string;
  if (value.startsWith("+")) e164 = value;
  else if (value.length === 10) e164 = `+1${value}`;
  else if (value.length === 11 && value.startsWith("1")) e164 = `+${value}`;
  else return null;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  return e164.startsWith("+1") && !isNanp(e164) ? null : e164;
}

/** Copia única del error del teléfono del contrato (también la devuelve contygo con unsupported_country). */
export const PHONE_US_MESSAGE = "Necesitamos un teléfono de EE. UU. para tu cuenta.";

/** El teléfono del CONTRATO: contygo solo acepta +1 (400 unsupported_country). Como el bot: ^\+1\d{10}$ con reglas NANP. */
export function normalizeContractPhone(raw: unknown): string | null {
  const e164 = normalizePhone(raw);
  return e164 && isNanp(e164) ? e164 : null;
}

/** El dominio interno no recibe correo: la persona no podría leer su código (OpenAPI, 400). */
const BLOCKED_EMAIL_DOMAINS = ["clients.usalatinoprime.com"];
export function normalizeEmail(raw: unknown): string | null {
  const email = clean(raw).toLowerCase();
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return null;
  const domain = email.split("@")[1];
  return BLOCKED_EMAIL_DOMAINS.includes(domain) ? null : email;
}

export const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
  "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY", "PR", "VI", "GU", "AS", "MP",
]);

export interface ContractFormInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  address: { line1: string; apartment?: string; city: string; state: string; zip: string };
  locale: Locale;
  servicePlanId: string;
  installmentOptionId?: string;
  parties: ContractParty[];
  consent: { accepted: boolean; at: string };
}

export interface NormalizedContractForm {
  nameParts: { firstName: string; middleName?: string; lastName: string };
  fullName: string;
  email: string;
  phoneE164: string;
  address: { line1: string; apartment?: string; city: string; state: string; zip: string };
  locale: Locale;
  servicePlanId: string;
  installmentOptionId?: string;
  parties: ContractParty[];
  consentAt: string;
}

export type FieldErrors = Record<string, string>;

type ServiceForForm = {
  plans: { id: string; installmentOptions?: { id: string }[]; paymentOptions?: { installmentOptionId: string | null }[] }[];
  partyRoles: Pick<PartyRole, "roleKey" | "cardinality" | "isRequired" | "label">[];
};

function nameField(errors: FieldErrors, key: string, raw: unknown, max: number, required: boolean, label: string) {
  const value = clean(raw);
  if (!value) { if (required) errors[key] = `Escribe ${label}.`; return undefined; }
  if (value.length > max) errors[key] = `Máximo ${max} caracteres.`;
  else if (!NAME.test(value)) errors[key] = "Usa solo letras, espacios, guiones o apóstrofos.";
  return value;
}

/** Valida y normaliza la ficha contra el servicio del catálogo. */
export function validateContractForm(input: unknown, service: ServiceForForm, now = new Date()): { ok: true; value: NormalizedContractForm } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const form = (input && typeof input === "object" && !Array.isArray(input) ? input : {}) as Partial<ContractFormInput>;
  const firstName = nameField(errors, "firstName", form.firstName, 80, true, "tu nombre");
  const middleName = nameField(errors, "middleName", form.middleName, 80, false, "tu segundo nombre");
  const lastName = nameField(errors, "lastName", form.lastName, 120, true, "tus apellidos");

  const email = normalizeEmail(form.email);
  if (!email) errors.email = "Escribe un correo válido. Ahí llegará tu código.";
  const phoneE164 = normalizeContractPhone(form.phone);
  if (!phoneE164) errors.phone = PHONE_US_MESSAGE;

  const address = (form.address && typeof form.address === "object" ? form.address : {}) as Partial<ContractFormInput["address"]>;
  const line1 = clean(address.line1), apartment = clean(address.apartment), city = clean(address.city);
  const state = clean(address.state).toUpperCase();
  const zip = clean(address.zip).replace(/-\d{4}$/, "");
  if (!line1) errors["address.line1"] = "Escribe tu dirección.";
  else if (line1.length > 200) errors["address.line1"] = "Máximo 200 caracteres.";
  if (apartment.length > 200) errors["address.apartment"] = "Máximo 200 caracteres.";
  if (!city) errors["address.city"] = "Escribe tu ciudad.";
  else if (city.length > 120) errors["address.city"] = "Máximo 120 caracteres.";
  if (!US_STATE_CODES.has(state)) errors["address.state"] = "Elige tu estado.";
  if (!/^\d{5}$/.test(zip)) errors["address.zip"] = "El código postal tiene 5 dígitos.";

  const locale: Locale = form.locale === "en" ? "en" : "es";

  const plan = service.plans.find(item => item.id === form.servicePlanId);
  if (!plan) errors.servicePlanId = "Elige un paquete.";
  let installmentOptionId: string | undefined;
  if (form.installmentOptionId) {
    // Un id publicado en paymentOptions (el nuevo contrato) o, en un catálogo antiguo, en installmentOptions.
    const offered = plan?.paymentOptions?.some(option => option.installmentOptionId === form.installmentOptionId) || plan?.installmentOptions?.some(option => option.id === form.installmentOptionId);
    if (offered) installmentOptionId = form.installmentOptionId;
    else errors.installmentOptionId = "Elige una opción de pago de este paquete.";
  }

  const roles = partyRolesToAsk(service.partyRoles);
  const parties: ContractParty[] = [];
  const rawParties = Array.isArray(form.parties) ? form.parties : [];
  if (rawParties.length > 20) errors.parties = "Como máximo 20 personas.";
  rawParties.slice(0, 20).forEach((raw, index) => {
    const party = (raw && typeof raw === "object" ? raw : {}) as Partial<ContractParty>;
    const role = roles.find(item => item.roleKey === party.role);
    if (!role) { errors[`parties.${index}.role`] = "Esta persona no corresponde a este servicio."; return; }
    const first = nameField(errors, `parties.${index}.firstName`, party.firstName, 80, true, "el nombre");
    const middle = nameField(errors, `parties.${index}.middleName`, party.middleName, 80, false, "el segundo nombre");
    const last = nameField(errors, `parties.${index}.lastName`, party.lastName, 120, true, "los apellidos");
    const dateOfBirth = clean(party.dateOfBirth);
    if (dateOfBirth && !isPastOrTodayDate(dateOfBirth, now.toISOString().slice(0, 10))) errors[`parties.${index}.dateOfBirth`] = "Revisa la fecha de nacimiento.";
    parties.push({ role: role.roleKey, firstName: first ?? "", ...(middle ? { middleName: middle } : {}), lastName: last ?? "", ...(dateOfBirth ? { dateOfBirth } : {}) });
  });
  for (const role of roles) {
    const count = parties.filter(party => party.role === role.roleKey).length;
    if (role.isRequired && count === 0) errors[`role.${role.roleKey}`] = `Añade: ${text(role.label)}.`;
    if (role.cardinality === "single" && count > 1) errors[`role.${role.roleKey}`] = `Solo puede haber una persona como ${text(role.label).toLowerCase()}.`;
  }

  const consent = (form.consent && typeof form.consent === "object" ? form.consent : {}) as Partial<ContractFormInput["consent"]>;
  const consentTime = typeof consent.at === "string" ? Date.parse(consent.at) : Number.NaN;
  if (consent.accepted !== true) errors.consent = "Marca la casilla para continuar.";
  else if (Number.isNaN(consentTime) || consentTime < now.getTime() - 24 * 3600_000) errors.consent = "Vuelve a marcar la casilla de aceptación.";

  if (Object.keys(errors).length) return { ok: false, errors };
  const nameParts = { firstName: firstName!, ...(middleName ? { middleName } : {}), lastName: lastName! };
  return {
    ok: true,
    value: {
      nameParts,
      fullName: [nameParts.firstName, nameParts.middleName, nameParts.lastName].filter(Boolean).join(" ").slice(0, 200),
      email: email!,
      phoneE164: phoneE164!,
      address: { line1, ...(apartment ? { apartment } : {}), city, state, zip },
      locale,
      servicePlanId: plan!.id,
      ...(installmentOptionId ? { installmentOptionId } : {}),
      parties,
      // Nunca en el futuro: la API tolera 5 min de desfase, pero no más.
      consentAt: new Date(Math.min(consentTime, now.getTime())).toISOString(),
    },
  };
}

/** El cuerpo exacto de la 1.ª llamada. La 2.ª repite ESTE objeto + verificationId + code. */
export function buildContractBody(options: {
  externalRef: string;
  serviceId: string;
  form: NormalizedContractForm;
  eligibilityAnswers: { questionId: string; answer: AnswerValue }[];
  termsVersion: string;
}): ContractBody {
  const { form } = options;
  return {
    externalRef: options.externalRef,
    client: {
      fullName: form.fullName,
      nameParts: { ...form.nameParts },
      email: form.email,
      phoneE164: form.phoneE164,
      address: { ...form.address },
      locale: form.locale,
    },
    serviceId: options.serviceId,
    servicePlanId: form.servicePlanId,
    ...(form.installmentOptionId ? { installmentOptionId: form.installmentOptionId } : {}),
    eligibilityAnswers: options.eligibilityAnswers.map(item => ({ ...item })),
    ...(form.parties.length ? { parties: form.parties.map(party => ({ ...party })) } : {}),
    consent: { textVersion: options.termsVersion, at: form.consentAt, channel: "web" },
  };
}

// ---------------- Respuestas de POST /contracts ----------------

export type ContractOutcome =
  | { step: "INVALID"; errors: FieldErrors }
  | { step: "ASK_CODE"; verificationId: string; maskedEmail: string; expiresAt: string | null }
  | { step: "SIGN"; created: ContractCreated; serviceAlreadyLive: string | null }
  | { step: "SIGN_LINK_PENDING"; created: ContractCreated }
  | { step: "UNAVAILABLE_ONLINE"; code: string }
  | { step: "WRONG_CODE"; attemptsLeft: number | null }
  | { step: "RESTART" }
  | { step: "HUMAN" }
  | { step: "EXISTING_CLIENT" }
  | FixContact
  | { step: "NOT_ELIGIBLE" }
  | { step: "UNAVAILABLE" }
  | { step: "INVALID_PARTIES"; role: string | null }
  | { step: "RETRY_LATER"; reason: RetryReason; retryAfter: number | null }
  | { step: "ERROR"; code: string };

/**
 * CLIENT_NEEDS_HUMAN con una pista segura (solo canal web, solo tras un código válido): la persona puede
 * corregir el teléfono en vez de toparse con un callejón sin salida. `phoneHint` son los 2 últimos dígitos
 * del teléfono de la cuenta de ese correo (nunca más); si no es exactamente eso, se omite.
 */
export type FixContact =
  | { step: "FIX_CONTACT"; reason: "email_has_account"; phoneHint?: string }
  | { step: "FIX_CONTACT"; reason: "phone_in_use" };

/**
 * CLIENT_NEEDS_HUMAN con details.resolution = "existing_client": el teléfono o el correo son de una cuenta que x-legal
 * no enlaza sola (solo enlaza las que la landing o el bot crearon, con sus datos de nacimiento y la contraseña inicial
 * sin cambiar). Sale por WhatsApp y el equipo adopta el teléfono; no arrastra ningún dato de la cuenta.
 */
function readExistingClient(details: Record<string, unknown>): { step: "EXISTING_CLIENT" } | null {
  return details.resolution === "existing_client" ? { step: "EXISTING_CLIENT" } : null;
}

/** Lo que la API manda en error.details de CLIENT_NEEDS_HUMAN; cualquier otra cosa es el HUMAN opaco de siempre. */
function readFixContact(details: Record<string, unknown>): FixContact | null {
  if (details.resolution === "email_has_account") {
    const hint = details.phoneHint;
    return typeof hint === "string" && /^\d{2}$/.test(hint)
      ? { step: "FIX_CONTACT", reason: "email_has_account", phoneHint: hint }
      : { step: "FIX_CONTACT", reason: "email_has_account" };
  }
  if (details.resolution === "phone_in_use") return { step: "FIX_CONTACT", reason: "phone_in_use" };
  return null;
}

/**
 * busy: la MISMA clave y el mismo cuerpo se pueden repetir (IN_PROGRESS, 503, 500 de la 2.ª llamada, corte de red en la 2.ª).
 * destination: DESTINATION_RATE_LIMITED (429); nada se creó y el próximo intento estrena clave, sin bucles.
 * verification: VERIFICATION_RATE_LIMITED (429, 3 códigos por hora y correo); retryAfter ≈ 3600 s.
 * general: RATE_LIMITED (429). Se guarda con la clave: el reintento necesita clave y código nuevos.
 * conflict: IDEMPOTENCY_MISMATCH; esa clave ya no sirve y el próximo intento estrena otra.
 * fresh_key: la 1.ª llamada se cortó sin respuesta; con la misma clave contygo daría IN_PROGRESS 120 s.
 *   El próximo intento estrena clave y hay que avisar de que vale el código MÁS RECIENTE.
 */
export type RetryReason = "destination" | "verification" | "general" | "busy" | "conflict" | "fresh_key";

/** Referencia corta y pública del intento web (sin PII): «WEB-» + los últimos 6 del externalRef. */
export const publicRef = (externalRef: string) => `WEB-${externalRef.slice(-6).toUpperCase()}`;

/** Interruptor de apagado: CONTYGO_CHECKOUT_ENABLED=0 deriva a WhatsApp sin tocar contygo. */
export const checkoutEnabled = () => process.env.CONTYGO_CHECKOUT_ENABLED !== "0";

/**
 * Solo se muestra un enlace de firma que sea https y de contygo. Excepción para el E2E de desarrollo:
 * http si la API es localhost/127.0.0.1 y no estamos en producción.
 */
export function isTrustedSigningUrl(value: unknown, apiBase = effectiveApiBase()) {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const url = new URL(value), api = new URL(apiBase);
    if (url.username || url.password || url.host !== api.host) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(api.hostname) && process.env.NODE_ENV !== "production";
  } catch { return false; }
}

// ---------------- Errores de configuración y de campos ----------------

/** Nada que la persona pueda arreglar: contygo no está listo para contratar en línea. */
const CONFIG_CODES = new Set(["UNAUTHORIZED", "FORBIDDEN", "COMPLIANCE_INCOMPLETE", "COMPLIANCE_EXPIRED", "CASE_PAYMENT_PLAN_INVALID", "CONSENT_CHANNEL_MISMATCH", "NO_SALES_OWNER"]);
export const isConfigFailure = (status: number, code: string) => status === 401 || status === 403 || CONFIG_CODES.has(code);

const FIELD_PATHS: Record<string, string> = {
  "client.email": "email",
  "client.phoneE164": "phone",
  "client.fullName": "firstName",
  "client.nameParts.firstName": "firstName",
  "client.nameParts.middleName": "middleName",
  "client.nameParts.lastName": "lastName",
  "client.address.line1": "address.line1",
  "client.address.apartment": "address.apartment",
  "client.address.city": "address.city",
  "client.address.state": "address.state",
  "client.address.zip": "address.zip",
  servicePlanId: "servicePlanId",
  installmentOptionId: "installmentOptionId",
};
const PARTY_FIELDS = new Set(["role", "firstName", "middleName", "lastName", "dateOfBirth"]);

/** La clave del formulario de un path de contygo («client.address.zip» → «address.zip», «parties.1.lastName» igual), o null. */
export function formFieldKey(rawPath: unknown): string | null {
  const path = Array.isArray(rawPath) ? rawPath.join(".") : typeof rawPath === "string" ? rawPath : "";
  const normalized = path.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
  if (FIELD_PATHS[normalized]) return FIELD_PATHS[normalized];
  const party = /^parties\.(\d+)(?:\.(\w+))?$/.exec(normalized);
  if (party) return party[2] && PARTY_FIELDS.has(party[2]) ? `parties.${party[1]}.${party[2]}` : "parties";
  if (normalized.startsWith("consent")) return "consent";
  return null;
}

function fieldMessage(key: string, reason: string): string {
  if (key === "email") return reason === "reserved_domain" ? "Usa otro correo." : "Escribe un correo válido. Ahí llegará tu código.";
  if (key === "phone") return PHONE_US_MESSAGE; // unsupported_country, invalid…: contygo solo acepta +1
  if (key === "address.zip") return "El código postal tiene 5 dígitos.";
  if (key === "address.state") return "Elige tu estado.";
  if (key === "consent") return "Marca la casilla para continuar.";
  return "Revisa este dato.";
}

/**
 * Errores por campo de un 400 INVALID_REQUEST. details.fields llega en dos formas:
 * zod {path, code} y de identidad {path, reason: invalid|reserved_domain|unsupported_country}.
 * Lo que no corresponde a ningún campo de la ficha se ignora.
 */
export function mapInvalidFields(details: Record<string, unknown> | undefined): FieldErrors {
  const errors: FieldErrors = {};
  const fields = details && Array.isArray(details.fields) ? details.fields : [];
  for (const entry of fields) {
    if (!entry || typeof entry !== "object") continue;
    const { path, reason, code } = entry as { path?: unknown; reason?: unknown; code?: unknown };
    const key = formFieldKey(path);
    if (key && !errors[key]) errors[key] = fieldMessage(key, typeof reason === "string" ? reason : typeof code === "string" ? code : "invalid");
  }
  return errors;
}

/**
 * phase "first": un 500 puede ser transitorio (contygo no lo guarda: lectura del catálogo caída en la
 * prevalidación) y no creó nada; se reintenta con clave NUEVA (fresh_key). phase "second": un 500 viene de
 * DESPUÉS de crear al cliente y se repite con la misma clave; si sigue fallando, busy.
 */
export function mapContractResponse(response: ApiResponse<ContractCreated>, phase: "first" | "second" = "first"): ContractOutcome {
  const { status, data, error } = response;
  if (status === 201 && data) {
    // Sin enlace de firma de confianza pero con contrato (repetición de un 201): se ofrece «Enviarme el enlace».
    if (!isTrustedSigningUrl(data.signingUrl)) return data.contractId ? { step: "SIGN_LINK_PENDING", created: data } : { step: "ERROR", code: "BAD_SIGNING_URL" };
    if (!data.contractId) return { step: "ERROR", code: "BAD_SIGNING_URL" };
    const live = Array.isArray(data.warnings) ? data.warnings.find(item => item?.code === "SERVICE_ALREADY_LIVE") : undefined;
    return { step: "SIGN", created: data, serviceAlreadyLive: live?.caseNumber ?? null };
  }
  const code = error?.code ?? `HTTP_${status}`;
  const details = error?.details ?? {};
  if (isConfigFailure(status, code)) return { step: "UNAVAILABLE_ONLINE", code };
  if (status === 500) return phase === "first" ? { step: "RETRY_LATER", reason: "fresh_key", retryAfter: response.retryAfter ?? 5 } : { step: "RETRY_LATER", reason: "busy", retryAfter: response.retryAfter ?? 5 };
  switch (code) {
    case "INVALID_REQUEST": {
      const errors = mapInvalidFields(details);
      return Object.keys(errors).length ? { step: "INVALID", errors } : { step: "ERROR", code };
    }
    case "CLIENT_VERIFICATION_REQUIRED": {
      const verificationId = details.verificationId;
      if (typeof verificationId !== "string" || verificationId.length < 20) return { step: "ERROR", code: "BAD_VERIFICATION" };
      return {
        step: "ASK_CODE",
        verificationId,
        maskedEmail: typeof details.maskedEmail === "string" ? details.maskedEmail : "",
        expiresAt: typeof details.expiresAt === "string" ? details.expiresAt : null,
      };
    }
    case "VERIFICATION_INVALID": return { step: "WRONG_CODE", attemptsLeft: typeof details.attemptsLeft === "number" ? details.attemptsLeft : null };
    case "VERIFICATION_EXPIRED": return { step: "RESTART" };
    case "CLIENT_NEEDS_HUMAN": return readExistingClient(details) ?? readFixContact(details) ?? { step: "HUMAN" };
    case "NOT_ELIGIBLE": return { step: "NOT_ELIGIBLE" };
    case "PLAN_NOT_CONTRACTABLE": return { step: "UNAVAILABLE" };
    case "INVALID_PARTIES": return { step: "INVALID_PARTIES", role: typeof details.role === "string" ? details.role : null };
    case "DESTINATION_RATE_LIMITED": return { step: "RETRY_LATER", reason: "destination", retryAfter: response.retryAfter };
    case "VERIFICATION_RATE_LIMITED": return { step: "RETRY_LATER", reason: "verification", retryAfter: response.retryAfter ?? 3600 };
    case "RATE_LIMITED": return { step: "RETRY_LATER", reason: "general", retryAfter: response.retryAfter };
    case "IN_PROGRESS":
    case "REQUEST_IN_PROGRESS": return { step: "RETRY_LATER", reason: "busy", retryAfter: response.retryAfter ?? 1 };
    case "IDEMPOTENCY_MISMATCH": return { step: "RETRY_LATER", reason: "conflict", retryAfter: null };
    default:
      if (status === 503) return { step: "RETRY_LATER", reason: "busy", retryAfter: response.retryAfter };
      return { step: "ERROR", code };
  }
}
