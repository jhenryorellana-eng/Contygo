/* ============================================================
   /privacidad — el texto vive en lib/legal/privacidad.ts (versionado: tocarlo obliga a subir
   CONTRACT_TERMS.version, ver tests/contygo-api.test.cjs). Aquí solo se muestra.
   APROBADO POR EL DUEÑO el 2026-10-03 (versión terminos-web-2026-10-03): cualquier cambio de texto pide nueva aprobación y nueva versión.
   ============================================================ */
import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal/LegalPage";
import { PRIVACIDAD } from "@/lib/legal/privacidad";

export const metadata: Metadata = {
  title: PRIVACIDAD.metaTitle,
  description: PRIVACIDAD.description,
  alternates: { canonical: PRIVACIDAD.canonical },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return <LegalDocPage doc={PRIVACIDAD} sibling={{ href: "/terminos", label: "Términos y Condiciones" }} />;
}
