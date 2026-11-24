/* GET /api/felicitaciones — lo que la landing enseña a quien la visita (24-11-2026): el marcador de casos (creados, en
   proceso y ganados, del contador que lleva el encargado: lib/case-counter.ts) y las felicitaciones que el dueño aprobó
   y cuyo autor dio permiso para mostrarlas en la página (lib/reviews.ts). Solo lectura, sin nada interno: ni quién
   actualizó el contador, ni las pendientes, ni ejemplos. Sin cifras ni historias, responde vacío y la landing no dibuja
   la sección. Se guarda un minuto en memoria y dos en el CDN: no se lee el almacén en cada visita.
   El dueño, con su sesión, puede verla con datos de EJEMPLO (?ejemplo=1) para enseñar cómo queda: solo él. */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { REVIEWS_SAMPLE, SCORE_SAMPLE } from "@/lib/contygo-results";
import { COUNTER_SERVICES, counterEnabled, counterTotals, isPreviewKey, loadCounter } from "@/lib/case-counter";
import { publicReviews, reviewsEnabled } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { ok: true; /** Only in the owner's preview: figures and stories of example. */ example?: true; score: { totals: { created: number; pending: number; won: number }; rows: { serviceId: string; label: string; created: number; pending: number; won: number }[]; updatedAt: string | null } | null; stories: { id: string; name: string; service_id: string | null; rating: number; comment: string; kind: "review" | "approval"; place: string | null; image_url: string | null }[] };
let cached: { at: number; body: Body } | null = null;
const FRESH_MS = 60_000;

async function build(): Promise<Body> {
  let score: Body["score"] = null;
  if (counterEnabled) {
    try {
      const counter = await loadCounter(), totals = counterTotals(counter.rows);
      if (totals.created + totals.pending + totals.won > 0) score = { totals, updatedAt: counter.updatedAt,
        rows: COUNTER_SERVICES.map(service => ({ serviceId: service.id, label: service.name, ...counter.rows[service.id] })).filter(row => row.created + row.pending + row.won > 0).sort((a, b) => b.created - a.created) };
    } catch { /* without the counter the page shows the stories alone */ }
  }
  const approved = reviewsEnabled ? await publicReviews().catch(() => null) : null;
  const stories = (approved ?? []).map(review => ({ id: review.id, name: review.name, service_id: review.service_id, rating: review.rating, comment: review.comment, kind: review.kind === "approval" ? "approval" as const : "review" as const, place: review.place ?? null, image_url: review.has_photo ? `/api/felicitaciones/${review.id}/foto` : null }));
  return { ok: true, score, stories };
}

/** The owner's preview (24-11-2026: «añade números de ejemplo solo para presentarlo»). Example figures never go to the
    public: with ?ejemplo=1 AND the owner's session, or with the key of the preview link (lib/case-counter.ts → previewKey),
    the page is answered with the samples, marked as such, and nothing is cached. Anyone else gets the real answer. */
function example(): Body {
  return { ok: true, example: true, score: { totals: SCORE_SAMPLE.totals, rows: SCORE_SAMPLE.rows, updatedAt: new Date().toISOString() },
    stories: REVIEWS_SAMPLE.map((review, n) => ({ id: `ejemplo-${n + 1}`, name: review.name, service_id: review.serviceId ?? null, rating: review.rating, comment: review.comment, kind: review.kind === "approval" ? "approval" as const : "review" as const, place: review.place ?? null, image_url: review.image ?? null })) };
}

export async function GET(req: NextRequest) {
  const asked = req.nextUrl.searchParams.get("ejemplo");
  if (asked !== null) {
    // The examples: to the owner's session («1»), or to whoever holds the preview link's key. Never cached.
    const allowed = (asked === "1" && isAdminRequest(req)) || isPreviewKey(asked);
    return NextResponse.json(allowed ? example() : await build(), { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  if (!cached || Date.now() - cached.at > FRESH_MS) cached = { at: Date.now(), body: await build() };
  return NextResponse.json(cached.body, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600", "X-Content-Type-Options": "nosniff" } });
}
