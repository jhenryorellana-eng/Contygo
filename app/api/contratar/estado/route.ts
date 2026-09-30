import type { NextRequest } from "next/server";
import { contygoApi } from "@/lib/contygo-api/client";
import { cachedStatus, checkLimits, clientIp, fail, guarded, json, readBrowserJson, rememberStatus } from "@/lib/contygo-api/server";
import { readContractToken } from "@/lib/contygo-api/tokens";

// Página de «gracias»: GET /contracts/{id}, solo con el token firmado del contrato (§2 bis); si no
// cuadra, 404. El token va en el cuerpo (POST), no en la URL: así no queda en ningún registro.
// contygo pide no consultarlo más de una vez por minuto por contrato: se guarda 60 s.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = await readBrowserJson(req);
    if ("response" in parsed) return parsed.response;
    const limited = checkLimits([{ key: `status:ip:${clientIp(req)}`, windowSeconds: 600, max: 40 }]);
    if (limited) return limited;
    const contractId = readContractToken(parsed.body.token);
    if (!contractId) return fail("no_contract", 404);

    let entry = cachedStatus(contractId);
    if (!entry) {
      const response = await contygoApi.getContract(contractId);
      if (response.status === 200 && response.data) entry = rememberStatus(contractId, response.data);
      else if (response.status === 404) return fail("no_contract", 404);
      else return fail("status_unavailable", response.status === 429 ? 429 : 502, { retryAfter: response.retryAfter });
    }
    const status = entry.value;
    // Sin PII y sin URL de firma: solo lo que la página necesita para decir en qué punto está.
    return json({
      ok: true,
      caseNumber: status.caseNumber,
      contract: status.status,
      signingExpiresAt: status.signingExpiresAt ?? null,
      downpayment: status.downpayment?.status ?? "pending",
      checkedAt: new Date(entry.at).toISOString(),
    });
  });
}
