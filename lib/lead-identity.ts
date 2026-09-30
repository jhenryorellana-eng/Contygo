import { createHmac, timingSafeEqual } from "node:crypto";

export const CONTACT_COOKIE = "ulp_cid";
export const VISITOR_COOKIE = "ulp_lead_visitor";
export const LEAD_COOKIE_DAYS = 30;
type Purpose = "contact" | "visitor";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signature(payload: string, purpose: Purpose): string | null {
  const key = process.env.SUPABASE_ADMIN_SECRET;
  return key ? createHmac("sha256", key).update(`ulp-${purpose}:${payload}`).digest("base64url") : null;
}

/** La firma impide asociar un clic a una ficha ajena cambiando la cookie. */
export function encodeLeadCookie(id: string, purpose: Purpose): string | null {
  if (!UUID.test(id)) return null;
  const payload = `${id}.${Date.now() + LEAD_COOKIE_DAYS * 864e5}`;
  const sig = signature(payload, purpose);
  return sig ? `${payload}.${sig}` : null;
}

export function readLeadCookie(raw: string | undefined, purpose: Purpose): string | null {
  if (!raw || raw.length > 160) return null;
  const [id, exp, sig, extra] = raw.split(".");
  if (extra !== undefined || !UUID.test(id ?? "") || !/^\d+$/.test(exp ?? "") || !sig || Number(exp) <= Date.now()) return null;
  const expected = signature(`${id}.${exp}`, purpose);
  if (!expected) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}
