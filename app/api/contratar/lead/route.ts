import type { NextRequest } from "next/server";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { remoteServiceFor } from "@/lib/contygo-api/catalog";
import { isExternalRef, normalizePhone, sanitizeAnswers, toEvaluateAnswers } from "@/lib/contygo-api/checkout";
import { contygoApi } from "@/lib/contygo-api/client";
import { buildLeadBody, sanitizeAttribution, syncLead } from "@/lib/contygo-api/lead";
import { LEAD_CAPTCHA_ACTION, checkLimits, clientIp, fail, guarded, json, readBrowserJson, verifyCaptcha } from "@/lib/contygo-api/server";

// En cuanto el recorrido tiene nombre y teléfono: PUT /leads/{externalRef}, con el externalRef
// que la UI generó al empezar. Si contygo no lo registra, el recorrido sigue: el alta lo repite.
// Escribe en el CRM real: en producción exige un Turnstile invisible propio (acción «lead»).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cleanName = (value: unknown) => typeof value === "string"
  ? value.replace(new RegExp("[^\\p{L}\\p{M} '.-]", "gu"), "").replace(/\s+/g, " ").trim().slice(0, 120) : "";

/** El veredicto para ventas lo da contygo con las respuestas que trae la UI, nunca la UI. */
async function verdict(localServiceId: string, input: unknown): Promise<boolean | null> {
  try {
    const service = await remoteServiceFor(localServiceId);
    if (!service?.eligibilityQuestions.length) return null;
    const answers = sanitizeAnswers(service.eligibilityQuestions, input);
    if (!service.eligibilityQuestions.every(question => answers[question.id] !== undefined)) return null;
    const response = await contygoApi.evaluateEligibility({ serviceId: service.id, answers: toEvaluateAnswers(service.eligibilityQuestions, answers) });
    return response.status === 200 && response.data ? response.data.eligible : null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = await readBrowserJson(req);
    if ("response" in parsed) return parsed.response;
    const { body } = parsed;
    const local = CONTYGO_SERVICES.find(service => service.id === body.serviceId);
    if (!local) return fail("invalid_service", 400);
    if (!isExternalRef(body.externalRef)) return fail("invalid_reference", 400);
    const fullName = cleanName(body.displayName);
    const phoneE164 = normalizePhone(body.phone);
    if (!fullName) return fail("invalid", 400, { errors: { displayName: "Escribe tu nombre." } });
    if (!phoneE164) return fail("invalid", 400, { errors: { phone: "Escribe un teléfono válido, con código de país si no es de EE. UU." } });
    const ip = clientIp(req);
    const limited = checkLimits([{ key: `lead:ip:${ip}`, windowSeconds: 3600, max: 20 }]);
    if (limited) return limited;
    const captcha = await verifyCaptcha(body.captchaToken, ip, LEAD_CAPTCHA_ACTION);
    if (!captcha.ok) return fail(captcha.code, captcha.code === "captcha_not_configured" || captcha.code === "captcha_unavailable" ? 503 : 403);

    const eligible = await verdict(local.id, body.answers);
    const result = await syncLead(body.externalRef, buildLeadBody({ fullName, phoneE164 }, { localServiceId: local.id, eligible, attribution: sanitizeAttribution(body.attribution) }));
    return result.ok ? json({ ok: true }) : fail("lead_not_registered", 502, { code: result.code });
  });
}
