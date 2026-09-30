import type { NextRequest } from "next/server";
import { isIdempotencyKey, isTrustedSigningUrl } from "@/lib/contygo-api/checkout";
import { contygoApi } from "@/lib/contygo-api/client";
import { checkLimits, clientIp, fail, guarded, json, readBrowserJson } from "@/lib/contygo-api/server";
import { readContractToken } from "@/lib/contygo-api/tokens";

// «No me llegó el enlace»: POST /contracts/{id}/link, solo con el token firmado del contrato y la
// Idempotency-Key que trae la UI (una por reenvío). contygo lo manda también por correo, app y push;
// aquí la URL solo vuelve al botón.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = await readBrowserJson(req);
    if ("response" in parsed) return parsed.response;
    const contractId = readContractToken(parsed.body.token);
    if (!contractId) return fail("no_contract", 404);
    if (!isIdempotencyKey(parsed.body.idempotencyKey)) return fail("invalid_idempotency_key", 400);
    // contygo permite 5 por hora y contrato: aquí, 3.
    const limited = checkLimits([
      { key: `resend:ip:${clientIp(req)}`, windowSeconds: 3600, max: 10 },
      { key: `resend:c:${contractId}`, windowSeconds: 3600, max: 3 },
    ]);
    if (limited) return limited;

    const response = await contygoApi.resendSigningLink(contractId, parsed.body.idempotencyKey);
    if (response.status === 200 && response.data && isTrustedSigningUrl(response.data.signingUrl)) {
      return json({ ok: true, outcome: { step: "SIGN_LINK", signingUrl: response.data.signingUrl, expiresAt: response.data.expiresAt, rotated: response.data.rotated } });
    }
    const code = response.error?.code ?? `HTTP_${response.status}`;
    if (code === "CONTRACT_ALREADY_SIGNED") return json({ ok: true, outcome: { step: "ALREADY_SIGNED" } });
    if (code === "CONTRACT_NOT_RESENDABLE") return json({ ok: true, outcome: { step: "NOT_RESENDABLE" } });
    if (response.status === 429 || response.status === 503 || response.status === 0) {
      // 503 o un corte: la misma clave se puede repetir. 429: nada se hizo y el próximo intento estrena clave.
      const reason = response.status === 429 ? "destination" : "busy";
      return json({ ok: true, outcome: { step: "RETRY_LATER", reason, retryAfter: response.retryAfter } }, 200, response.retryAfter ? { "Retry-After": String(response.retryAfter) } : {});
    }
    console.warn(`[contygo] reenvío de firma: ${code}`);
    return json({ ok: true, outcome: { step: "ERROR", code } });
  });
}
