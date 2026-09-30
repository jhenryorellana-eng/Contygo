"use client";

/* ============================================================
   Meta Pixel — PageView en navegaciones internas.
   El snippet base dispara PageView solo en la carga completa; con el sitio
   multi-ruta (home, /visa-juvenil, …) las navegaciones client-side de Next
   no recargan la página, así que aquí se dispara PageView al cambiar la ruta.
   El primer render se salta (ya lo cubrió el snippet base).
   ============================================================ */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackBrowser } from "@/lib/meta/pixel-client";

export function PixelRouteTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    trackBrowser("PageView");
  }, [pathname]);

  return null;
}
