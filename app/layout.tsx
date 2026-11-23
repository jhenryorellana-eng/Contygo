import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./agent.css";
import { MetaPixel } from "@/components/meta/MetaPixel";
import { PixelRouteTracker } from "@/components/meta/PixelRouteTracker";
import { ConsentBanner } from "@/components/meta/ConsentBanner";
import AgentWidget from "@/components/agent/AgentWidget";
import { agentEnabled } from "@/lib/agent/server";

const nunito = localFont({
  src: "../public/fonts/nunito-latin-variable.woff2",
  weight: "800",
  style: "normal",
  variable: "--font-contygo-heading",
  display: "swap",
});

const nunitoSans = localFont({
  src: "../public/fonts/nunito-sans-latin-variable.woff2",
  weight: "400 800",
  style: "normal",
  variable: "--font-contygo-body",
  display: "swap",
});

const sourceSans = localFont({
  src: "../public/fonts/source-sans-3-latin-variable.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = localFont({
  src: "../public/fonts/source-serif-4-latin-variable.woff2",
  weight: "400 700",
  style: "normal",
  adjustFontFallback: "Times New Roman",
  variable: "--font-serif",
  display: "swap",
});

// What WhatsApp shows when the link is sent (09-11-2026): ContyGo, no longer UsaLatinoPrime. The picture is the owner's,
// cut to 1200×630; a new file name, so WhatsApp does not keep the old one.
const SITE_NAME = "ContyGo";
const SITE_TITLE = "ContyGo · Tu trámite migratorio, acompañado paso a paso";
const SITE_DESCRIPTION =
  "Tu historia sigue; el siguiente paso, ContyGo. Preparamos tus documentos contigo y te acompañamos paso a paso desde una sola plataforma: elige tu trámite, mira el precio y crea tu contrato.";
// 23-11-2026: the preview says what the page now offers (the contract, done by the person with the assistant) and shows
// Henry as in the day hero (the owner chose the light one of three). Built from the page's own pieces (docs/compartir-whatsapp/og.cjs); again a new file name.
const SHARE_TITLE = `ContyGo · Haz tu contrato tú mismo, en ${CONTRACT_TIME}`;
const SHARE_DESCRIPTION =
  "Tu trámite migratorio desde el celular y en español: tu asistente te acompaña paso a paso, con el precio a la vista.";
const SHARE_IMAGE = "/og-contygo-contrato.jpg";

import { SITE_URL } from "@/lib/site";
import { CONTRACT_TIME } from "@/lib/agent/landing-chat-ui";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Small copies of /logo.png (1714 px, 935 KB): the browser downloads the icon on every visit.
  icons: { icon: { url: "/icon-64.png", sizes: "64x64", type: "image/png" }, apple: { url: "/apple-icon-180.png", sizes: "180x180" } },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    type: "website",
    locale: "es_US",
    siteName: SITE_NAME,
    url: "/",
    images: [
      {
        url: SHARE_IMAGE,
        width: 1200,
        height: 630,
        alt: "Henry Orellana muestra ContyGo en el celular: haz tu contrato tú mismo, en menos de 3 minutos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android Chrome: el teclado encoge el viewport en vez de tapar el contenido.
  interactiveWidget: "resizes-content",
  themeColor: "#1b4fa0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-style="clasico" className={`${sourceSans.variable} ${sourceSerif.variable} ${nunito.variable} ${nunitoSans.variable}`}>
      <body>
        {children}
        <MetaPixel />
        <PixelRouteTracker />
        <ConsentBanner />
        <AgentWidget enabled={agentEnabled || process.env.AGENT_PREVIEW === "1"} />
      </body>
    </html>
  );
}
