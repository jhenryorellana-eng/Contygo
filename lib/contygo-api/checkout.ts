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

export const text = (value: I18nText | null | undefined, locale: Locale = "es") =>
  (locale === "en" ? value?.en : null) || value?.es || "";

/**
 * Cómo se responde cada pregunta: lo dice `kind` en GET /catalog (guía §4, paso 0; en el
 * OpenAPI de producción es obligatorio), yes_no con un booleano y date con "YYYY-MM-DD".
 * Manda siempre `kind`: el texto engaña («¿La fecha de prioridad del I-360 está vigente…?»
 * es de sí/no en el catálogo real). Deducirlo del texto queda solo como defensa, si una
 * respuesta llegara sin él.
 */
export type QuestionKind = "yesno" | "date";
export function questionKind(question: Pick<CatalogQuestion, "prompt"> & { kind?: string }): QuestionKind {
  if (question.kind === "date") return "date";
  if (question.kind === "yes_no") return "yesno";
  return /\bfecha\b/i.test(question.prompt.es ?? "") || /\bdate\b/i.test(question.prompt.en ?? "") ? "date" : "yesno";
}

/** externalRef lo genera la UI al empezar la conversación: «web-» + un UUID (guía §2 bis). */
export const isExternalRef = (value: unknown): value is string => typeof value === "string" && /^web-[A-Za-z0-9-]{16,64}$/.test(value);

/** La Idempotency-Key de cada intento la genera la UI con crypto.randomUUID() (guía §2 bis). */
export const isIdempotencyKey = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** El rol `lead` lo ocupa el propio cliente (clientPartyMode por defecto: principal). */
export const partyRolesToAsk = <R extends Pick<PartyRole, "roleKey">>(roles: R[]) => roles.filter(role => role.roleKey !== "lead");

// ---------------- Fechas y respuestas de elegibilidad ----------------

export function isPastOrTodayDate(value: unknown, today = new Date().toISOString().slice(0, 10)): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (day > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]) return false;
  return value <= today;
}

/** Normaliza una respuesta a la forma que acepta la API, o null si no vale. */
export function normalizeAnswer(kind: QuestionKind, value: unknown): AnswerValue | null {
  if (kind === "date") return isPastOrTodayDate(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const word = value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,]/g, "");
  if (["si", "yes", "true"].includes(word)) return true;
  if (["no", "false"].includes(word)) return false;
  return null;
}

/** Solo respuestas consecutivas y válidas, en el orden del catálogo. */
export function sanitizeAnswers(questions: Pick<CatalogQuestion, "id" | "prompt" | "kind">[], input: unknown): Record<string, AnswerValue> {
  const answers: Record<string, AnswerValue> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return answers;
  for (const question of questions) {
    if (!Object.prototype.hasOwnProperty.call(input, question.id)) break;
    const value = normalizeAnswer(questionKind(question), (input as Record<string, unknown>)[question.id]);
    if (value === null) break;
    answers[question.id] = value;
  }
  return answers;
}

export const toEvaluateAnswers = (questions: Pick<CatalogQuestion, "id">[], answers: Record<string, AnswerValue>) =>
  questions.filter(question => answers[question.id] !== undefined).map(question => ({ questionId: question.id, value: answers[question.id] }));

export const toContractAnswers = (questions: Pick<CatalogQuestion, "id">[], answers: Record<string, AnswerValue>) =>
  questions.filter(question => answers[question.id] !== undefined).map(question => ({ questionId: question.id, answer: answers[question.id] }));

// ---------------- Datos de la persona ----------------

const NAME = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} '.-]*$", "u");
const clean = (value: unknown) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

