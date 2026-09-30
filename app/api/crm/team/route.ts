/* ============================================================
   /api/crm/team — accesos del equipo (solo el dueño)
   GET → lista
   PUT { id, name, role: "advisor"|"owner", advisorId?, password?, active } → crear/editar
   Reglas: una asesora necesita su número (advisorId); un dueño no.
   Nunca se puede dejar el sistema sin un dueño activo.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { isAdvisorId } from "@/lib/advisors";
import { crmEnabled, teamList, teamUpsert } from "@/lib/crm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const list = await teamList();
  if (list === null) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  return NextResponse.json(list);
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role: "advisor" | "owner" = body.role === "owner" ? "owner" : "advisor";
  const advisorId = role === "advisor" && isAdvisorId(body.advisorId) ? body.advisorId : null;
  const password = typeof body.password === "string" && body.password.length > 0 ? body.password : null;
  const active = body.active !== false;

  if (!/^[a-z0-9-]{2,30}$/.test(id)) return NextResponse.json({ ok: false, error: "id" }, { status: 400 });
  if (name.length < 2 || name.length > 60) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  if (password !== null && password.length < 6) return NextResponse.json({ ok: false, error: "password" }, { status: 400 });
  if (role === "advisor" && !advisorId) return NextResponse.json({ ok: false, error: "advisor" }, { status: 400 });

  // No dejar el sistema sin dueño activo.
  const existing = (await teamList()) ?? [];
  const isNew = !existing.some((u) => u.id === id);
  if (isNew && password === null) return NextResponse.json({ ok: false, error: "password" }, { status: 400 });
  const ownersLeft = existing.filter((u) => u.role === "owner" && u.active && u.id !== id).length + (role === "owner" && active ? 1 : 0);
  if (ownersLeft === 0) return NextResponse.json({ ok: false, error: "last_owner" }, { status: 400 });

  const r = await teamUpsert({ id, name, role, advisorId, password, active });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error ?? "upstream" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
