/* ============================================================
   ContyGo · «Contratar» en dos pasos, SIN estado (SOLO servidor)
   Guía §2 bis y §4; OpenAPI POST /contracts.

   1.ª llamada (/api/contratar/iniciar): valida la ficha, confirma la
      elegibilidad, actualiza el lead y manda el cuerpo. contygo
      responde siempre 409 CLIENT_VERIFICATION_REQUIRED y envía el
      código. Al navegador vuelven el verificationId, el CUERPO EXACTO
      y un ticket firmado que ata los dos (tokens.ts): la UI los guarda.
   2.ª llamada (/api/contratar/confirmar): la UI devuelve cuerpo,
      verificationId y ticket. Si la firma cuadra, se reenvía ese mismo
      cuerpo + verificationId + verificationCode → 201 con signingUrl.

   · La Idempotency-Key la genera la UI (una por intento) y aquí solo
     se reenvía: un reintento tras un corte repite clave y cuerpo.
   · Nunca se dice «ya eres cliente» antes del código: solo con
     clientCreated=false en el 201.
   · La signingUrl vuelve al navegador de la persona y a nada más:
     ni logs, ni el modelo de IA. Al navegador va también el token
   · Plazo global (REQUEST_BUDGET_MS) por petición, compartido por catálogo,
     elegibilidad, lead y alta: ningún intento empieza si no cabe en él.
   · 1.ª llamada: tras un corte NO se repite con la misma clave (contygo no
     guarda ese 409 y respondería IN_PROGRESS 120 s): RETRY_LATER fresh_key.
     2.ª llamada: corte, 503, 500 o IN_PROGRESS repiten con la MISMA clave.
   · HUMAN, UNAVAILABLE_ONLINE y los errores no transitorios dejan, sin PII,
     un resumen en el lead (PUT /leads) y una referencia corta WEB-XXXXXX.
   ============================================================ */
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { CatalogUnavailableError, invalidateCatalog, localServiceNameFor, remoteServiceFor } from "./catalog";
import {
  buildContractBody, checkoutEnabled, hasUnknownQuestion, isConfigFailure, mapContractResponse, normalizeContractPhone, publicRef,
  sanitizeAnswers, toContractAnswers, toEvaluateAnswers, validateContractForm,
  type ContractOutcome, type FieldErrors, type RetryReason,
} from "./checkout";
import { contygoApi } from "./client";
import { buildAttemptBody, buildLeadBody, syncLead } from "./lead";
import { CONTRACT_TERMS } from "./terms";
import { assertTokensReady, checkVerificationTicket, signContractToken, signVerificationTicket } from "./tokens";
import type { Attribution, ContractBody } from "./types";

/** Presupuesto por petición del navegador: la ruta tiene maxDuration 60. */
export const REQUEST_BUDGET_MS = 50_000;
/** Aunque el plazo esté agotado, el aviso a ventas tiene este margen (best-effort). */
const REPORT_MARGIN_MS = 5_000;

/** Lo que ve el navegador. `ref` es la referencia corta pública del intento («WEB-AB12CD»), sin PII. */
export type BrowserOutcome =
  | { step: "INVALID"; errors: FieldErrors }
  | { step: "NEEDS_ANSWERS" }
  | { step: "ASK_CODE"; maskedEmail: string; expiresAt: string | null; verificationId: string; body: ContractBody; ticket: string }
  | { step: "SIGN"; clientCreated: boolean; caseNumber: string; signingUrl: string; serviceAlreadyLive: string | null; firstName: string; token: string }
  | { step: "SIGN_LINK_PENDING"; clientCreated: boolean; caseNumber: string; firstName: string; token: string }
  | { step: "WRONG_CODE"; attemptsLeft: number | null }
  | { step: "RESTART" }
  | { step: "HUMAN"; ref: string }
  | { step: "NOT_ELIGIBLE" }
  | { step: "UNAVAILABLE" }
  | { step: "UNAVAILABLE_ONLINE"; code: string; ref: string }
  | { step: "INVALID_PARTIES"; role: string | null }
  | { step: "RETRY_LATER"; reason: RetryReason; retryAfter: number | null }
  | { step: "ERROR"; code: string; ref: string };

const logCode = (where: string, code: string) => console.warn(`[contygo] ${where}: ${code}`);
/** Formato fijo para alertar: sin PII ni credenciales, solo dónde y qué código. */
const logConfig = (where: string, code: string) => console.error(`[contygo:config] ${where} ${code.replace(/[^A-Za-z0-9_]/g, "").slice(0, 60)}`);

