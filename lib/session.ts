/* ============================================================
   UsaLatinoPrime — Sesión del equipo (SOLO servidor)
   Cookie firmada (HMAC-SHA256) con quién es la persona y su rol:
     · owner   → Henry: ve y controla todo (contraseña ADMIN_PASSWORD).
     · advisor → asesora: solo sus contactos (usuario + contraseña,
                 verificados en la BD con bcrypt).
   La clave de firma deriva de ADMIN_PASSWORD + SUPABASE_ADMIN_SECRET:
   si cambian, todas las sesiones caducan solas.
   ============================================================ */
import { createHmac, createHash, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "ulp_session";
const SESSION_DAYS = 14;

export type Role = "owner" | "advisor";

export interface Session {
  uid: string;
  name: string;
  role: Role;
  advisorId: string | null;
  exp: number; // epoch ms
}

function key(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256")
    .update(`ulp-session:${pw}:${process.env.SUPABASE_ADMIN_SECRET ?? ""}`)
    .digest("hex");
}

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function sign(payload: string, k: string): string {
  return createHmac("sha256", k).update(payload).digest("base64url");
}

/** Crea el valor de la cookie para una sesión. */
export function encodeSession(s: Omit<Session, "exp">): string | null {
  const k = key();
  if (!k) return null;
  const payload = b64url(JSON.stringify({ ...s, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return `${payload}.${sign(payload, k)}`;
}

/** Lee y verifica la sesión de la petición (null si no hay o es inválida). */
export function getSession(req: NextRequest): Session | null {
  const k = key();
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!k || !raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(payload, k);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!s || typeof s.exp !== "number" || s.exp < Date.now()) return null;
    if (s.role !== "owner" && s.role !== "advisor") return null;
    return s;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, value: string): void {
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Nombre corto para firmar actividades ("Henry", "Vanessa"…). */
export function authorOf(s: Session): string {
  return s.name;
}
