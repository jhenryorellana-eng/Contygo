/* ============================================================
   ContyGo · cliente de la API de contratación (SOLO servidor)
   Una función por endpoint. La clave vive en CONTYGO_API_KEY y
   nunca sale del servidor (la API no tiene CORS a propósito).

   Reglas (guía §8 y OpenAPI):
   · Timeout o fallo de red → se repite con la MISMA Idempotency-Key
     y los MISMOS bytes. Solo en llamadas idempotentes.
   · 409 IN_PROGRESS → la misma clave se está procesando: se espera
     Retry-After y se repite con la misma clave.
   · 429 → NUNCA se reintenta aquí: cada intento cuenta.
   · Plazo (deadline): una petición del navegador tiene un presupuesto
     global; ningún intento empieza si no cabe antes de que se agote.
   · Este módulo no escribe nada en consola: signingUrl y
     verificationId son credenciales.
   ============================================================ */
import type {
  ApiError, CatalogService, ContractBody, ContractCreated, ContractStatus, EligibilityResult,
  MeResponse, ResendLinkResult, UpsertLeadBody, UpsertLeadResult,
} from "./types";

import { CONTYGO_API_BASE, customApiHost, effectiveApiBase } from "./api-base";

export { CONTYGO_API_BASE, effectiveApiBase };

export interface ApiResponse<T> {
  /** 0 = no hubo respuesta HTTP (red o timeout agotados). */
  status: number;
  data: T | null;
  error: ApiError | null;
  /** Segundos de la cabecera Retry-After, si vino. */
  retryAfter: number | null;
}

export class ContygoNotConfiguredError extends Error {
  constructor() { super("CONTYGO_API_KEY no está configurada"); this.name = "ContygoNotConfiguredError"; }
}

export const contygoConfigured = () => Boolean(process.env.CONTYGO_API_KEY);

/** Un plazo global (ms desde epoch) compartido por todas las llamadas de una petición del navegador. */
export interface CallBudget { deadline?: number }

/** Un intento con menos de esto por delante no se empieza: no podría terminar. */
export const MIN_ATTEMPT_MS = 2_000;

type CallOptions = CallBudget & {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  idempotencyKey?: string;
  /** Solo las llamadas sin efectos o con clave de idempotencia se repiten ante un corte. */
  retriable: boolean;
  timeoutMs?: number;
  attempts?: number;
  /** false: tras un corte o un timeout NO se repite (la clave quedaría ocupada). Por defecto, igual que `retriable`. */
  retryNetwork?: boolean;
  /** true: un 500 también se repite con la misma clave y los mismos bytes (2.ª llamada de /contracts). */
  retry500?: boolean;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function readError(json: unknown, status: number): ApiError {
  const error = json && typeof json === "object" ? (json as { error?: unknown }).error : null;
  if (error && typeof error === "object" && typeof (error as ApiError).code === "string") {
    const { code, message, details } = error as ApiError;
    return { code, ...(typeof message === "string" ? { message } : {}), ...(details && typeof details === "object" ? { details } : {}) };
  }
  return { code: `HTTP_${status}` };
}

/** Esperas cortas: la función del servidor tiene su propio límite de duración. */
const WAIT_CAP_SECONDS = 3;

/** Fuera de producción solo se escribe contra un contygo en esta máquina (lista blanca). */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * En producción cada alta crea un cliente, un caso y un contrato reales, y cada lead una
 * tarjeta real. Solo se escribe si VERCEL_ENV === "production" (los Preview nunca escriben; ahí
 * la clave solo va a contygo.app, ver api-base.ts), con CONTYGO_ALLOW_WRITES=1 (prueba coordinada)
 * o contra un contygo LOCAL: CONTYGO_API_BASE con host localhost o 127.0.0.1 (lista blanca, no lista
 * negra: cualquier otro nombre —un alias, una IP, «contygo.app.»— podría ser el mismo producción).
 * Sin nada de eso solo se lee (catálogo y elegibilidad).
 */
export function writesBlocked(method: string, path: string) {
  if (method === "GET" || path === "/eligibility/evaluate") return false;
  if (process.env.VERCEL_ENV === "production" || process.env.CONTYGO_ALLOW_WRITES === "1") return false;
  const host = customApiHost();
  return !(host && LOCAL_HOSTS.has(host));
}

async function call<T>(path: string, options: CallOptions): Promise<ApiResponse<T>> {
  const key = process.env.CONTYGO_API_KEY;
  if (!key) throw new ContygoNotConfiguredError();
  if (writesBlocked(options.method ?? "GET", path)) {
    console.warn(`[contygo] ${options.method} ${path.split("/").slice(0, 2).join("/")} bloqueado en desarrollo: define CONTYGO_ALLOW_WRITES=1 solo para la prueba coordinada con contygo`);
    return { status: 0, data: null, error: { code: "DEV_WRITES_DISABLED" }, retryAfter: null };
  }
  const base = effectiveApiBase();
  // Serializado UNA vez: cada reintento manda exactamente los mismos bytes.
  const payload = options.body === undefined ? undefined : JSON.stringify(options.body);
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const attempts = Math.max(1, options.attempts ?? 3);
  const remaining = () => options.deadline === undefined ? Infinity : options.deadline - Date.now();
  const networkRetry = options.retriable && options.retryNetwork !== false;
  // Lo último que se supo de contygo: si el plazo se agota esperando, esto es lo que se informa.
  let previous: ApiResponse<T> | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const last = attempt === attempts;
    // Nunca se empieza un intento que no cabe en el plazo.
    if (remaining() < MIN_ATTEMPT_MS) return previous ?? { status: 0, data: null, error: { code: "DEADLINE" }, retryAfter: null };
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: payload,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(Math.max(1, Math.min(options.timeoutMs ?? 15_000, remaining()))),
      });
    } catch {
      const cut: ApiResponse<T> = { status: 0, data: null, error: { code: "NETWORK" }, retryAfter: null };
      if (!networkRetry || last) return cut;
      previous = cut;
      await sleep(Math.min(attempt * 500, Math.max(0, remaining() - MIN_ATTEMPT_MS)));
      continue;
    }
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    const text = await response.text().catch(() => "");
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (response.ok) return { status: response.status, data: json as T, error: null, retryAfter };
    const error = readError(json, response.status);
    const busy = response.status === 409 && (error.code === "IN_PROGRESS" || error.code === "REQUEST_IN_PROGRESS");
    const down = response.status === 503 || (options.retry500 === true && response.status === 500);
    const result: ApiResponse<T> = { status: response.status, data: null, error, retryAfter };
    if ((busy || (down && options.retriable)) && !last && (retryAfter ?? 1) <= WAIT_CAP_SECONDS) {
      const wait = Math.max(1, retryAfter ?? 1) * 1000;
      // Si esperar deja sin plazo para otro intento, se informa lo que contygo dijo.
      if (remaining() - wait < MIN_ATTEMPT_MS) return result;
      previous = result;
      await sleep(wait);
      continue;
    }
    return result;
  }
  return { status: 0, data: null, error: { code: "NETWORK" }, retryAfter: null };
}