export interface FlowOptions {
  /** Solo tests: reemplaza REQUEST_BUDGET_MS. */
  budgetMs?: number;
}

const deadlineFor = (options: FlowOptions) => Date.now() + (options.budgetMs ?? REQUEST_BUDGET_MS);

const cleanName = (value: unknown) => typeof value === "string"
  ? value.replace(new RegExp("[^\\p{L}\\p{M} '.-]", "gu"), "").replace(/\s+/g, " ").trim() : "";

interface Attempt {
  externalRef: string;
  deadline: number;
  /** Nombre del servicio de la landing, o null si no se supo. */
  serviceName: string | null;
  person: { fullName: string; phoneE164: string } | null;
}

/** Best-effort: deja en el lead que intentó contratar y necesita ayuda. Nunca lanza ni retrasa más del margen. */
async function reportAttempt(attempt: Attempt, code: string) {
  if (!attempt.person) return;
  try {
    await syncLead(
      attempt.externalRef,
      buildAttemptBody(attempt.person, attempt.serviceName ?? "servicio", code),
      { deadline: Math.max(attempt.deadline, Date.now() + REPORT_MARGIN_MS) },
    );
  } catch { /* El aviso es un extra: la persona ya recibe su salida por WhatsApp. */ }
}

async function human(attempt: Attempt, code: string): Promise<BrowserOutcome> {
  await reportAttempt(attempt, code);
  return { step: "HUMAN", ref: publicRef(attempt.externalRef) };
}

async function unavailableOnline(attempt: Attempt, code: string): Promise<BrowserOutcome> {
  await reportAttempt(attempt, code);
  return { step: "UNAVAILABLE_ONLINE", code, ref: publicRef(attempt.externalRef) };
}

async function failed(attempt: Attempt, code: string): Promise<BrowserOutcome> {
  await reportAttempt(attempt, code);
  return { step: "ERROR", code, ref: publicRef(attempt.externalRef) };
}

function signed(outcome: Extract<ContractOutcome, { step: "SIGN" }>, firstName: string): BrowserOutcome {
  const { created } = outcome;
  return {
    step: "SIGN",
    clientCreated: created.clientCreated,
    caseNumber: created.caseNumber,
    signingUrl: created.signingUrl,
    serviceAlreadyLive: outcome.serviceAlreadyLive,
    firstName,
    token: signContractToken(created.contractId),
  };
}

/** 201 repetido sin enlace de firma de confianza: la persona pide «Enviarme el enlace» (/reenviar) con este token. */
function linkPending(outcome: Extract<ContractOutcome, { step: "SIGN_LINK_PENDING" }>, firstName: string): BrowserOutcome {
  const { created } = outcome;
  return {
    step: "SIGN_LINK_PENDING",
    clientCreated: created.clientCreated === true,
    caseNumber: typeof created.caseNumber === "string" ? created.caseNumber : "",
    firstName,
    token: signContractToken(created.contractId),
  };
}

export interface StartInput {
  /** Servicio de la landing (lib/contygo-catalog); su equivalente en contygo sale del catálogo. */
  localServiceId: string;
  externalRef: string;
  form: unknown;
  answers: unknown;
  attribution?: Attribution;
}

/** Quién es, para el resumen del lead, antes de que la ficha esté validada del todo. Solo si hay nombre y teléfono de EE. UU. */
function personFromForm(form: unknown): Attempt["person"] {
  if (!form || typeof form !== "object" || Array.isArray(form)) return null;
  const raw = form as Record<string, unknown>;
  const fullName = [cleanName(raw.firstName), cleanName(raw.middleName), cleanName(raw.lastName)].filter(Boolean).join(" ");
  const phoneE164 = normalizeContractPhone(raw.phone);
  return fullName && phoneE164 ? { fullName, phoneE164 } : null;
}

