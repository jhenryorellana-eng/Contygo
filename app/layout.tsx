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

const SITE_NAME = "USA Latino Prime";
const SITE_TITLE = "UsaLatinoPrime — Evaluación migratoria gratuita";
const SITE_DESCRIPTION =
  "Lleva tu propio trámite migratorio desde el celular, paso a paso, con validación automática y nuestro equipo a tu lado. Descubre si calificas en minutos.";
const SHARE_DESCRIPTION =
  "Descubre si calificas para tu trámite migratorio en minutos, desde tu celular.";
const SHARE_IMAGE = "/og-image.jpg";

import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Small copies of /logo.png (1714 px, 935 KB): the browser downloads the icon on every visit.
  icons: { icon: { url: "/icon-64.png", sizes: "64x64", type: "image/png" }, apple: { url: "/apple-icon-180.png", sizes: "180x180" } },
  openGraph: {
    title: SITE_TITLE,
    description: SHARE_DESCRIPTION,
    type: "website",
    locale: "es_US",
    siteName: SITE_NAME,
    url: "/",
    images: [
      {
        url: SHARE_IMAGE,
        width: 1600,
        height: 902,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
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
