/* ============================================================
   /api/admin/advisors — asesoras del reparto de leads (sesión admin)
   GET  → lista completa (activas y pausadas, con contadores)
   PUT  → crea/edita { id, name, whatsapp, active }
   POST { action: "reset" } → contadores de turno a cero
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  adminListAdvisors,
  adminResetCounters,
  adminUpsertAdvisor,
  advisorsEnabled,
  isAdvisorId,
} from "@/lib/advisors";

export const runtime = "nodejs";

function guard(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!advisorsEnabled) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  const list = await adminListAdvisors();
  if (list === null) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json(list);
}

export async function PUT(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const id = body.id;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "") : "";
  const active = body.active !== false;
  const rawWeight = typeof body.weight === "number" ? Math.round(body.weight) : 1;
  const weight = Math.min(10, Math.max(1, rawWeight)); // turnos: 1..10

  if (!isAdvisorId(id)) return NextResponse.json({ ok: false, error: "id" }, { status: 400 });
  if (name.length < 2 || name.length > 60) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  if (!/^[0-9]{8,15}$/.test(whatsapp)) return NextResponse.json({ ok: false, error: "whatsapp" }, { status: 400 });

  const ok = await adminUpsertAdvisor({ id, name, whatsapp, weight, active });
  if (!ok) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* sin cuerpo */
  }
  if (body.action !== "reset") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  const ok = await adminResetCounters();
  if (!ok) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
