/* ============================================================
   ContyGo · verificación de webhooks (guía §7, OpenAPI OutboundEvent)
   X-Signature = "sha256=" + HMAC_SHA256(secreto, X-Timestamp + "." + cuerpo_crudo)
   · Siempre sobre los bytes CRUDOS, antes de parsear.
   · Ventana anti-replay de ±300 s sobre X-Timestamp (segundos).
   · Comparación en tiempo constante.
   ============================================================ */
import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_WINDOW_SECONDS = 300;
export const WEBHOOK_TYPES = ["case.created", "contract.signed", "downpayment.confirmed"] as const;

export function signWebhook(secret: string, timestamp: string, raw: string) {
  return "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
}

export function verifyWebhookSignature(options: { raw: string; timestamp: string | null; signature: string | null; secret: string; nowSeconds?: number }): "ok" | "stale" | "bad_signature" {
  const { raw, timestamp, signature, secret } = options;
  if (!timestamp || !/^\d{1,12}$/.test(timestamp)) return "stale";
  const now = options.nowSeconds ?? Date.now() / 1000;
  if (Math.abs(now - Number(timestamp)) > WEBHOOK_WINDOW_SECONDS) return "stale";
  if (!signature) return "bad_signature";
  const received = Buffer.from(signature), expected = Buffer.from(signWebhook(secret, timestamp, raw));
  return received.length === expected.length && timingSafeEqual(received, expected) ? "ok" : "bad_signature";
}
