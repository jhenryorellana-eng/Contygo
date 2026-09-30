/* ============================================================
   Meta Conversions API (CAPI) — helper de SERVIDOR
   Envía eventos server-to-server a Meta. Sin PII en esta landing:
   user_data = fbp, fbc, IP, User-Agent (no se hashean) + external_id (SHA-256).
   No-op SEGURO si falta el token: permite tener el código en su sitio antes
   de configurar Meta Business; el Pixel del navegador funciona sin token.
   ============================================================ */
import { createHash } from "node:crypto";
import { PIXEL_ID, type MetaEventName } from "./events";

const ACCESS_TOKEN = process.env.FACEBOOK_CONVERSION_API_TOKEN;
const API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || "v23.0";
const TEST_CODE = process.env.FACEBOOK_TEST_EVENT_CODE;

export interface CapiEventInput {
  eventName: MetaEventName;
  eventId: string; // MISMO id que el Pixel del navegador → deduplicación
  eventSourceUrl?: string;
  customData?: Record<string, unknown>;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}

/** SHA-256 normalizado (trim + minúsculas) para parámetros que Meta exige hasheados. */
function sha256(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

/**
 * Envía un evento a la Conversions API de Meta.
 * Devuelve true si Meta respondió OK; false en no-op o error (nunca lanza).
 */
export async function sendCapiEvent(input: CapiEventInput): Promise<boolean> {
  if (!ACCESS_TOKEN) {
    console.warn(
      `[meta-capi] FACEBOOK_CONVERSION_API_TOKEN ausente; evento "${input.eventName}" no enviado (no-op seguro).`,
    );
    return false;
  }

  const userData: Record<string, unknown> = {};
  // Estos NO se hashean (hashearlos rompe el matching):
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
  // external_id SÍ se hashea:
  if (input.externalId) userData.external_id = sha256(input.externalId);

  const hasCustom =
    !!input.customData && Object.keys(input.customData).length > 0;

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000), // SEGUNDOS, no ms
        event_id: input.eventId,
        action_source: "website",
        ...(input.eventSourceUrl && { event_source_url: input.eventSourceUrl }),
        user_data: userData,
        ...(hasCustom && { custom_data: input.customData }),
      },
    ],
    ...(TEST_CODE && { test_event_code: TEST_CODE }),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      console.error(
        "[meta-capi] la API respondió con error",
        res.status,
        await res.text(),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[meta-capi] fetch falló", err);
    return false;
  }
}
