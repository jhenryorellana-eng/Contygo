import type { NextRequest } from "next/server";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { publicServiceView, remoteServiceFor } from "@/lib/contygo-api/catalog";
import { checkLimits, clientIp, fail, guarded, json, readBrowserJson } from "@/lib/contygo-api/server";
import { CONTRACT_TERMS } from "@/lib/contygo-api/terms";

// La ficha pide aquí el servicio tal como lo vende contygo (paquetes, pagos, personas y
// preguntas con su kind). Nada de la persona: su conversación la guarda su navegador (§2 bis).
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
    const remote = await remoteServiceFor(local.id);
    if (!remote) return fail("service_not_contractable", 404);
    return json({ ok: true, service: publicServiceView(remote), terms: CONTRACT_TERMS, captchaSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null });
  });
}
