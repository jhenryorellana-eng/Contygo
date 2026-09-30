import type { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/contygo-api/webhook";

// Avisos de contygo, OPCIONALES (guía §2 bis y §7): case.created, contract.signed y
// downpayment.confirmed. La landing no tiene base de datos, así que no los necesita: la página
// de «gracias» consulta el estado y ventas lo ve todo en contygo. Sin CONTYGO_WEBHOOK_SECRET
// la ruta está apagada (404).
// Si algún día se activan para métricas: firma HMAC sobre el cuerpo CRUDO, ventana de ±300 s,
// dedupe por X-Event-Id y 2xx en menos de 10 s. Aquí solo se registra el tipo, sin datos.
// Nunca redirige: un 3xx cuenta como fallo.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 64 * 1024;
const empty = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

// Dedupe de buena fe en la memoria de la instancia: el aviso no tiene efectos que repetir.
const holder = globalThis as typeof globalThis & { __contygoWebhookSeen?: Set<string> };

export async function POST(req: NextRequest) {
  const secret = process.env.CONTYGO_WEBHOOK_SECRET;
  if (!secret) return empty(404);
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return empty(413);
  const raw = await req.text(); // el cuerpo CRUDO, antes de parsear
  if (raw.length > MAX_BODY_BYTES) return empty(413);

  const verdict = verifyWebhookSignature({ raw, timestamp: req.headers.get("x-timestamp"), signature: req.headers.get("x-signature"), secret });
  if (verdict !== "ok") return empty(401);

  const eventId = req.headers.get("x-event-id") ?? "";
  if (!eventId || eventId.length > 200) return empty(400);
  let event: { eventId?: unknown; type?: unknown };
  try { event = JSON.parse(raw); } catch { return empty(400); }
  if (!event || typeof event !== "object" || event.eventId !== eventId || typeof event.type !== "string") return empty(400);

  const seen = (holder.__contygoWebhookSeen ??= new Set());
  if (seen.has(eventId)) return empty(200);
  if (seen.size > 5000) seen.clear();
  seen.add(eventId);
  console.info(`[contygo] webhook ${event.type.slice(0, 40)}`);
  return empty(200);
}
