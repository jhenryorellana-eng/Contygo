import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { isIdempotencyKey } from "@/lib/contygo-api/checkout";
import { confirmContract } from "@/lib/contygo-api/flow";
import { checkVerificationTicket } from "@/lib/contygo-api/tokens";
import { checkLimits, clientIp, fail, guarded, json, readBrowserJson } from "@/lib/contygo-api/server";

// «Contratar», 2.ª llamada: el cuerpo que guardó la UI + el código de 6 dígitos, con la clave
// nueva que trae la UI. La respuesta lleva la signingUrl SOLO para el botón de esta persona.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = await readBrowserJson(req);
    if ("response" in parsed) return parsed.response;
    const { body } = parsed;
    if (!isIdempotencyKey(body.idempotencyKey)) return fail("invalid_idempotency_key", 400);
    // contygo corta en 5 intentos por código; aquí, además, un freno por IP y por verificación. La clave por
    // verificación solo se crea si el ticket es nuestro (una comprobación HMAC barata): con un verificationId
    // inventado un barrido de peticiones no puede llenar la memoria de la instancia.
    const rules = [{ key: `confirm:ip:${clientIp(req)}`, windowSeconds: 3600, max: 30 }];
    if (typeof body.verificationId === "string" && body.verificationId.length <= 200 && body.body && typeof body.body === "object" && checkVerificationTicket(body.ticket, body.verificationId, body.body)) {
      rules.push({ key: `confirm:v:${createHash("sha256").update(body.verificationId).digest("base64url").slice(0, 22)}`, windowSeconds: 900, max: 8 });
    }
    const limited = checkLimits(rules);
    if (limited) return limited;

    const outcome = await confirmContract({ body: body.body, verificationId: body.verificationId, ticket: body.ticket, code: body.code }, body.idempotencyKey);
    const headers: Record<string, string> = outcome.step === "RETRY_LATER" && outcome.retryAfter ? { "Retry-After": String(outcome.retryAfter) } : {};
    return json({ ok: true, outcome }, 200, headers);
  });
}
