import type { NextRequest } from "next/server";
import { contractService } from "@/lib/contygo-catalog";
import { CatalogUnavailableError, publicServiceView, remoteServiceFor } from "@/lib/contygo-api/catalog";
import { checkoutEnabled, planIds, sanitizeAnswers, toEvaluateAnswers } from "@/lib/contygo-api/checkout";
import { contygoApi } from "@/lib/contygo-api/client";
import { logConfig } from "@/lib/contygo-api/log";
import { checkLimits, clientIp, fail, guarded, json, readBrowserJson } from "@/lib/contygo-api/server";
import { CONTRACT_TERMS } from "@/lib/contygo-api/terms";
import type { CatalogService } from "@/lib/contygo-api/types";

// La ficha pide aquí el servicio tal como lo vende contygo (paquetes, pagos, personas y
// preguntas con su kind). Nada de la persona: su conversación la guarda su navegador (§2 bis).
// checkoutEnabled:false (interruptor CONTYGO_CHECKOUT_ENABLED=0, o 401/403 del catálogo) → service:null y
// la ficha ofrece WhatsApp desde el primer momento; `reason` dice cuál de los dos.
// Con `answers` (15-10-2026): la ficha no trae el veredicto del chat (contygo no respondió entonces, u otra variante del
// servicio) o acaba de pedir respuestas que faltaban. Aquí se evalúan, para que un «no» se diga antes de que la persona
// escriba sus datos y no al final. `eligibility`: {eligible, reasons, allowedPlanIds?}, o null si no se pudo (faltan
// respuestas o contygo no responde): entonces /iniciar evalúa igual antes de enviar el código.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Plazo de esta evaluación: la ficha espera, así que se corta pronto y /iniciar repite la evaluación. */
const VERDICT_BUDGET_MS = 10_000;

async function earlyVerdict(remote: CatalogService, input: unknown) {
  const questions = remote.eligibilityQuestions;
  const answers = sanitizeAnswers(questions, input);
  if (!questions.length || !questions.every(question => answers[question.id] !== undefined)) return null;
  try {
    const response = await contygoApi.evaluateEligibility({ serviceId: remote.id, answers: toEvaluateAnswers(questions, answers) }, { deadline: Date.now() + VERDICT_BUDGET_MS });
    if (response.status !== 200 || !response.data || typeof response.data.eligible !== "boolean") return null;
    const allowed = planIds(response.data.allowedPlanIds);
    return {
      eligible: response.data.eligible,
      reasons: (response.data.disqualified ?? []).map(item => item?.reason).filter((reason): reason is string => typeof reason === "string").slice(0, 10),
      ...(allowed.length ? { allowedPlanIds: allowed } : {}),
    };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = await readBrowserJson(req);
    if ("response" in parsed) return parsed.response;
    const limited = checkLimits([{ key: `svc:ip:${clientIp(req)}`, windowSeconds: 600, max: 60 }]);
    if (limited) return limited;
    const local = contractService(parsed.body.serviceId);
    if (!local) return fail("invalid_service", 400);
    const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
    if (!checkoutEnabled()) return json({ ok: true, checkoutEnabled: false, reason: "checkout_disabled", service: null, terms: CONTRACT_TERMS, captchaSiteKey });
    let remote;
    try {
      remote = await remoteServiceFor(local.id);
    } catch (error) {
      // 401/403: la clave o el canal están mal; no se disfraza de «revisa tu conexión».
      if (error instanceof CatalogUnavailableError && error.isConfig) {
        logConfig("catalog", error.code);
        return json({ ok: true, checkoutEnabled: false, reason: "unavailable_online", service: null, terms: CONTRACT_TERMS, captchaSiteKey });
      }
      throw error;
    }
    if (!remote) return fail("service_not_contractable", 404);
    const eligibility = parsed.body.answers === undefined ? undefined : await earlyVerdict(remote, parsed.body.answers);
    return json({ ok: true, checkoutEnabled: true, service: publicServiceView(remote), terms: CONTRACT_TERMS, captchaSiteKey, ...(eligibility === undefined ? {} : { eligibility }) });
  });
}
