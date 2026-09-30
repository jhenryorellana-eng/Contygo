/* ============================================================
   POST /api/contacts/capture — nombre y WhatsApp al final del embudo
   Crea (o enriquece) el contacto con las respuestas del cuestionario,
   lo asigna a la misma asesora que recibirá su WhatsApp y deja una
   cookie para ligar el clic posterior con la ficha.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ADVISOR_COOKIE, ADVISOR_COOKIE_DAYS, assignAdvisor, getActiveAdvisor, leadRateLimit } from "@/lib/advisors";
import { contactCreate, contactGet, crmEnabled } from "@/lib/crm";
import { CONTACT_COOKIE, VISITOR_COOKIE, encodeLeadCookie, readLeadCookie } from "@/lib/lead-identity";
import { getServiceById } from "@/lib/services";
import type { Answers } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!crmEnabled) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!leadRateLimit(`cap:${ip}`, 10, 60_000)) return NextResponse.json({ ok: false, error: "too_many" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  // Honeypot anti-spam.
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  const svcRaw = typeof body.serviceId === "string" ? body.serviceId : "";
  const serviceId = getServiceById(svcRaw) ? svcRaw : null;
  const tone = typeof body.tone === "string" ? body.tone.slice(0, 20) : null;
  const answersRaw = body.answers;
  const answers: Answers | null =
    answersRaw && typeof answersRaw === "object" && !Array.isArray(answersRaw)
      ? (Object.fromEntries(
          Object.entries(answersRaw as Record<string, unknown>)
            .slice(0, 40)
            .map(([k, v]) => [k.slice(0, 40), Array.isArray(v) ? v.map(String).slice(0, 20) : typeof v === "string" ? v.slice(0, 120) : undefined]),
        ) as Answers)
      : null;

  if (name.length < 2) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  if (!/^[0-9]{8,15}$/.test(phone)) return NextResponse.json({ ok: false, error: "phone" }, { status: 400 });

  // Misma asesora que recibirá el WhatsApp (cookie) o la siguiente por turno.
  const cookie = req.cookies.get(ADVISOR_COOKIE)?.value;
  let advisor = cookie ? await getActiveAdvisor(cookie) : null;
  if (!advisor) advisor = await assignAdvisor();

  const id = await contactCreate({
    name,
    phone,
    serviceId,
    advisorId: advisor?.id ?? null,
    source: "embudo",
    answers,
    resultTone: tone,
    createdBy: "web",
  });
  if (!id) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  // La deduplicación puede devolver un contacto con asesora ya asignada.
  const contact = await contactGet(id);
  if (!contact) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  if (contact.advisor_id) advisor = (await getActiveAdvisor(contact.advisor_id)) ?? advisor;
  const contactToken = encodeLeadCookie(id, "contact");
  const visitorId = readLeadCookie(req.cookies.get(VISITOR_COOKIE)?.value, "visitor") ?? randomUUID();
  const visitorToken = encodeLeadCookie(visitorId, "visitor");
  if (!contactToken || !visitorToken) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const res = NextResponse.json({ ok: true, id });
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  res.cookies.set(CONTACT_COOKIE, contactToken, { ...opts, maxAge: ADVISOR_COOKIE_DAYS * 86400 });
  res.cookies.set(VISITOR_COOKIE, visitorToken, { ...opts, maxAge: ADVISOR_COOKIE_DAYS * 86400 });
  if (advisor) res.cookies.set(ADVISOR_COOKIE, advisor.id, { ...opts, maxAge: ADVISOR_COOKIE_DAYS * 86400 });
  return res;
}
