"use client";

/* ============================================================
   Meta Pixel — snippet base.
   CONSENTIMIENTO PRIMERO (decisión del dueño, 02-10-2026): mientras la persona no acepte el banner
   (ConsentBanner) NO se carga nada de Meta: ni el script connect.facebook.net ni cookies. Al aceptar
   (evento CONSENT_EVENT, o una elección guardada de una visita anterior) se inyecta el snippet, que
   hace `init` + `PageView` DENTRO del script inline (no en useEffect) para no duplicarse con
   React StrictMode en desarrollo. Solo NEXT_PUBLIC_META_REQUIRE_CONSENT === "0" lo carga sin pedir.
   ============================================================ */
import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_EVENT, CONSENT_STORAGE_KEY, PIXEL_ID, REQUIRE_CONSENT } from "@/lib/meta/events";

function storedConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted";
  } catch {
    return false;
  }
}

export function MetaPixel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!PIXEL_ID) return;
    if (!REQUIRE_CONSENT || storedConsent()) {
      setEnabled(true);
      return;
    }
    const onGrant = () => setEnabled(true);
    window.addEventListener(CONSENT_EVENT, onGrant);
    return () => window.removeEventListener(CONSENT_EVENT, onGrant);
  }, []);

  if (!PIXEL_ID || !enabled) return null;

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
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
