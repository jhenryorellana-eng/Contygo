import type { NextRequest } from "next/server";
import { CatalogUnavailableError, loadCatalog, priceSummary } from "@/lib/contygo-api/catalog";
import { logConfig } from "@/lib/contygo-api/log";
import { checkLimits, clientIp, fail, json } from "@/lib/contygo-api/server";

// Precios VIVOS por servicio de la landing (GET /catalog de contygo; nunca listas locales): el «desde»
// y los paquetes, sin ids internos ni nada de la persona. Es público y cacheable en el CDN 5 minutos.
// Sin catálogo → 503 y la UI oculta los precios en vez de mostrar uno que quizá ya no es.
// La respuesta no depende de la petición (no se lee la query): lo que pasa de la caché del CDN con otra
// query lo frenan la caché del catálogo por instancia, la de sus fallos (catalog.ts) y este techo por IP.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET(req: NextRequest) {
  const limited = checkLimits([{ key: `prices:ip:${clientIp(req)}`, windowSeconds: 600, max: 120 }]);
  if (limited) return limited;
  try {
    const prices = priceSummary(await loadCatalog());
    return json({ ok: true, prices }, 200, { "Cache-Control": CACHE });
  } catch (error) {
    if (error instanceof CatalogUnavailableError && error.isConfig) logConfig("prices", error.code);
    else console.warn("[contygo] precios: catálogo no disponible");
    return fail("prices_unavailable", 503);
  }
}
