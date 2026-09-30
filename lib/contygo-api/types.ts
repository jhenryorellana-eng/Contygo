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

export interface CatalogPlan {
  id: string;
  name: I18nText;
  /** Centavos de USD. Solo para mostrar: nunca se envía a la API. */
  priceCents: number;
  installmentOptions: InstallmentOption[];
  extraPartyPriceCents: number;
}

/** kind dice cómo se responde: yes_no → booleano; date → "YYYY-MM-DD" (guía §4, paso 0). Obligatorio en el OpenAPI de producción. */
export interface CatalogQuestion { id: string; kind: "yes_no" | "date"; prompt: I18nText }

export interface PartyRole {
  roleKey: string;
  label: I18nText;
  cardinality: "single" | "multiple" | string;
  isRequired: boolean;
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

export interface EligibilityResult {
  eligible: boolean;
  missingQuestionIds: string[];
  disqualifiedQuestionIds: string[];
  notices: { questionId: string; message: { es?: string; en?: string } | null }[];
  anchorYmd: string | null;
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
