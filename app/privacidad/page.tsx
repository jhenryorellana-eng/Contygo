/* ============================================================
   /privacidad — el texto vive en lib/legal/privacidad.ts (versionado: tocarlo obliga a subir
   CONTRACT_TERMS.version, ver tests/contygo-api.test.cjs). Aquí solo se muestra.
   PENDIENTE DE APROBACIÓN LEGAL DEL DUEÑO: el abogado aprueba el texto antes de la prueba en producción.
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