/** E.164. Diez dígitos sin prefijo se entienden como EE. UU. (+1). */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!/^\+?[\d\s().-]{7,25}$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  let e164: string;
  if (value.startsWith("+")) e164 = `+${digits}`;
  else if (digits.length === 10) e164 = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith("1")) e164 = `+${digits}`;
  else return null;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  // En EE. UU. el número nacional no empieza por 0 ni 1.
  if (e164.startsWith("+1") && (e164.length !== 12 || /^[01]/.test(e164.slice(2)))) return null;
  return e164;
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
  plans: { id: string; installmentOptions: { id: string }[] }[];
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
  const phoneE164 = normalizePhone(form.phone);
  if (!phoneE164) errors.phone = "Escribe un teléfono válido, con código de país si no es de EE. UU.";

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
    if (plan?.installmentOptions.some(option => option.id === form.installmentOptionId)) installmentOptionId = form.installmentOptionId;
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
  | { step: "ASK_CODE"; verificationId: string; maskedEmail: string; expiresAt: string | null }
  | { step: "SIGN"; created: ContractCreated; serviceAlreadyLive: string | null }
  | { step: "WRONG_CODE"; attemptsLeft: number | null }
  | { step: "RESTART" }
  | { step: "HUMAN" }
  | { step: "NOT_ELIGIBLE" }
  | { step: "UNAVAILABLE" }
  | { step: "INVALID_PARTIES"; role: string | null }
  | { step: "RETRY_LATER"; reason: RetryReason; retryAfter: number | null }
  | { step: "ERROR"; code: string };

/**
 * busy: la MISMA clave y el mismo cuerpo se pueden repetir (IN_PROGRESS, 503, corte de red).
 * destination / general: un 429; nada se creó y el próximo intento estrena clave, sin bucles.
 * conflict: IDEMPOTENCY_MISMATCH; esa clave ya no sirve y el próximo intento estrena otra.
 */
export type RetryReason = "destination" | "general" | "busy" | "conflict";

/** Solo se muestra un enlace de firma que sea https y de contygo. */
export function isTrustedSigningUrl(value: unknown, apiBase = process.env.CONTYGO_API_BASE || "https://contygo.app/api/integrations/v1") {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const url = new URL(value), api = new URL(apiBase);
    return url.protocol === "https:" && url.host === api.host && !url.username && !url.password;
  } catch { return false; }
}

export function mapContractResponse(response: ApiResponse<ContractCreated>): ContractOutcome {
  const { status, data, error } = response;
  if (status === 201 && data) {
    if (!isTrustedSigningUrl(data.signingUrl) || !data.contractId) return { step: "ERROR", code: "BAD_SIGNING_URL" };
    const live = Array.isArray(data.warnings) ? data.warnings.find(item => item?.code === "SERVICE_ALREADY_LIVE") : undefined;
    return { step: "SIGN", created: data, serviceAlreadyLive: live?.caseNumber ?? null };
  }
  const code = error?.code ?? `HTTP_${status}`;
  const details = error?.details ?? {};
  switch (code) {
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
    case "CLIENT_NEEDS_HUMAN": return { step: "HUMAN" };
    case "NOT_ELIGIBLE": return { step: "NOT_ELIGIBLE" };
    case "PLAN_NOT_CONTRACTABLE": return { step: "UNAVAILABLE" };
    case "INVALID_PARTIES": return { step: "INVALID_PARTIES", role: typeof details.role === "string" ? details.role : null };
    case "DESTINATION_RATE_LIMITED":
    case "VERIFICATION_RATE_LIMITED": return { step: "RETRY_LATER", reason: "destination", retryAfter: response.retryAfter };
    case "RATE_LIMITED": return { step: "RETRY_LATER", reason: "general", retryAfter: response.retryAfter };
    case "IN_PROGRESS": return { step: "RETRY_LATER", reason: "busy", retryAfter: response.retryAfter ?? 1 };
    case "IDEMPOTENCY_MISMATCH": return { step: "RETRY_LATER", reason: "conflict", retryAfter: null };
    default:
      if (status === 503) return { step: "RETRY_LATER", reason: "busy", retryAfter: response.retryAfter };
      return { step: "ERROR", code };
  }
}
