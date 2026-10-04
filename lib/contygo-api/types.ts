/* ============================================================
   ContyGo · tipos de la API de contratación
   Fuente: openapi-motor-de-ventas.yaml (manda sobre la guía).
   Sin dependencias: lo importan servidor, tests y componentes.
   ============================================================ */

export type Locale = "es" | "en";
export interface I18nText { es: string; en: string | null }

export interface InstallmentOption {
  id: string;
  installmentCount: number;
  /** Centavos de USD; null ⇒ anticipo por defecto del paquete. */
  downpaymentCents: number | null;
  frequency: "weekly" | "monthly";
}

/** Desglose precalculado por el motor de contygo. La landing solo elige la fila; nunca calcula dinero. */
export interface CatalogPaymentBreakdown {
  /** Precio base + extraPartyPriceCents × personas adicionales. */
  totalCents: number;
  /** Igual a totalCents cuando installmentCount === 1. */
  downpaymentCents: number;
  /** INCLUYE el anticipo: «6» = anticipo + 5 cuotas. */
  installmentCount: number;
  /** installmentCount - 1. */
  installmentsAfterDownpayment: number;
  /** 0 cuando installmentCount === 1. */
  perInstallmentCents: number;
  /** 0 cuando installmentCount === 1; la última absorbe el resto de centavos. */
  lastInstallmentCents: number;
}

/** Fila de personas adicionales: extraPartyCount = k (1..maxRows). */
export type CatalogPaymentRow = CatalogPaymentBreakdown & { extraPartyCount: number };

/** Una forma de pagar un paquete. Los números base son para 0 personas adicionales. */
export interface CatalogPaymentOption extends CatalogPaymentBreakdown {
  /** null ⇒ el plan por defecto del paquete (sin opciones activas): en POST /contracts se OMITE installmentOptionId (null es un 400). */
  installmentOptionId: string | null;
  /** La que usa POST /contracts cuando se omite installmentOptionId. */
  isDefault: boolean;
  frequency: "weekly" | "monthly";
  /** Solo si el paquete cobra por persona adicional y el servicio declara roles. */
  byExtraParties?: CatalogPaymentRow[];
}

export interface CatalogPlan {
  id: string;
  name: I18nText;
  /** Centavos de USD. Solo para mostrar: nunca se envía a la API. */
  priceCents: number;
  /** Se conserva tal cual (el bot de WhatsApp y landings viejas lo leen). La landing nueva pinta paymentOptions. */
  installmentOptions: InstallmentOption[];
  extraPartyPriceCents: number;
  /** Aditivo. Ausente o [] en una API antigua o un paquete no contratable. */
  paymentOptions?: CatalogPaymentOption[];
}

/** Una opción de una pregunta us_state: la respuesta es el código de 2 letras ("TX"). */
export interface QuestionOption { code: string; /** El rótulo real de contygo: {es, en}. */ name?: I18nText | string | null; /** Respaldo de catálogos antiguos. */ label?: I18nText | string | null; [extra: string]: unknown }

/**
 * kind dice cómo se responde: yes_no → booleano; date → "YYYY-MM-DD"; us_state → código de 2 letras
 * de `options` (guía §4, paso 0; OpenAPI X3). Obligatorio en el OpenAPI de producción. Un kind que
 * no está en esta lista no se adivina: se escala (el tipo lo deja pasar a propósito con `string`).
 * dateMode: past/birthdate → hasta hoy; future_event → desde hoy. minNotice es solo informativo:
 * quien decide es contygo.
 */
export interface CatalogQuestion {
  id: string;
  kind: "yes_no" | "date" | "us_state" | (string & {});
  prompt: I18nText;
  dateMode?: "past" | "future_event" | "birthdate" | (string & {});
  minNotice?: Record<string, unknown> | null;
  options?: QuestionOption[];
}

