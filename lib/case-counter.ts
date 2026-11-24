/* ============================================================
   El contador de casos (24-11-2026, SOLO servidor). El dueño: «un cronómetro de todos los casos que vamos teniendo…
   de todos los servicios: casos ganados, casos pendientes, casos creados… con un link en el Dashboard para quien esté
   encargado de esta sección; Andrium debe actualizarlo siempre».

   Son las cifras del propio registro de ContyGo, puestas a mano por quien las lleva: cada guardado deja quién y cuándo.
   Por eso la presentación en vivo puede enseñarlas (lib/contygo-results.ts: nunca una cifra inventada).
   Se guardan en el mismo almacén privado de las felicitaciones (lib/reviews.ts), en un solo archivo:
     contador/casos.json
   Quién puede cambiarlas: el dueño, con su sesión; y quien tenga el link del encargado, que lleva una llave derivada de
   la contraseña del panel (si el dueño cambia su contraseña, el link anterior deja de valer y se copia el nuevo).
   ============================================================ */
import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import { VISIBLE_SERVICES } from "./contygo-catalog";
import { isAdminRequest, safeEqual } from "./admin-auth";
import { reviewsEnabled, storeRead, storeWrite } from "./reviews";

export type CaseRow = { created: number; pending: number; won: number };
/** `example`: the figures are a demonstration, not the record (24-11-2026: the owner asked for the counter to be filled «para
    ejemplo», to present the system). Wherever they show, they say so; saving the real ones removes the mark. */
export type CaseCounter = { updatedAt: string | null; updatedBy: string | null; rows: Record<string, CaseRow>; log: { at: string; by: string }[]; example?: boolean };

const FILE = "contador/casos.json";
export const MAX_CASES = 99_999;
export const counterEnabled = reviewsEnabled;
export const COUNTER_SERVICES = VISIBLE_SERVICES.map(service => ({ id: service.id, name: service.name }));

const whole = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_CASES, Math.max(0, Math.round(value))) : 0);
const empty = (): CaseCounter => ({ updatedAt: null, updatedBy: null, rows: Object.fromEntries(COUNTER_SERVICES.map(service => [service.id, { created: 0, pending: 0, won: 0 }])), log: [] });

/** What came in, made safe: only the services of the catalogue, whole numbers within range. */
export function cleanRows(input: unknown): Record<string, CaseRow> {
  const given = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return Object.fromEntries(COUNTER_SERVICES.map(service => {
    const row = given[service.id] && typeof given[service.id] === "object" ? given[service.id] as Record<string, unknown> : {};
    return [service.id, { created: whole(row.created), pending: whole(row.pending), won: whole(row.won) }];
  }));
}

export const counterTotals = (rows: Record<string, CaseRow>) => Object.values(rows).reduce((sum, row) => ({ created: sum.created + row.created, pending: sum.pending + row.pending, won: sum.won + row.won }), { created: 0, pending: 0, won: 0 });

export async function loadCounter(): Promise<CaseCounter> {
  const bytes = await storeRead(FILE);
  if (!bytes) return empty();
  try {
    const stored = JSON.parse(Buffer.from(bytes).toString("utf8")) as Partial<CaseCounter>;
    return { ...(stored.example === true ? { example: true } : {}), updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : null, updatedBy: typeof stored.updatedBy === "string" ? stored.updatedBy : null, rows: cleanRows(stored.rows), log: Array.isArray(stored.log) ? stored.log.filter(entry => entry && typeof entry.at === "string" && typeof entry.by === "string").slice(-30) : [] };
  } catch { return empty(); }
}

/** Saves the figures with who and when; the last thirty saves stay on record. */
export async function saveCounter(rows: unknown, by: unknown, now = new Date(), example = false): Promise<CaseCounter> {
  const who = (typeof by === "string" ? by.replace(/\s+/g, " ").trim().slice(0, 40) : "") || "Sin nombre";
  const before = await loadCounter(), at = now.toISOString();
  const next: CaseCounter = { ...(example ? { example: true } : {}), updatedAt: at, updatedBy: who, rows: cleanRows(rows), log: [...before.log, { at, by: example ? `${who} (ejemplo)` : who }].slice(-30) };
  await storeWrite(FILE, JSON.stringify(next), "application/json");
  return next;
}

/** The key of the link for whoever keeps the counter. Null without a panel password (nothing is configured). */
export function counterKey(): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  return secret ? createHmac("sha256", `contador-de-casos:${secret}`).update("link-del-encargado").digest("base64url").slice(0, 26) : null;
}

/** The key of the preview link (24-11-2026): the landing with the cases section filled with EXAMPLES, for whoever has the
    link — Henry on his phone, without signing in. Marked as an example on screen; the public page never shows it. */
export function previewKey(): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  return secret ? createHmac("sha256", `contador-de-casos:${secret}`).update("vista-previa-de-la-landing").digest("base64url").slice(0, 14) : null;
}
export const isPreviewKey = (given: string | null) => { const key = previewKey(); return !!key && !!given && safeEqual(given, key); };

/** The owner, by session; or the person in charge, by the key of their link (sent in a header, never kept in a cookie). */
export function canEditCounter(req: NextRequest): "owner" | "keeper" | null {
  if (isAdminRequest(req)) return "owner";
  const key = counterKey(), given = req.headers.get("x-contador-llave") ?? "";
  return key && given && safeEqual(given, key) ? "keeper" : null;
}
