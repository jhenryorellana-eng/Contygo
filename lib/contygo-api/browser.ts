/* ============================================================
   ContyGo · lo que recuerda el NAVEGADOR durante la contratación
   Guía §2 bis: la UI guarda el estado del flujo (datos de la ficha,
   verificationId, el cuerpo exacto de la 1.ª llamada y, al final, el
   token del contrato). sessionStorage, NUNCA localStorage: dura lo
   que la pestaña y se borra al terminar.
   · Las Idempotency-Key de cada intento viven solo en memoria.
   · La signingUrl no se guarda nunca: vive en memoria, para el botón.
   Sin dependencias del servidor: lo usan la ficha y la página de «gracias».
   ============================================================ */
import type { AnswerValue, ContractBody, Locale } from "./types";

export type DraftForm = {
  firstName: string; middleName: string; lastName: string; email: string; phone: string;
  line1: string; apartment: string; city: string; state: string; zip: string;
  locale: Locale; planId: string; installmentId: string;
};
export type DraftPerson = { key: number; role: string; firstName: string; middleName: string; lastName: string; dateOfBirth: string };

/** Lo que contygo respondió a la 1.ª llamada y hace falta para canjear el código. */
export type SentVerification = { body: ContractBody; ticket: string; verificationId: string; maskedEmail: string; expiresAt: string | null };

export type CheckoutDraft = {
  v: 1;
  serviceId: string;
  externalRef: string;
  form: DraftForm;
  persons: DraftPerson[];
  consent: { accepted: boolean; at: string };
  sent?: SentVerification;
};

/** Al terminar solo queda esto (sin datos personales), para la página de «gracias». */
export type SavedContract = { v: 1; serviceId: string; token: string; caseNumber: string; clientCreated: boolean };

/**
 * La guía de un servicio (15-10-2026): la conversación, la etapa y la variante elegida. Quien cierra la guía sin querer
 * (la X, Escape) la retoma donde la dejó al volver a abrir ese servicio en la misma pestaña. `session` es la conversación
 * tal como la guarda la guía (VisaIntakeSession): este módulo no depende de los componentes.
 */
export type SavedJourney<Session = unknown> = {
  v: 1;
  serviceId: string;
  savedAt: number;
  stage: "service" | "platform" | "decision";
  session: Session;
  /** Visa Juvenil: la variante elegida para el contrato (Básico o Premium) y sus respuestas. */
  variant?: { serviceId: string; answers: Record<string, AnswerValue> };
};

const DRAFT_KEY = "contygo-contratacion";
const CONTRACT_KEY = "contygo-contrato";
const JOURNEY_KEY = "contygo-recorrido";
/** Una guía de hace más de un día no se retoma: las fechas y la evaluación pueden haber cambiado. */
const JOURNEY_MAX_AGE_MS = 24 * 60 * 60_000;

// En modo privado, con el almacenamiento bloqueado o en una vista previa, sessionStorage puede
// faltar o lanzar: la ficha sigue funcionando en memoria.
function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
}
function read<T extends { v: 1 }>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    const value = raw ? JSON.parse(raw) as T : null;
    return value && typeof value === "object" && value.v === 1 ? value : null;
  } catch { return null; }
}
function write(key: string, value: unknown) { try { storage()?.setItem(key, JSON.stringify(value)); } catch { /* sigue en memoria */ } }
function remove(key: string) { try { storage()?.removeItem(key); } catch { /* nada que borrar */ } }

export const readDraft = () => read<CheckoutDraft>(DRAFT_KEY);
export const saveDraft = (draft: CheckoutDraft) => write(DRAFT_KEY, draft);
export const clearDraft = () => remove(DRAFT_KEY);

/** La guía guardada de ESTE servicio, si es reciente; si no, null. */
export function readJourney<Session>(serviceId: string): SavedJourney<Session> | null {
  const saved = read<SavedJourney<Session>>(JOURNEY_KEY);
  if (!saved || saved.serviceId !== serviceId || !saved.session || typeof saved.session !== "object") return null;
  return typeof saved.savedAt === "number" && Date.now() - saved.savedAt < JOURNEY_MAX_AGE_MS ? saved : null;
}
export function saveJourney<Session>(journey: Omit<SavedJourney<Session>, "v" | "savedAt">) { write(JOURNEY_KEY, { v: 1, savedAt: Date.now(), ...journey }); }
export const clearJourney = () => remove(JOURNEY_KEY);

export const readContract = () => read<SavedContract>(CONTRACT_KEY);
export const saveContract = (contract: SavedContract) => write(CONTRACT_KEY, contract);
export const clearContract = () => remove(CONTRACT_KEY);

/**
 * Idempotency-Key de cada intento (guía §2 bis: crypto.randomUUID()). randomUUID solo existe en
 * contextos seguros (https o localhost); probando en el celular por la red local (http://192.168…)
 * se genera el mismo UUID v4 con getRandomValues, que sí existe ahí.
 */
export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** El externalRef de la conversación: la UI lo genera al empezar (guía §2 bis). */
export const newExternalRef = () => `web-${newIdempotencyKey()}`;

/** Para la atribución del lead: la página sin query ni fragmento, y solo las claves utm_*. */
export function pageAttribution(): { sourceUrl: string; utm: Record<string, string> } | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(Array.from(params.entries()).filter(([key]) => key.startsWith("utm_")));
  return { sourceUrl: `${window.location.origin}${window.location.pathname}`, utm };
}