/** «Enviar mi código»: valida, confirma elegibilidad, actualiza el lead y hace la 1.ª llamada. */
export async function startContract(input: StartInput, idempotencyKey: string, options: FlowOptions = {}): Promise<BrowserOutcome> {
  const ref = publicRef(input.externalRef);
  // Interruptor de apagado: nada llega a contygo, ni siquiera el aviso al lead.
  if (!checkoutEnabled()) return { step: "UNAVAILABLE_ONLINE", code: "CHECKOUT_DISABLED", ref };
  // Sin secreto no se podría canjear el código: mejor no enviarlo.
  assertTokensReady();
  const deadline = deadlineFor(options);
  const budget = { deadline };
  const attempt: Attempt = {
    externalRef: input.externalRef,
    deadline,
    serviceName: CONTYGO_SERVICES.find(item => item.id === input.localServiceId)?.name ?? null,
    person: personFromForm(input.form),
  };

  let service;
  try {
    service = await remoteServiceFor(input.localServiceId, budget);
  } catch (error) {
    // 401/403 del catálogo: la clave o el canal están mal; no es «revisa tu conexión».
    if (error instanceof CatalogUnavailableError && error.isConfig) {
      logConfig("catalog", error.code);
      return unavailableOnline(attempt, error.code);
    }
    throw error;
  }
  if (!service) return { step: "UNAVAILABLE" };
  attempt.serviceName ??= service.name?.es || null;

  // Un kind de pregunta que no conocemos no se adivina: se escala a una persona (OpenAPI).
  if (hasUnknownQuestion(service.eligibilityQuestions)) {
    logCode("catálogo", "UNKNOWN_QUESTION_KIND");
    return human(attempt, "UNKNOWN_QUESTION_KIND");
  }

  const form = validateContractForm(input.form, service);
  if (!form.ok) return { step: "INVALID", errors: form.errors };
  attempt.person = { fullName: form.value.fullName, phoneE164: form.value.phoneE164 };
  const answers = sanitizeAnswers(service.eligibilityQuestions, input.answers);
  if (!service.eligibilityQuestions.every(question => answers[question.id] !== undefined)) return { step: "NEEDS_ANSWERS" };

  // Elegibilidad antes de enviar el código (guía §4, paso 2): no persiste nada, se puede repetir.
  const evaluation = await contygoApi.evaluateEligibility({ serviceId: service.id, answers: toEvaluateAnswers(service.eligibilityQuestions, answers) }, budget);
  if (evaluation.status !== 200 || !evaluation.data) {
    const code = evaluation.error?.code ?? `HTTP_${evaluation.status}`;
    if (isConfigFailure(evaluation.status, code)) {
      logConfig("eligibility", code);
      return unavailableOnline(attempt, code);
    }
    logCode("elegibilidad", code);
    return { step: "RETRY_LATER", reason: "busy", retryAfter: evaluation.retryAfter };
  }
  if (!evaluation.data.eligible) return { step: "NOT_ELIGIBLE" };

  // El lead se actualiza con el nombre completo y el correo. Si falla, no bloquea la venta.
  await syncLead(input.externalRef, buildLeadBody(
    { fullName: form.value.fullName, phoneE164: form.value.phoneE164, email: form.value.email },
    { localServiceId: input.localServiceId, eligible: true, attribution: input.attribution },
  ), budget);

  const body = buildContractBody({
    externalRef: input.externalRef,
    serviceId: service.id,
    form: form.value,
    eligibilityAnswers: toContractAnswers(service.eligibilityQuestions, answers),
    termsVersion: CONTRACT_TERMS.version,
  });
  const outcome = mapContractResponse(await contygoApi.createContract(body, idempotencyKey, { phase: "first", deadline }), "first");

  switch (outcome.step) {
    case "ASK_CODE":
      return {
        step: "ASK_CODE",
        maskedEmail: outcome.maskedEmail,
        expiresAt: outcome.expiresAt,
        verificationId: outcome.verificationId,
        body,
        ticket: signVerificationTicket(outcome.verificationId, body),
      };
    case "SIGN": // Un canal que no exige código respondería 201 directamente (OpenAPI). Se acepta igual.
      return signed(outcome, form.value.nameParts.firstName);
    case "SIGN_LINK_PENDING":
      return linkPending(outcome, form.value.nameParts.firstName);
    case "UNAVAILABLE":
      invalidateCatalog();
      return outcome;
    case "UNAVAILABLE_ONLINE":
      logConfig("contract-1", outcome.code);
      return unavailableOnline(attempt, outcome.code);
    case "HUMAN":
      return human(attempt, "CLIENT_NEEDS_HUMAN");
    case "ERROR":
      // Sin respuesta de contygo: el código pudo salir o no. La misma clave daría IN_PROGRESS 120 s: clave nueva.
      if (outcome.code === "NETWORK") return { step: "RETRY_LATER", reason: "fresh_key", retryAfter: null };
      // El plazo se agotó antes de enviar nada: la misma clave sigue limpia.
      if (outcome.code === "DEADLINE") return { step: "RETRY_LATER", reason: "busy", retryAfter: 5 };
      // Preview o desarrollo contra contygo real: las escrituras están cerradas.
      if (outcome.code === "DEV_WRITES_DISABLED") return { step: "UNAVAILABLE_ONLINE", code: outcome.code, ref };
      logCode("alta (1.ª llamada)", outcome.code);
      return failed(attempt, outcome.code);
    case "WRONG_CODE":
    case "RESTART":
      logCode("alta (1.ª llamada) inesperada", outcome.step);
      return failed(attempt, outcome.step);
    default: // INVALID, NOT_ELIGIBLE, INVALID_PARTIES, RETRY_LATER
      return outcome;
  }
}

