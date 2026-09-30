/* ============================================================
   PATCH /api/admin/reviews/:id — aprueba / rechaza una reseña
   Al cambiar el estado refresca la home (las aprobadas son públicas).
   ============================================================ */
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  adminSetReviewStatus,
  invalidateApprovedMemo,
  reviewsEnabled,
  type ReviewStatus,
} from "@/lib/reviews";

export const runtime = "nodejs";

const VALID: ReadonlySet<string> = new Set(["pending", "approved", "rejected"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!reviewsEnabled) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : "";
  if (!VALID.has(status)) {
    return NextResponse.json({ ok: false, error: "bad_status" }, { status: 400 });
  }

  const ok = await adminSetReviewStatus(params.id, status as ReviewStatus);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }

  // La home muestra las aprobadas: invalida las cachés al instante.
  invalidateApprovedMemo();
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
