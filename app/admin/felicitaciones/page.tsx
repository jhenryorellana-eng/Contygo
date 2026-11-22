/* ============================================================
   /admin/felicitaciones — la presentación «en vivo» de las
   felicitaciones aprobadas. Solo con la sesión del dueño (la pide
   la API): no es una página pública.
   ============================================================ */
import type { Metadata } from "next";
import CongratsShow from "@/components/contygo/v7/CongratsShow";

export const metadata: Metadata = { title: "Felicitaciones · ContyGo", robots: { index: false, follow: false } };

export default function Page() {
  return <CongratsShow />;
}
