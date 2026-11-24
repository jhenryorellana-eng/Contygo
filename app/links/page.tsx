/* /links — la «carta de servicios» del equipo (23-11-2026): cada servicio con su precio vivo y su link, lista para
   copiar y mandar a un cliente. No es una página para el público: fuera de los buscadores y del sitemap. */
import type { Metadata } from "next";
import LinksMenu from "@/components/contygo/links/LinksMenu";

export const metadata: Metadata = {
  title: "Carta de servicios · ContyGo",
  description: "Cada servicio de ContyGo con su precio y su link.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/links" },
};

export default function LinksPage() {
  return <LinksMenu />;
}
