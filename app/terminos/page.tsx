/* ============================================================
   /terminos — el texto vive en lib/legal/terminos.ts (versionado: tocarlo obliga a subir
   CONTRACT_TERMS.version, ver tests/contygo-api.test.cjs). Aquí solo se muestra.
   PENDIENTE DE APROBACIÓN LEGAL DEL DUEÑO: el abogado aprueba el texto antes de la prueba en producción.
   ============================================================ */
import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal/LegalPage";
import { TERMINOS } from "@/lib/legal/terminos";

export const metadata: Metadata = {
  title: TERMINOS.metaTitle,
  description: TERMINOS.description,
  alternates: { canonical: TERMINOS.canonical },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return <LegalDocPage doc={TERMINOS} sibling={{ href: "/privacidad", label: "Política de Privacidad" }} />;
}
