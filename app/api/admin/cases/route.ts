/* /api/admin/cases — el contador de casos (lib/case-counter.ts).
   GET  → las cifras por servicio, sus totales, quién y cuándo las actualizó. Al dueño, además, el link del encargado.
   PUT  { rows, by } → guarda. Lo puede hacer el dueño (sesión) o quien tenga el link del encargado (cabecera
   x-contador-llave). Sin almacén conectado, 503. */
import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/agent/server";
import { COUNTER_SERVICES, canEditCounter, counterEnabled, counterKey, counterTotals, loadCounter, previewKey, saveCounter } from "@/lib/case-counter";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

function refused(req: NextRequest) {
  // A wrong key is a guess: a ceiling per IP on the guesses.
  if (req.headers.get("x-contador-llave") && !rateLimit(`contador-llave:${clientIp(req)}`, 20, 600000)) return json({ ok: false, error: "rate_limited" }, 429);
  return json({ ok: false, error: "unauthorized" }, 401);
}

export async function GET(req: NextRequest) {
  const who = canEditCounter(req);
  if (!who) return refused(req);
  if (!counterEnabled) return json({ ok: false, error: "not_configured" }, 503);
  try {
    const counter = await loadCounter(), key = counterKey();
    return json({ ok: true, who, services: COUNTER_SERVICES, counter, totals: counterTotals(counter.rows), ...(who === "owner" && key ? { editUrl: `${SITE_URL}/contador?k=${key}`, previewUrl: `${SITE_URL}/?ejemplo=${previewKey()}#casos` } : {}) });
  } catch { return json({ ok: false, error: "upstream" }, 502); }
}

export async function PUT(req: NextRequest) {
  const who = canEditCounter(req);
  if (!who) return refused(req);
  if (!counterEnabled) return json({ ok: false, error: "not_configured" }, 503);
  if (!rateLimit(`contador-guardar:${clientIp(req)}`, 60, 600000)) return json({ ok: false, error: "rate_limited" }, 429);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as { rows?: unknown }).rows !== "object") return json({ ok: false, error: "invalid_rows" }, 400);
  try {
    const counter = await saveCounter((body as { rows: unknown }).rows, (body as { by?: unknown }).by ?? (who === "owner" ? "Henry" : ""));
    return json({ ok: true, counter, totals: counterTotals(counter.rows) });
  } catch { return json({ ok: false, error: "upstream" }, 502); }
}
