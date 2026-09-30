/* ============================================================
   POST /api/meta — recibe el evento del navegador y lo reenvía a la
   Conversions API (server-side). Fire-and-forget: responde 204 sin esperar
   a Meta para no añadir latencia al usuario.
   ============================================================ */
import { REQUIRE_CONSENT, type MetaEventName } from "@/lib/meta/events";
import { sendCapiEvent } from "@/lib/meta/capi";

// node:crypto (hashing del external_id) → runtime Node.
export const runtime = "nodejs";

interface MetaRequestBody {
  eventName?: MetaEventName;
  eventId?: string;
  eventSourceUrl?: string;
  customData?: Record<string, unknown>;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
}

const noContent = () => new Response(null, { status: 204 });

export async function POST(req: Request): Promise<Response> {
  let body: MetaRequestBody;
  try {
    body = (await req.json()) as MetaRequestBody;
  } catch {
    return noContent();
  }

  if (!body?.eventName || !body?.eventId) return noContent();

  // Cookies de la request (same-origin). El servidor las lee él mismo en vez
  // de confiar ciegamente en el cliente; el body es solo fallback.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const getCookie = (name: string): string | null => {
    const m = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  };

  // Variante B: exigir consentimiento por cookie antes de enviar.
  if (REQUIRE_CONSENT && getCookie("meta_consent") !== "granted") {
    return noContent();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const ua = req.headers.get("user-agent");

  // Fire-and-forget: no bloquear la respuesta esperando a Meta.
  void sendCapiEvent({
    eventName: body.eventName,
    eventId: body.eventId,
    eventSourceUrl: body.eventSourceUrl,
    customData: body.customData,
    fbp: getCookie("_fbp") ?? body.fbp ?? null,
    fbc: getCookie("_fbc") ?? body.fbc ?? null,
    externalId: getCookie("ulp_vid") ?? body.externalId ?? null,
    clientIpAddress: ip,
    clientUserAgent: ua,
  });

  return noContent();
}
