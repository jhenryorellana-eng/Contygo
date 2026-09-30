/* ============================================================
   POST /api/crm/contacts/:id/activities { kind, body }
   Añade una nota, llamada, WhatsApp, cita o seguimiento al historial.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { activitiesList, activityAdd, contactGet, crmEnabled, isUuid, type ActivityKind } from "@/lib/crm";
import { authorOf, getSession } from "@/lib/session";

export const runtime = "nodejs";

const KINDS: ReadonlySet<string> = new Set(["nota", "whatsapp", "llamada", "cita", "seguimiento"]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const s = getSession(req);
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (!isUuid(params.id)) return NextResponse.json({ ok: false, error: "id" }, { status: 400 });

  const contact = await contactGet(params.id);
  if (!contact || (s.role === "advisor" && contact.advisor_id !== s.advisorId)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const kind = typeof body.kind === "string" && KINDS.has(body.kind) ? (body.kind as ActivityKind) : "nota";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (kind === "nota" && text.length === 0) return NextResponse.json({ ok: false, error: "body" }, { status: 400 });

  const ok = await activityAdd({ contactId: contact.id, author: authorOf(s), kind, body: text || null });
  if (!ok) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  const activities = (await activitiesList(contact.id)) ?? [];
  const fresh = await contactGet(contact.id);
  return NextResponse.json({ ok: true, contact: fresh, activities });
}
