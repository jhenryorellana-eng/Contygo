/* ============================================================
   /api/reviews
   POST → recibe la felicitación de un cliente (queda pendiente). Como
          JSON (reseña sola) o como formulario (con foto).
   No hay lista pública: las aprobadas las muestra el dueño desde su
   panel (/admin/felicitaciones), cuando él quiere.
   La foto llega ya reducida y con los datos tapados por quien la envía
   (ShareStory); aquí se comprueba que es un JPEG pequeño de verdad, se
   le quitan los datos ocultos (lugar, cámara) y se exige su permiso.
   Nada se muestra hasta que el dueño lo aprueba en /admin.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { insertReview, reviewsEnabled } from "@/lib/reviews";
import { getServiceById } from "@/lib/services";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { cleanJpeg, PHOTO_MAX } from "@/lib/review-photo";

export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/* Un freno a quien envía sin parar (por dirección; vive en la memoria de cada instancia: es un freno, no un muro). */
const sent = new Map<string, { n: number; reset: number }>();
function tooMany(ip: string): boolean {
  const now = Date.now(), entry = sent.get(ip);
  if (!entry || entry.reset < now) { sent.set(ip, { n: 1, reset: now + 10 * 60_000 }); return false; }
  return ++entry.n > 6;
}

export async function POST(req: NextRequest) {
  if (!reviewsEnabled) return fail("not_configured", 503);

  let body: Record<string, unknown>, photo: File | null = null;
  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("photo");
      photo = file instanceof File && file.size > 0 ? file : null;
      body = {};
      form.forEach((value, key) => { if (typeof value === "string") body[key] = value; });
      body.rating = Number(body.rating);
      body.consent = body.consent === "true";
    } else body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("bad_request");
  }

  // Honeypot anti-spam: campo invisible; si un bot lo rellena, fingimos éxito.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }
  if (tooMany(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local")) return fail("too_many", 429);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const rating = typeof body.rating === "number" ? Math.round(body.rating) : NaN;
  const rawService = typeof body.serviceId === "string" ? body.serviceId : "";
  const serviceId = getServiceById(rawService) || CONTYGO_SERVICES.some(item => item.id === rawService) ? rawService : null;
  const kind = body.kind === "approval" ? "approval" : "review";
  const place = typeof body.place === "string" && body.place.trim().length >= 2 ? body.place.trim().slice(0, 60) : null;

  if (name.length < 2 || name.length > 80) return fail("name");
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return fail("rating");
  if (comment.length < 10 || comment.length > 600) return fail("comment");

  let clean: Uint8Array | null = null;
  if (photo) {
    if (body.consent !== true) return fail("consent");
    if (photo.size > PHOTO_MAX) return fail("photo_size");
    clean = cleanJpeg(new Uint8Array(await photo.arrayBuffer()));
    if (!clean) return fail("photo_type");
  }

  const ok = await insertReview({ name, serviceId, rating, comment, kind, place, consent: body.consent === true, photo: clean });
  if (!ok) return fail("upstream", 502);
  return NextResponse.json({ ok: true });
}
