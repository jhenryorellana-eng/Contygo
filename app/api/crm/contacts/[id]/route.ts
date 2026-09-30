/* ============================================================
   /api/crm/contacts/:id
   GET   → ficha + historial
   PATCH → cambia campos (etapa, asesora, notas, próximo paso…)
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { activitiesList, contactGet, contactUpdate, crmEnabled, isStage, isUuid, type ContactPatch } from "@/lib/crm";
import { isAdvisorId } from "@/lib/advisors";
import { getServiceById } from "@/lib/services";
import { authorOf, getSession, type Session } from "@/lib/session";

export const runtime = "nodejs";

async function loadOwned(id: string, s: Session) {
  const c = await contactGet(id);
  if (!c) return null;
  if (s.role === "advisor" && c.advisor_id !== s.advisorId) return null;
  return c;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = getSession(req);
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (!isUuid(params.id)) return NextResponse.json({ ok: false, error: "id" }, { status: 400 });

  const contact = await loadOwned(params.id, s);
  if (!contact) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const activities = (await activitiesList(contact.id)) ?? [];
  return NextResponse.json({ contact, activities });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = getSession(req);
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (!isUuid(params.id)) return NextResponse.json({ ok: false, error: "id" }, { status: 400 });

  const contact = await loadOwned(params.id, s);
  if (!contact) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const patch: ContactPatch = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length < 2 || n.length > 80) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
    patch.name = n;
  }
  if (typeof body.phone === "string") {
    const p = body.phone.replace(/\D/g, "");
    if (p && !/^[0-9]{8,15}$/.test(p)) return NextResponse.json({ ok: false, error: "phone" }, { status: 400 });
    patch.phone = p || null;
  }
  if (typeof body.serviceId === "string") patch.service_id = getServiceById(body.serviceId) ? body.serviceId : null;
  if (body.stage !== undefined) {
    if (!isStage(body.stage)) return NextResponse.json({ ok: false, error: "stage" }, { status: 400 });
    patch.stage = body.stage;
  }
  // Reasignar es cosa del dueño.
  if (s.role === "owner" && typeof body.advisorId === "string") patch.advisor_id = isAdvisorId(body.advisorId) ? body.advisorId : null;
  if (typeof body.notes === "string") patch.notes = body.notes.trim().slice(0, 4000) || null;
  if (typeof body.nextAction === "string") patch.next_action = body.nextAction.trim().slice(0, 200) || null;
  if (body.nextActionAt !== undefined) {
    if (body.nextActionAt === null || body.nextActionAt === "") patch.next_action_at = null;
    else if (typeof body.nextActionAt === "string" && !Number.isNaN(Date.parse(body.nextActionAt))) {
      patch.next_action_at = new Date(body.nextActionAt).toISOString();
    } else return NextResponse.json({ ok: false, error: "nextActionAt" }, { status: 400 });
  }
  if (typeof body.lostReason === "string") patch.lost_reason = body.lostReason.trim().slice(0, 200) || null;
  if (body.amount !== undefined) {
    if (body.amount === null || body.amount === "") patch.amount = null;
    else if (typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount >= 0) patch.amount = Math.round(body.amount * 100) / 100;
    else return NextResponse.json({ ok: false, error: "amount" }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const ok = await contactUpdate(contact.id, patch, authorOf(s));
  if (!ok) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  const fresh = await contactGet(contact.id);
  const activities = (await activitiesList(contact.id)) ?? [];
  return NextResponse.json({ ok: true, contact: fresh, activities });
}
