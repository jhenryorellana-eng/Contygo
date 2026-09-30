/* ============================================================
   GET /api/admin/reviews?status=pending|approved|rejected
   Lista reseñas para el panel (requiere sesión admin).
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { adminListReviews, reviewsEnabled, type ReviewStatus } from "@/lib/reviews";

export const runtime = "nodejs";

const VALID: ReadonlySet<string> = new Set(["pending", "approved", "rejected", "all"]);

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!reviewsEnabled) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const raw = req.nextUrl.searchParams.get("status") ?? "pending";
  const status = (VALID.has(raw) ? raw : "pending") as ReviewStatus | "all";

  const list = await adminListReviews(status);
  if (list === null) {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
  return NextResponse.json(list);
}
