/* ============================================================
   /api/crm/contacts
   GET  ?stage=&advisor=&q=     → lista (la asesora solo ve los suyos)
   POST { name, phone, serviceId, stage, advisorId, notes } → crear
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { contactCreate, contactsList, crmEnabled, isStage, type Stage } from "@/lib/crm";
import { isAdvisorId } from "@/lib/advisors";
import { getServiceById } from "@/lib/services";
import { authorOf, getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const s = getSession(req);
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const q = req.nextUrl.searchParams;
  const stageRaw = q.get("stage");
  const stage: Stage | null = isStage(stageRaw) ? stageRaw : null;
  const advRaw = q.get("advisor");
  // La asesora solo ve lo suyo, diga lo que diga el filtro.
  const advisorId = s.role === "advisor" ? s.advisorId : isAdvisorId(advRaw) ? advRaw : null;
  const text = (q.get("q") ?? "").trim().slice(0, 60) || null;

  const list = await contactsList({ advisorId, stage, q: text, limit: 600 });
  if (list === null) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const s = getSession(req);
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phoneRaw = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  const phone = phoneRaw ? phoneRaw : null;
  const svcRaw = typeof body.serviceId === "string" ? body.serviceId : "";
  const serviceId = getServiceById(svcRaw) ? svcRaw : null;
  const stage: Stage = isStage(body.stage) ? body.stage : "nuevo";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) || null : null;
  // La asesora crea contactos a su nombre; el dueño elige (o deja sin asignar).
  const advRaw = typeof body.advisorId === "string" ? body.advisorId : "";
  const advisorId = s.role === "advisor" ? s.advisorId : isAdvisorId(advRaw) ? advRaw : null;

  if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  if (phone && !/^[0-9]{8,15}$/.test(phone)) return NextResponse.json({ ok: false, error: "phone" }, { status: 400 });

  const id = await contactCreate({ name, phone, serviceId, stage, advisorId, source: "manual", notes, createdBy: authorOf(s) });
  if (!id) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json({ ok: true, id });
}
