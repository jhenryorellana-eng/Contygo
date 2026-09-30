/* ============================================================
   GET /ir/whatsapp?kind=&msg=&svc=
   Único punto de salida a WhatsApp de toda la web:
     1. Si la persona ya tiene asesora asignada (cookie) y sigue activa → esa.
     2. Si no → la siguiente por turno (RPC atómica) y se fija 30 días.
     3. Sin base de datos o sin asesoras activas → número general.
   Registra el lead y redirige (302) a wa.me con el mensaje redactado.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  ADVISOR_COOKIE,
  ADVISOR_COOKIE_DAYS,
  DEFAULT_ADVISOR,
  assignAdvisor,
  getActiveAdvisor,
  insertLead,
  leadRateLimit,
  type AdvisorPick,
  type LeadSource,
} from "@/lib/advisors";
import { contactGet } from "@/lib/crm";
import { CONTACT_COOKIE, VISITOR_COOKIE, encodeLeadCookie, readLeadCookie } from "@/lib/lead-identity";
import { getServiceById } from "@/lib/services";
import { DEFAULT_WA_MESSAGE, LEAD_KINDS, type LeadKind } from "@/lib/wa-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|curl|wget|python/i;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

function refererPath(req: NextRequest): string | null {
  const ref = req.headers.get("referer");
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const host = req.headers.get("host") ?? "";
    // Solo páginas propias (el host puede venir con o sin "www").
    if (u.host.replace(/^www\./, "") !== host.replace(/^www\./, "")) return null;
    return u.pathname.slice(0, 200);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const rawKind = q.get("kind") ?? "whatsapp";
  const kind = (LEAD_KINDS as readonly string[]).includes(rawKind) ? (rawKind as LeadKind) : "whatsapp";
  const msg = (q.get("msg") ?? "").trim().slice(0, 500) || DEFAULT_WA_MESSAGE;
  const rawSvc = q.get("svc") ?? "";
  const serviceId = getServiceById(rawSvc) ? rawSvc : null;

  const ua = req.headers.get("user-agent") ?? "";
  const isBot = ua === "" || BOT_RE.test(ua);
  const allowed = leadRateLimit(clientIp(req));

  let advisor: AdvisorPick | null = null;
  let source: LeadSource = "default";
  const contactId = readLeadCookie(req.cookies.get(CONTACT_COOKIE)?.value, "contact");
  const savedVisitor = readLeadCookie(req.cookies.get(VISITOR_COOKIE)?.value, "visitor");
  const visitorId = savedVisitor ?? randomUUID();
  const contact = contactId ? await contactGet(contactId) : null;
  if (contact?.advisor_id) advisor = await getActiveAdvisor(contact.advisor_id);

  const cookie = req.cookies.get(ADVISOR_COOKIE)?.value;
  if (!advisor && cookie) {
    advisor = await getActiveAdvisor(cookie);
  }
  // Conserva visitantes antiguos; una cookie de asesora creada por la captura
  // no significa que la persona ya haya hecho clic en WhatsApp.
  if (advisor) source = !savedVisitor && !contact && cookie ? "sticky" : "auto";
  // Bots y ráfagas anómalas no consumen turno ni cuentan como lead.
  if (!advisor && !isBot && allowed) {
    advisor = await assignAdvisor();
    if (advisor) source = "auto";
  }
  if (!advisor) {
    advisor = DEFAULT_ADVISOR;
    source = "default";
  }

  if (advisor.id !== "default" && !isBot && allowed) {
    // Si la persona dejó sus datos en el cuestionario, el clic queda en su ficha del CRM.
    // La RPC clasifica el clic y escribe el historial en una sola transacción.
    const leadId = await insertLead({ advisorId: advisor.id, kind, path: refererPath(req), serviceId, source, contactId: contact?.id ?? null, visitorId });
    if (!leadId) console.error("[whatsapp] No se pudo registrar el clic; se conserva la salida a WhatsApp.");
  }

  const target = `https://wa.me/${advisor.whatsapp}?text=${encodeURIComponent(msg)}`;
  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  const visitorToken = encodeLeadCookie(visitorId, "visitor");
  if (!isBot && allowed && visitorToken) res.cookies.set(VISITOR_COOKIE, visitorToken, {
    maxAge: ADVISOR_COOKIE_DAYS * 86400, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
  });
  if (advisor.id !== "default") {
    res.cookies.set(ADVISOR_COOKIE, advisor.id, {
      maxAge: ADVISOR_COOKIE_DAYS * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return res;
}
