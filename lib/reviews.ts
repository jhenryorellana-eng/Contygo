/* ============================================================
   UsaLatinoPrime — Reseñas (Supabase vía REST, SOLO servidor)
   Sin credenciales configuradas todo hace no-op seguro: la web
   funciona igual y las reseñas simplemente no aparecen.
   Esquema y políticas: ver supabase/setup.sql
   ============================================================ */

export interface Review {
  id: string;
  name: string;
  service_id: string | null;
  rating: number;
  comment: string;
  created_at: string;
  status?: "pending" | "approved" | "rejected";
  /** Felicitaciones (supabase/felicitaciones.sql): si es un trámite aprobado, dónde, y su foto. */
  kind?: "review" | "approval";
  place?: string | null;
  image_path?: string | null;
  consent?: boolean;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const ADMIN_SECRET = process.env.SUPABASE_ADMIN_SECRET ?? "";

/** true cuando hay credenciales de Supabase (URL + anon key). */
export const reviewsEnabled = Boolean(SUPABASE_URL && ANON_KEY);

const TABLE = "ulp_reviews";
const BUCKET = "felicitaciones";

/** La dirección pública de una foto (el cajón es público; el nombre, un uuid). */
export const reviewImageUrl = (path: string | null | undefined): string | null =>
  path && SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` : null;

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Memo-caché en memoria de las aprobadas (sobrevive entre requests del
    mismo proceso; ante un fallo se sirve lo último que se pudo leer). */
let approvedMemo: { at: number; data: Review[] } | null = null;
const APPROVED_TTL_MS = 30_000;

/** Reseñas aprobadas (públicas).
    Deliberadamente NO usa la caché de fetch de Next: cuando el upstream falla
    (p. ej. proyecto de Supabase pausado, cuyo DNS deja de resolver), esa
    maquinaria puede reventar el render por fuera de un try/catch. Aquí el
    fetch es directo, con timeout duro de 5s, y la home siempre renderiza. */
export async function listApprovedReviews(limit = 12): Promise<Review[]> {
  if (!reviewsEnabled) return [];
  if (approvedMemo && Date.now() - approvedMemo.at < APPROVED_TTL_MS) {
    return approvedMemo.data;
  }
  try {
    const query = (columns: string) =>
      fetch(
        `${SUPABASE_URL}/rest/v1/${TABLE}?select=${columns}` +
          `&status=eq.approved&order=created_at.desc&limit=${limit}`,
        { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(5000) },
      );
    // Con las columnas de las felicitaciones; si la base aún no las tiene, sin ellas.
    let res = await query("id,name,service_id,rating,comment,created_at,kind,place,image_path");
    if (res.status === 400) res = await query("id,name,service_id,rating,comment,created_at");
    if (!res.ok) return approvedMemo?.data ?? [];
    const data = (await res.json()) as Review[];
    approvedMemo = { at: Date.now(), data };
    return data;
  } catch {
    return approvedMemo?.data ?? [];
  }
}

/** Invalida la memo-caché (la usa /admin al aprobar/rechazar). */
export function invalidateApprovedMemo(): void {
  approvedMemo = null;
}

/** Guarda la foto de una felicitación (ya revisada y reducida por la ruta) y devuelve su nombre. */
export async function uploadReviewImage(bytes: Uint8Array): Promise<string | null> {
  if (!reviewsEnabled) return null;
  const path = `${crypto.randomUUID()}.jpg`, type = "image/jpeg";
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": type, "Cache-Control": "max-age=31536000" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type }),
    });
    return res.ok ? path : null;
  } catch {
    return null;
  }
}

/** Inserta una reseña; queda 'pending' hasta que el admin la apruebe. */
export async function insertReview(input: {
  name: string;
  serviceId: string | null;
  rating: number;
  comment: string;
  kind?: "review" | "approval";
  place?: string | null;
  imagePath?: string | null;
  consent?: boolean;
}): Promise<boolean> {
  if (!reviewsEnabled) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        name: input.name,
        service_id: input.serviceId,
        rating: input.rating,
        comment: input.comment,
        // Solo cuando vienen: una reseña sin foto entra igual en una base sin las columnas nuevas.
        ...(input.kind && input.kind !== "review" ? { kind: input.kind } : {}),
        ...(input.place ? { place: input.place } : {}),
        ...(input.imagePath ? { image_path: input.imagePath, consent: true } : input.consent ? { consent: true } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Lista reseñas por estado (RPC protegida por SUPABASE_ADMIN_SECRET). */
export async function adminListReviews(
  status: ReviewStatus | "all",
): Promise<Review[] | null> {
  if (!reviewsEnabled || !ADMIN_SECRET) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ulp_admin_reviews_list`, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ p_secret: ADMIN_SECRET, p_status: status }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Review[];
  } catch {
    return null;
  }
}

/** Cambia el estado de una reseña (aprobar / rechazar / devolver a pendiente). */
export async function adminSetReviewStatus(
  id: string,
  status: ReviewStatus,
): Promise<boolean> {
  if (!reviewsEnabled || !ADMIN_SECRET) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/ulp_admin_review_set_status`,
      {
        method: "POST",
        headers: headers(),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ p_secret: ADMIN_SECRET, p_id: id, p_status: status }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
