/* ============================================================
   GET /api/admin/leads?days=30 — leads registrados (sesión admin)
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { adminListLeads, advisorsEnabled } from "@/lib/advisors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!advisorsEnabled) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const raw = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const days = Number.isFinite(raw) ? Math.min(365, Math.max(1, Math.round(raw))) : 30;
  const list = await adminListLeads(days, 1000);
  if (list === null) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json(list);
}
