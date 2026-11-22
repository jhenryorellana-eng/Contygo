/* ============================================================
   PATCH /api/admin/reviews/:id — aprueba / rechaza una reseña
   Las aprobadas las enseña el dueño desde su panel (/admin/felicitaciones).
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  adminSetReviewStatus,
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

  return NextResponse.json({ ok: true });
}
