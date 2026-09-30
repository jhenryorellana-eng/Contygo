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
   · Este módulo no escribe nada en consola: signingUrl y
     verificationId son credenciales.
   ============================================================ */
import type {
  ApiError, CatalogService, ContractBody, ContractCreated, ContractStatus, EligibilityResult,
  MeResponse, ResendLinkResult, UpsertLeadBody, UpsertLeadResult,
} from "./types";

export const CONTYGO_API_BASE = "https://contygo.app/api/integrations/v1";

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

type CallOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  idempotencyKey?: string;
  /** Solo las llamadas sin efectos o con clave de idempotencia se repiten ante un corte. */
  retriable: boolean;
  timeoutMs?: number;
  attempts?: number;
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

/**
 * En producción cada alta crea un cliente, un caso y un contrato reales, y cada lead una
 * tarjeta real. Fuera de producción, contra el contygo real, solo se lee (catálogo y
 * elegibilidad) salvo que la prueba esté coordinada: CONTYGO_ALLOW_WRITES=1.
 */
export function writesBlocked(method: string, path: string) {
  if (method === "GET" || path === "/eligibility/evaluate") return false;
  return process.env.NODE_ENV !== "production" && !process.env.CONTYGO_API_BASE && process.env.CONTYGO_ALLOW_WRITES !== "1";
}

async function call<T>(path: string, options: CallOptions): Promise<ApiResponse<T>> {
  const key = process.env.CONTYGO_API_KEY;
  if (!key) throw new ContygoNotConfiguredError();
  if (writesBlocked(options.method ?? "GET", path)) {
    console.warn(`[contygo] ${options.method} ${path.split("/").slice(0, 2).join("/")} bloqueado en desarrollo: define CONTYGO_ALLOW_WRITES=1 solo para la prueba coordinada con contygo`);
    return { status: 0, data: null, error: { code: "DEV_WRITES_DISABLED" }, retryAfter: null };
  }
  const base = (process.env.CONTYGO_API_BASE || CONTYGO_API_BASE).replace(/\/+$/, "");
  // Serializado UNA vez: cada reintento manda exactamente los mismos bytes.
  const payload = options.body === undefined ? undefined : JSON.stringify(options.body);
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const attempts = Math.max(1, options.attempts ?? 3);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const last = attempt === attempts;
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: payload,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
    } catch {
      if (!options.retriable || last) return { status: 0, data: null, error: { code: "NETWORK" }, retryAfter: null };
      await sleep(attempt * 500);
      continue;
    }
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    const text = await response.text().catch(() => "");
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (response.ok) return { status: response.status, data: json as T, error: null, retryAfter };
    const error = readError(json, response.status);
    const busy = response.status === 409 && (error.code === "IN_PROGRESS" || error.code === "REQUEST_IN_PROGRESS");
    const down = response.status === 503;
    if ((busy || (down && options.retriable)) && !last && (retryAfter ?? 1) <= WAIT_CAP_SECONDS) {
      await sleep(Math.max(1, retryAfter ?? 1) * 1000);
      continue;
    }
    return { status: response.status, data: null, error, retryAfter };
  }
  return { status: 0, data: null, error: { code: "NETWORK" }, retryAfter: null };
}

const ref = (value: string) => encodeURIComponent(value);

export const contygoApi = {
  /** Comprueba la clave: 200 con principal.channel = "web". */
  me: () => call<MeResponse>("/me", { retriable: true, attempts: 2 }),

  catalog: () => call<{ services: CatalogService[] }>("/catalog", { retriable: true, attempts: 2 }),

  /** Idempotente por externalRef: repetirla actualiza el mismo lead. */
  upsertLead: (externalRef: string, body: UpsertLeadBody) =>
    call<UpsertLeadResult>(`/leads/${ref(externalRef)}`, { method: "PUT", body, retriable: true }),

  /** No persiste nada: se puede repetir. Aquí los campos son answers[{questionId, value}]. */
  evaluateEligibility: (body: { serviceId: string; answers: { questionId: string; value: boolean | string }[] }) =>
    call<EligibilityResult>("/eligibility/evaluate", { method: "POST", body, retriable: true, attempts: 2 }),

  /** Alta en dos llamadas. Cada llamada lleva su propia clave; un corte repite la misma. */
  createContract: (body: ContractBody & { verificationId?: string; verificationCode?: string }, idempotencyKey: string) =>
    call<ContractCreated>("/contracts", { method: "POST", body, idempotencyKey, retriable: true, timeoutMs: 25_000 }),

  /** Sin PII ni URL de firma. No más de una vez por minuto por contrato. */
  getContract: (contractId: string) =>
    call<ContractStatus>(`/contracts/${ref(contractId)}`, { retriable: true, attempts: 2 }),

  /** Reenvío del enlace de firma. Sin cuerpo; Idempotency-Key obligatoria. */
  resendSigningLink: (contractId: string, idempotencyKey: string) =>
    call<ResendLinkResult>(`/contracts/${ref(contractId)}/link`, { method: "POST", idempotencyKey, retriable: true }),
};