export interface ConfirmInput { body: unknown; verificationId: unknown; ticket: unknown; code: unknown }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** El código del correo, solo con sus dígitos: «481 920» y «481-920» valen (se pega con lo que sea). */
const digitsOf = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value).replace(/\D/g, "") : "");

/** 2.ª llamada: el cuerpo que la UI guardó, sin tocar, más el sobre y el código. */
export async function confirmContract(input: ConfirmInput, idempotencyKey: string, options: FlowOptions = {}): Promise<BrowserOutcome> {
  const code = digitsOf(input.code);
  if (!/^\d{6}$/.test(code)) return { step: "INVALID", errors: { code: "El código tiene 6 dígitos." } };
  const verificationId = typeof input.verificationId === "string" && input.verificationId.length >= 20 && input.verificationId.length <= 200 ? input.verificationId : null;
  // Solo se canjea un código con el cuerpo que ESTE servidor construyó y firmó al enviarlo.
  // Un ticket caducado, ajeno o un cuerpo cambiado piden empezar otra vez por la 1.ª llamada.
  if (!verificationId || !record(input.body) || !checkVerificationTicket(input.ticket, verificationId, input.body)) return { step: "RESTART" };
  const body = input.body as unknown as ContractBody;
  const deadline = deadlineFor(options);
  const ref = publicRef(body.externalRef);
  // Para el aviso a ventas: lo que hay en el cuerpo fijado por el ticket (nunca lo que diga el navegador).
  const attempt: Attempt = {
    externalRef: body.externalRef,
    deadline,
    serviceName: await localServiceNameFor(body.serviceId, { deadline }).catch(() => null),
    person: typeof body.client?.fullName === "string" && typeof body.client?.phoneE164 === "string"
      ? { fullName: body.client.fullName, phoneE164: body.client.phoneE164 } : null,
  };

  const outcome = mapContractResponse(
    await contygoApi.createContract({ ...body, verificationId, verificationCode: code }, idempotencyKey, { phase: "second", deadline }),
    "second",
  );
  const firstName = typeof body.client?.nameParts?.firstName === "string" ? body.client.nameParts.firstName : "";
  switch (outcome.step) {
    case "SIGN":
      return signed(outcome, firstName);
    case "SIGN_LINK_PENDING":
      return linkPending(outcome, firstName);
    case "INVALID": // El cuerpo ya pasó nuestra validación: algo cambió. Se empieza otra vez por la 1.ª llamada.
      logCode("alta (2.ª llamada) inválida", Object.keys(outcome.errors).join(","));
      return { step: "RESTART" };
    case "UNAVAILABLE_ONLINE":
      logConfig("contract-2", outcome.code);
      return unavailableOnline(attempt, outcome.code);
    case "HUMAN":
      return human(attempt, "CLIENT_NEEDS_HUMAN");
    case "ERROR":
      // Corte, timeout o plazo agotado: la MISMA clave y los mismos bytes retoman desde el cliente ya creado.
      if (outcome.code === "NETWORK" || outcome.code === "DEADLINE") return { step: "RETRY_LATER", reason: "busy", retryAfter: 5 };
      if (outcome.code === "DEV_WRITES_DISABLED") return { step: "UNAVAILABLE_ONLINE", code: outcome.code, ref };
      logCode("alta (2.ª llamada)", outcome.code);
      return failed(attempt, outcome.code);
    case "ASK_CODE":
      logCode("alta (2.ª llamada) inesperada", outcome.step);
      return { step: "RESTART" };
    case "UNAVAILABLE":
      invalidateCatalog();
      return outcome;
    default: // WRONG_CODE, RETRY_LATER, RESTART, NOT_ELIGIBLE, INVALID_PARTIES
      return outcome;
  }
}
