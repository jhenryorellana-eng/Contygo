/* ============================================================
   ContyGo · decisiones sobre la Idempotency-Key de la ficha (guía §8)
   Funciones puras (sin React ni red) para poder probarlas: la misma clave y el
   mismo cuerpo se repiten SOLO tras un corte; cualquier respuesta definitiva de
   contygo estrena clave en el intento siguiente.
   ============================================================ */

/** The key of an attempt that may be repeated as it is after a cut: same key, same body. */
export type Pending =
  | { op: "start"; key: string; fingerprint: string }
  | { op: "confirm"; key: string; code: string; verificationId: string };

/** The key for «Enviar mi código»: the same form and answers after a cut reuse theirs; anything else is new. */
export function startKey(last: Pending | null, fingerprint: string, fresh: () => string): string {
  return last?.op === "start" && last.fingerprint === fingerprint ? last.key : fresh();
}

/** The key for the code: the same code for the same verification after a cut reuses its key; a new code gets a new one. */
export function confirmKey(last: Pending | null, code: string, verificationId: string, fresh: () => string): string {
  return last?.op === "confirm" && last.code === code && last.verificationId === verificationId ? last.key : fresh();
}

export type AnswerShape = { status: number; outcome?: { step: string; reason?: string } | null; error?: string };

/**
 * After an answer: does the next attempt repeat the same key (true) or get a new one (false)?
 * Same key: «busy» (RETRY_LATER/busy), 502/503/504 or a page that is not JSON (our route did not answer),
 * a 429 or a captcha 403 from our own route (nothing reached contygo). New key: anything contygo answered
 * for good (fresh_key, WRONG_CODE, ERROR, RESTART, FIX_CONTACT…) and 4xx without an outcome (400, 404, 413…).
 */
/**
 * After an answer to the code (2.ª llamada): retry it by itself, same key and same body? Only when contygo
 * or our route is still working on it («busy», 5xx or no JSON). A 429 or a captcha 403 are not retried alone:
 * the person decides. Everything else is a final answer.
 */
export function retriesConfirmAlone({ status, outcome }: AnswerShape): boolean {
  if (outcome) return status === 200 && outcome.step === "RETRY_LATER" && outcome.reason === "busy";
  return status >= 500 || status === 200;
}

/** Seconds to wait before that automatic retry: what the server asked, between 2 and 8. */
export const confirmRetryDelay = (retryAfter: number | null | undefined) => Math.min(8, Math.max(2, retryAfter ?? 2));

export function keepsKey({ status, outcome, error }: AnswerShape): boolean {
  const busy = outcome?.step === "RETRY_LATER" && outcome.reason === "busy";
  if (outcome && !busy) return false;
  if (status === 429) return true;
  if (status === 403 && typeof error === "string" && error.startsWith("captcha")) return true;
  if (!outcome && (status >= 500 || status === 200)) return true;
  if (status !== 200 || !outcome) return false;
  return true;
}
