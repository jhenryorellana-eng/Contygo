import type { NextRequest } from "next/server";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { CatalogUnavailableError, publicServiceView, remoteServiceFor } from "@/lib/contygo-api/catalog";
import { checkoutEnabled } from "@/lib/contygo-api/checkout";
import { checkLimits, clientIp, fail, guarded, json, readBrowserJson } from "@/lib/contygo-api/server";
import { CONTRACT_TERMS } from "@/lib/contygo-api/terms";

// La ficha pide aquí el servicio tal como lo vende contygo (paquetes, pagos, personas y
// preguntas con su kind). Nada de la persona: su conversación la guarda su navegador (§2 bis).
// checkoutEnabled:false (interruptor CONTYGO_CHECKOUT_ENABLED=0, o 401/403 del catálogo) → service:null y
// la ficha ofrece WhatsApp desde el primer momento; `reason` dice cuál de los dos.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = await readBrowserJson(req);
    if ("response" in parsed) return parsed.response;
    const limited = checkLimits([{ key: `svc:ip:${clientIp(req)}`, windowSeconds: 600, max: 60 }]);
    if (limited) return limited;
    const local = CONTYGO_SERVICES.find(service => service.id === parsed.body.serviceId);
    if (!local) return fail("invalid_service", 400);
    const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
    if (!checkoutEnabled()) return json({ ok: true, checkoutEnabled: false, reason: "checkout_disabled", service: null, terms: CONTRACT_TERMS, captchaSiteKey });
    let remote;
    try {
      remote = await remoteServiceFor(local.id);
    } catch (error) {
      // 401/403: la clave o el canal están mal; no se disfraza de «revisa tu conexión».
      if (error instanceof CatalogUnavailableError && error.isConfig) {
        console.error(`[contygo:config] catalog ${error.code.replace(/[^A-Za-z0-9_]/g, "").slice(0, 60)}`);
        return json({ ok: true, checkoutEnabled: false, reason: "unavailable_online", service: null, terms: CONTRACT_TERMS, captchaSiteKey });
      }
      throw error;
    }
    if (!remote) return fail("service_not_contractable", 404);
    return json({ ok: true, checkoutEnabled: true, service: publicServiceView(remote), terms: CONTRACT_TERMS, captchaSiteKey });
  });
}
