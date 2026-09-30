"use client";

/* ============================================================
   Meta Pixel — snippet base.
   - `init` + `PageView` van DENTRO del script inline (no en useEffect) para
     no duplicarse con React StrictMode en desarrollo.
   - Esta landing es una SPA de una sola URL → no se necesita tracker de ruta.
   - Variante B (consentimiento): si REQUIRE_CONSENT, arranca con consent
     "revoke" y NO dispara PageView aquí (lo hace ConsentBanner al aceptar).
   ============================================================ */
import Script from "next/script";
import { PIXEL_ID, REQUIRE_CONSENT } from "@/lib/meta/events";

export function MetaPixel() {
  if (!PIXEL_ID) return null;

  const consentLine = REQUIRE_CONSENT ? "fbq('consent', 'revoke');" : "";
  const pageViewLine = REQUIRE_CONSENT ? "" : "fbq('track', 'PageView');";

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        ${consentLine}
        fbq('init', '${PIXEL_ID}');
        ${pageViewLine}
      `}
    </Script>
  );
}