const ref = (value: string) => encodeURIComponent(value);

export const contygoApi = {
  /** Comprueba la clave: 200 con principal.channel = "web". */
  me: () => call<MeResponse>("/me", { retriable: true, attempts: 2 }),

  catalog: (budget: CallBudget = {}) => call<{ services: CatalogService[] }>("/catalog", { retriable: true, attempts: 2, ...budget }),

  /** Idempotente por externalRef: repetirla actualiza el mismo lead. */
  upsertLead: (externalRef: string, body: UpsertLeadBody, budget: CallBudget = {}) =>
    call<UpsertLeadResult>(`/leads/${ref(externalRef)}`, { method: "PUT", body, retriable: true, ...budget }),

  /** No persiste nada: se puede repetir. Aquí los campos son answers[{questionId, value}]. */
  evaluateEligibility: (body: { serviceId: string; answers: { questionId: string; value: boolean | string }[] }, budget: CallBudget = {}) =>
    call<EligibilityResult>("/eligibility/evaluate", { method: "POST", body, retriable: true, attempts: 2, ...budget }),

  /**
   * Alta en dos llamadas. Cada llamada lleva su propia clave.
   * · 1.ª (sin verificationCode): tras un corte o un timeout NO se repite con la misma clave
   *   (contygo no guarda ese 409 y la clave quedaría en IN_PROGRESS 120 s): el flujo estrena clave.
   * · 2.ª (con verificationCode): un corte, un 503, un 500 o IN_PROGRESS repiten con la MISMA
   *   clave y los mismos bytes (contygo retoma desde el cliente ya creado).
   */
  createContract: (body: ContractBody & { verificationId?: string; verificationCode?: string }, idempotencyKey: string, options: CallBudget & { phase?: "first" | "second" } = {}) => {
    const second = options.phase === "second" || (options.phase === undefined && body.verificationCode !== undefined);
    return call<ContractCreated>("/contracts", {
      // The 2.ª llamada creates client, case and contract: it may legitimately take longer (always within the deadline).
      method: "POST", body, idempotencyKey, retriable: true, timeoutMs: second ? 40_000 : 25_000,
      retryNetwork: second, retry500: second, deadline: options.deadline,
    });
  },

  /** Sin PII ni URL de firma. No más de una vez por minuto por contrato. */
  getContract: (contractId: string) =>
    call<ContractStatus>(`/contracts/${ref(contractId)}`, { retriable: true, attempts: 2 }),

  /** Reenvío del enlace de firma. Sin cuerpo; Idempotency-Key obligatoria. */
  resendSigningLink: (contractId: string, idempotencyKey: string, budget: CallBudget = {}) =>
    call<ResendLinkResult>(`/contracts/${ref(contractId)}/link`, { method: "POST", idempotencyKey, retriable: true, ...budget }),
};
