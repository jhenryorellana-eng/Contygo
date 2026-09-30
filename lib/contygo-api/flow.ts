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
     firmado del contrato, nunca el contractId pelado.
   ============================================================ */
import { invalidateCatalog, remoteServiceFor } from "./catalog";
import {
  buildContractBody, mapContractResponse, sanitizeAnswers, toContractAnswers, toEvaluateAnswers, validateContractForm,
  type ContractOutcome, type FieldErrors, type RetryReason,
} from "./checkout";
import { contygoApi } from "./client";
import { buildLeadBody, syncLead } from "./lead";
import { CONTRACT_TERMS } from "./terms";
import { assertTokensReady, checkVerificationTicket, signContractToken, signVerificationTicket } from "./tokens";
import type { Attribution, ContractBody } from "./types";

/** Lo que ve el navegador. */
export type BrowserOutcome =
  | { step: "INVALID"; errors: FieldErrors }
  | { step: "NEEDS_ANSWERS" }
  | { step: "ASK_CODE"; maskedEmail: string; expiresAt: string | null; verificationId: string; body: ContractBody; ticket: string }
  | { step: "SIGN"; clientCreated: boolean; caseNumber: string; signingUrl: string; serviceAlreadyLive: string | null; firstName: string; token: string }
  | { step: "WRONG_CODE"; attemptsLeft: number | null }
  | { step: "RESTART" }
  | { step: "HUMAN" }
  | { step: "NOT_ELIGIBLE" }
  | { step: "UNAVAILABLE" }
  | { step: "INVALID_PARTIES"; role: string | null }
  | { step: "RETRY_LATER"; reason: RetryReason; retryAfter: number | null }
  | { step: "ERROR"; code: string };

const logCode = (where: string, code: string) => console.warn(`[contygo] ${where}: ${code}`);

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

export interface StartInput {
  /** Servicio de la landing (lib/contygo-catalog); su equivalente en contygo sale del catálogo. */
  localServiceId: string;
  externalRef: string;
  form: unknown;
  answers: unknown;
  attribution?: Attribution;
}

/** «Enviar mi código»: valida, confirma elegibilidad, actualiza el lead y hace la 1.ª llamada. */
export async function startContract(input: StartInput, idempotencyKey: string): Promise<BrowserOutcome> {
  // Sin secreto no se podría canjear el código: mejor no enviarlo.
  assertTokensReady();
  const service = await remoteServiceFor(input.localServiceId);
  if (!service) return { step: "UNAVAILABLE" };

  const form = validateContractForm(input.form, service);
  if (!form.ok) return { step: "INVALID", errors: form.errors };
  const answers = sanitizeAnswers(service.eligibilityQuestions, input.answers);
  if (!service.eligibilityQuestions.every(question => answers[question.id] !== undefined)) return { step: "NEEDS_ANSWERS" };

  // Elegibilidad antes de enviar el código (guía §4, paso 2): no persiste nada, se puede repetir.
  const evaluation = await contygoApi.evaluateEligibility({ serviceId: service.id, answers: toEvaluateAnswers(service.eligibilityQuestions, answers) });
  if (evaluation.status !== 200 || !evaluation.data) {
    logCode("elegibilidad", evaluation.error?.code ?? `HTTP_${evaluation.status}`);
    return { step: "RETRY_LATER", reason: "busy", retryAfter: evaluation.retryAfter };
  }
  if (!evaluation.data.eligible) return { step: "NOT_ELIGIBLE" };

  // El lead se actualiza con el nombre completo y el correo. Si falla, no bloquea la venta.
  await syncLead(input.externalRef, buildLeadBody(
    { fullName: form.value.fullName, phoneE164: form.value.phoneE164, email: form.value.email },
    { localServiceId: input.localServiceId, eligible: true, attribution: input.attribution },
  ));

  const body = buildContractBody({
    externalRef: input.externalRef,
    serviceId: service.id,
    form: form.value,
    eligibilityAnswers: toContractAnswers(service.eligibilityQuestions, answers),
    termsVersion: CONTRACT_TERMS.version,
  });
  const outcome = mapContractResponse(await contygoApi.createContract(body, idempotencyKey));

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
    case "UNAVAILABLE":
      invalidateCatalog();
      return outcome;
    case "ERROR":
      if (outcome.code === "NETWORK") return { step: "RETRY_LATER", reason: "busy", retryAfter: 5 };
      logCode("alta (1.ª llamada)", outcome.code);
      return outcome;
    case "WRONG_CODE":
    case "RESTART":
      logCode("alta (1.ª llamada) inesperada", outcome.step);
      return { step: "ERROR", code: outcome.step };
    default:
      return outcome;
  }
}

export interface ConfirmInput { body: unknown; verificationId: unknown; ticket: unknown; code: unknown }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** 2.ª llamada: el cuerpo que la UI guardó, sin tocar, más el sobre y el código. */
export async function confirmContract(input: ConfirmInput, idempotencyKey: string): Promise<BrowserOutcome> {
  const code = typeof input.code === "string" ? input.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) return { step: "INVALID", errors: { code: "El código tiene 6 dígitos." } };
  const verificationId = typeof input.verificationId === "string" && input.verificationId.length >= 20 && input.verificationId.length <= 200 ? input.verificationId : null;
  // Solo se canjea un código con el cuerpo que ESTE servidor construyó y firmó al enviarlo.
  // Un ticket caducado, ajeno o un cuerpo cambiado piden empezar otra vez por la 1.ª llamada.
  if (!verificationId || !record(input.body) || !checkVerificationTicket(input.ticket, verificationId, input.body)) return { step: "RESTART" };
  const body = input.body as unknown as ContractBody;

  const outcome = mapContractResponse(await contygoApi.createContract({ ...body, verificationId, verificationCode: code }, idempotencyKey));
  switch (outcome.step) {
    case "SIGN": {
      const firstName = typeof body.client?.nameParts?.firstName === "string" ? body.client.nameParts.firstName : "";
      return signed(outcome, firstName);
    }
    case "ERROR":
      if (outcome.code === "NETWORK") return { step: "RETRY_LATER", reason: "busy", retryAfter: 5 };
      logCode("alta (2.ª llamada)", outcome.code);
      return outcome;
    case "ASK_CODE":
      logCode("alta (2.ª llamada) inesperada", outcome.step);
      return { step: "RESTART" };
    case "UNAVAILABLE":
      invalidateCatalog();
      return outcome;
    default: // WRONG_CODE, RETRY_LATER, RESTART, HUMAN, NOT_ELIGIBLE, INVALID_PARTIES
      return outcome;
  }
}
