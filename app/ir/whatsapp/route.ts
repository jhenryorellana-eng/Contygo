/* ============================================================
   GET /ir/whatsapp?kind=&msg=&svc=
   Salida a WhatsApp de los enlaces antiguos de la web.
   Siempre redirige (302) al ÚNICO número de WhatsApp de lib/config.ts
   (el bot de ventas de ContyGo) con el mensaje ya redactado. Ya no hay
   reparto por asesoras: no consulta la base de ULP ni fija cookies.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { waLink } from "@/lib/config";
import { DEFAULT_WA_MESSAGE } from "@/lib/wa-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const msg = (req.nextUrl.searchParams.get("msg") ?? "").trim().slice(0, 500) || DEFAULT_WA_MESSAGE;
  const res = NextResponse.redirect(waLink(msg), 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
