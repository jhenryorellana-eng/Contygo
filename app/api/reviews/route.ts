/* ============================================================
   POST /api/reviews — recibe la reseña de un cliente (queda pendiente)
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { insertReview, reviewsEnabled } from "@/lib/reviews";
import { getServiceById } from "@/lib/services";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!reviewsEnabled) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  // Honeypot anti-spam: campo invisible; si un bot lo rellena, fingimos éxito.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const rating = typeof body.rating === "number" ? Math.round(body.rating) : NaN;
  const rawService = typeof body.serviceId === "string" ? body.serviceId : "";
  const serviceId = getServiceById(rawService) ? rawService : null;

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "rating" }, { status: 400 });
  }
  if (comment.length < 10 || comment.length > 600) {
    return NextResponse.json({ ok: false, error: "comment" }, { status: 400 });
  }

  const ok = await insertReview({ name, serviceId, rating, comment });
  if (!ok) {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
