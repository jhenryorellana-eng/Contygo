import type { NextRequest } from "next/server";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { isExternalRef, isIdempotencyKey } from "@/lib/contygo-api/checkout";
import { startContract } from "@/lib/contygo-api/flow";
import { sanitizeAttribution } from "@/lib/contygo-api/lead";
import { checkLimits, clientIp, fail, guarded, json, readBrowserJson, verifyCaptcha } from "@/lib/contygo-api/server";

// «Contratar», 1.ª llamada: contygo envía el código al correo. CAPTCHA y límite propio por IP van
// delante: la web es pública y cada envío escribe a un buzón real. La Idempotency-Key la trae la UI.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = await readBrowserJson(req);
    if ("response" in parsed) return parsed.response;
    const { body } = parsed;
    const ip = clientIp(req);
    const limited = checkLimits([{ key: `start:ip:${ip}`, windowSeconds: 3600, max: 10 }]);
    if (limited) return limited;
    const local = CONTYGO_SERVICES.find(service => service.id === body.serviceId);
    if (!local) return fail("invalid_service", 400);
    if (!isExternalRef(body.externalRef)) return fail("invalid_reference", 400);
    if (!isIdempotencyKey(body.idempotencyKey)) return fail("invalid_idempotency_key", 400);
    const captcha = await verifyCaptcha(body.captchaToken, ip);
    if (!captcha.ok) return fail(captcha.code, captcha.code === "captcha_not_configured" || captcha.code === "captcha_unavailable" ? 503 : 403);

    const outcome = await startContract({
      localServiceId: local.id, externalRef: body.externalRef, form: body.form, answers: body.answers, attribution: sanitizeAttribution(body.attribution),
    }, body.idempotencyKey);
    const headers: Record<string, string> = outcome.step === "RETRY_LATER" && outcome.retryAfter ? { "Retry-After": String(outcome.retryAfter) } : {};
    return json({ ok: true, outcome }, 200, headers);
  });
}
