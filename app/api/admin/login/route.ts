/* ============================================================
   /api/admin/login
   POST { password }            → dueño (ADMIN_PASSWORD)
   POST { user, password }      → asesora (cuenta del equipo, bcrypt en BD)
   GET                          → quién soy (sesión actual)
   DELETE                       → cerrar sesión
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/admin-auth";
import { crmEnabled, teamLogin } from "@/lib/crm";
import { clearSessionCookie, encodeSession, getSession, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const attempts = new Map<string, { n: number; reset: number }>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const b = attempts.get(ip);
  if (!b || b.reset < now) {
    attempts.set(ip, { n: 1, reset: now + 10 * 60_000 });
    return false;
  }
  b.n += 1;
  return b.n > 20;
}

export async function GET(req: NextRequest) {
  const s = getSession(req);
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, uid: s.uid, name: s.name, role: s.role, advisorId: s.advisorId });
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooMany(ip)) {
    return NextResponse.json({ ok: false, error: "too_many" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const user = typeof body.user === "string" ? body.user.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) return NextResponse.json({ ok: false, error: "bad_password" }, { status: 401 });

  let token: string | null = null;
  let who: { name: string; role: "owner" | "advisor" } | null = null;

  if (!user) {
    // Clave maestra de emergencia (variable ADMIN_PASSWORD en Vercel): entra como dueño.
    if (!safeEqual(password, expected)) {
      return NextResponse.json({ ok: false, error: "bad_password" }, { status: 401 });
    }
    token = encodeSession({ uid: "owner", name: "Henry", role: "owner", advisorId: null });
    who = { name: "Henry", role: "owner" };
  } else {
    // Cuenta del equipo (dueño o asesora), verificada en la BD.
    if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    const u = await teamLogin(user, password);
    if (!u) return NextResponse.json({ ok: false, error: "bad_password" }, { status: 401 });
    token = encodeSession({ uid: u.id, name: u.name, role: u.role, advisorId: u.advisor_id });
    who = { name: u.name, role: u.role };
  }

  if (!token) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const res = NextResponse.json({ ok: true, ...who });
  setSessionCookie(res, token);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