export interface PartyRole {
  roleKey: string;
  label: I18nText;
  cardinality: "single" | "multiple" | string;
  isRequired: boolean;
  /** Si el rol queda vacío, el titular ocupa su lugar (OpenAPI X3). */
  principalFallbackWhenEmpty?: boolean;
}

export interface CatalogService {
  id: string;
  slug: string;
  name: I18nText;
  plans: CatalogPlan[];
  eligibilityQuestions: CatalogQuestion[];
  partyRoles: PartyRole[];
}

export interface ApiError { code: string; message?: string; details?: Record<string, unknown> }

export interface MeResponse {
  principal: { id: string; name: string; channel: string };
  org: { id: string; name: string };
  actingAs: { staffUserId: string; displayName: string };
}

export interface Attribution {
  sourceUrl?: string;
  sourceId?: string;
  headline?: string;
  adId?: string;
  utm?: Record<string, string>;
}

export interface UpsertLeadBody {
  fullName: string;
  phoneE164: string;
  source: "web";
  email?: string;
  attribution?: Attribution;
  aiSummary?: string;
}

export interface UpsertLeadResult {
  leadId: string;
  created: boolean;
  linked: boolean;
  status: "open" | "won" | "lost";
  contactedAt: string | null;
  warnings: { code: string; leadId: string }[];
}

export type AnswerValue = boolean | string;

/** Por qué una pregunta descalifica (lista abierta): answer, deadline_passed, deadline_too_close, future_date, event_too_close, age_limit_too_close, age_limit_passed… */
export type DisqualifiedReason = "answer" | "deadline_passed" | "deadline_too_close" | "future_date" | "event_too_close" | "age_limit_too_close" | "age_limit_passed" | (string & {});

export interface EligibilityResult {
  eligible: boolean;
  missingQuestionIds: string[];
  disqualifiedQuestionIds: string[];
  disqualified?: { questionId: string; reason: DisqualifiedReason }[];
  notices: { questionId: string; message: { es?: string; en?: string } | null }[];
  anchorYmd: string | null;
  anchorWaived?: boolean;
}

export interface ContractParty {
  role: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
}

/** Cuerpo de POST /contracts. Estricto: un campo de más es un 400. */
export interface ContractBody {
  externalRef: string;
  client: {
    fullName: string;
    nameParts: { firstName: string; middleName?: string; lastName: string };
    email: string;
    phoneE164: string;
    address: { line1: string; apartment?: string; city: string; state: string; zip: string };
    locale: Locale;
  };
  serviceId: string;
  servicePlanId: string;
  installmentOptionId?: string;
  eligibilityAnswers: { questionId: string; answer: AnswerValue }[];
  parties?: ContractParty[];
  consent: { textVersion: string; at: string; channel: "web" };
}

export interface ContractCreated {
  clientCreated: boolean;
  caseId: string;
  caseNumber: string;
  contractId: string;
  clientId: string;
  /** Credencial al portador: solo para el botón de la persona. Nunca a logs ni a un LLM. */
  signingUrl: string;
  warnings: { code: string; caseNumber: string }[];
}

export interface ContractStatus {
  contractId: string;
  caseId: string | null;
  caseNumber: string | null;
  status: "draft" | "sent" | "signed" | "cancelled";
  sentAt: string | null;
  signedAt: string | null;
  signingExpiresAt: string | null;
  downpayment: { status: "none" | "pending" | "paid" | "waived"; amountCents: number | null; paidAt: string | null };
  externalRef: string | null;
}

export interface ResendLinkResult { contractId: string; signingUrl: string; expiresAt: string; rotated: boolean }

export interface OutboundEvent {
  eventId: string;
  type: "case.created" | "contract.signed" | "downpayment.confirmed" | string;
  occurredAt: string;
  dedupeKey: string;
  data: {
    caseId?: string | null;
    caseNumber?: string;
    contractId?: string;
    createdVia?: string;
    externalRef?: string;
    serviceSlug?: string;
    amountCents?: number;
    currency?: string;
    signedAt?: string;
  };
}
