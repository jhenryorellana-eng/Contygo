/* ============================================================
   /terminos — el texto vive en lib/legal/terminos.ts (versionado: tocarlo obliga a subir
   CONTRACT_TERMS.version, ver tests/contygo-api.test.cjs). Aquí solo se muestra.
   APROBADO POR EL DUEÑO el 2026-10-03 (versión terminos-web-2026-10-03): cualquier cambio de texto pide nueva aprobación y nueva versión.
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
