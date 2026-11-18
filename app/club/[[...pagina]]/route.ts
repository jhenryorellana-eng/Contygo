/* GET /club y /club/unirse: el link directo de ContyGo Club (18-11-2026), para mandárselo a un cliente.
   No abre la landing: redirige (302) al Club, que es otro proyecto en su propio dominio. A dónde va cada uno y cómo
   queda marcado, en clubDirectLink (lib/config.ts). /comunidad y /contygo-club llegan aquí por next.config.mjs.
   Con el Club oculto, el link lleva a la portada de la landing: ningún link enviado cae en un 404. */
import { NextRequest, NextResponse } from "next/server";
import { clubDirectLink } from "@/lib/config";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest, { params }: { params: { pagina?: string[] } }) {
  const club = clubDirectLink((params.pagina ?? []).join("/"), req.nextUrl.searchParams);
  const res = NextResponse.redirect(club ?? new URL("/", req.url), 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
