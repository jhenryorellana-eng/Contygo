/* ============================================================
   GET /api/crm/advisors — nombres de las asesoras para el CRM
   (cualquier persona del equipo con sesión; sin contadores ni turnos)
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { adminListAdvisors, advisorsEnabled } from "@/lib/advisors";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!getSession(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!advisorsEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const list = await adminListAdvisors();
  if (list === null) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json(list.map((a) => ({ id: a.id, name: a.name, whatsapp: a.whatsapp, active: a.active })));
}
