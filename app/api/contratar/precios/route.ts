import { CatalogUnavailableError, loadCatalog, priceSummary } from "@/lib/contygo-api/catalog";
import { fail, json } from "@/lib/contygo-api/server";

// Precios VIVOS por servicio de la landing (GET /catalog de contygo; nunca listas locales): el «desde»
// y los paquetes, sin ids internos ni nada de la persona. Es público y cacheable en el CDN 5 minutos.
// Sin catálogo → 503 y la UI oculta los precios en vez de mostrar uno que quizá ya no es.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  try {
    const prices = priceSummary(await loadCatalog());
    return json({ ok: true, prices }, 200, { "Cache-Control": CACHE });
  } catch (error) {
    if (error instanceof CatalogUnavailableError && error.isConfig) console.error(`[contygo:config] prices ${error.code.replace(/[^A-Za-z0-9_]/g, "").slice(0, 60)}`);
    else console.warn("[contygo] precios: catálogo no disponible");
    return fail("prices_unavailable", 503);
  }
}
