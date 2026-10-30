/* ============================================================
   /guia-loteria-de-visas — la guía gratuita de la Lotería de Visas DV-2027 (26-10-2026).
   Es el camino «Hazlo tú gratis» del cierre de su guía (lib/agent/lottery-intake.ts) y una página para buscadores.
   Desde el 28-10-2026 es una inscripción guiada (components/contygo/loteria): el contenido vive en lib/loteria-guide.ts;
   las fuentes, en docs/loteria-dv-2027.md.
   ============================================================ */
import type { Metadata } from "next";
import { crmWaLink } from "@/lib/config";
import { whatsappLotteryMessage } from "@/lib/contygo-api/messages";
import LotteryGuide from "@/components/contygo/loteria/LotteryGuide";

const title = "Lotería de Visas DV-2027: inscripción en pausa y guía gratis para prepararte · ContyGo";
const description = "La inscripción de la DV-2027 está en pausa y sin fecha. Quién podría participar, qué documentos y fotos necesitas y cómo es el formulario oficial, por si abre. Para Perú y toda Latinoamérica.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guia-loteria-de-visas" },
  robots: { index: true, follow: true },
  openGraph: { title, description, url: "/guia-loteria-de-visas", type: "article", locale: "es_US", siteName: "ContyGo", images: [{ url: "/contygo/compartir/loteria-dv-2027.jpg", width: 1200, height: 630, alt: "Lotería de Visas DV-2027" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/contygo/compartir/loteria-dv-2027.jpg"] },
};

export default function LotteryGuidePage() {
  return <LotteryGuide helpHref={crmWaLink(whatsappLotteryMessage())} />;
}
