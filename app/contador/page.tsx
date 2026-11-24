/* /contador — donde el encargado (o el dueño) pone al día el contador de casos: creados, pendientes y ganados por
   servicio (lib/case-counter.ts). No es pública: sin la sesión del dueño o la llave del link, no enseña nada. */
import type { Metadata } from "next";
import CaseCounterEditor from "@/components/contygo/contador/CaseCounterEditor";

export const metadata: Metadata = { title: "Contador de casos · ContyGo", robots: { index: false, follow: false } };

export default function Page() {
  return <CaseCounterEditor />;
}
