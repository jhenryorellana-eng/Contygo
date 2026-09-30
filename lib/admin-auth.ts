/* ============================================================
   UsaLatinoPrime — Autorización del panel /admin (SOLO servidor)
   La sesión vive en lib/session.ts. Aquí solo los atajos:
     · isAdminRequest → ¿es el dueño? (moderar reseñas, asesoras, equipo)
     · isTeamRequest  → ¿hay alguien del equipo con sesión? (CRM)
   ============================================================ */
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSession } from "./session";

/** Comparación en tiempo constante (evita filtrar longitud/prefijos). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** ¿La petición trae sesión del dueño? */
export function isAdminRequest(req: NextRequest): boolean {
  return getSession(req)?.role === "owner";
}

/** ¿La petición trae sesión de alguien del equipo (dueño o asesora)? */
export function isTeamRequest(req: NextRequest): boolean {
  return getSession(req) !== null;
}
