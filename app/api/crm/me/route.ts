/* ============================================================
   PATCH /api/crm/me { current, next } — cambiar mi contraseña
   (cualquier cuenta del equipo, incluido el dueño). Verifica la
   contraseña actual contra la BD antes de guardar la nueva.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { crmEnabled, teamList, teamLogin, teamUpsert } from "@/lib/crm";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const s = getSession(req);
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (s.uid === "owner") return NextResponse.json({ ok: false, error: "master" }, { status: 400 }); // clave maestra: se cambia en Vercel

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  if (next.length < 6) return NextResponse.json({ ok: false, error: "short" }, { status: 400 });

  const ok = await teamLogin(s.uid, current);
  if (!ok) return NextResponse.json({ ok: false, error: "bad_password" }, { status: 401 });

  const me = (await teamList())?.find((u) => u.id === s.uid);
  if (!me) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const r = await teamUpsert({ id: me.id, name: me.name, role: me.role, advisorId: me.advisor_id, password: next, active: me.active });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error ?? "upstream" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
