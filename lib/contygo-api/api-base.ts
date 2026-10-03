/* ============================================================
   ContyGo · a qué servidor va la clave (lógica pura, sin red)
   En producción (VERCEL_ENV=production) la clave Bearer SOLO viaja a
   contygo.app: CONTYGO_API_BASE se ignora salvo que su host sea
   exactamente ese (sin punto final). Fuera de producción manda la variable.
   ============================================================ */

export const CONTYGO_API_BASE = "https://contygo.app/api/integrations/v1";
export const CONTYGO_PRODUCTION_HOST = "contygo.app";

/** Host en minúsculas y sin el punto final de un FQDN («contygo.app.»), o null si no es una URL. */
export function hostOf(value: string | undefined | null): string | null {
  if (!value) return null;
  try { return new URL(value).hostname.toLowerCase().replace(/\.+$/, ""); } catch { return null; }
}

/** Host de CONTYGO_API_BASE tal cual está definida (null si falta o no es una URL). */
export function customApiHost(env: Record<string, string | undefined> = process.env): string | null {
  return hostOf(env.CONTYGO_API_BASE);
}

/** La base de la API que se usa de verdad (sin barra final). */
export function effectiveApiBase(env: Record<string, string | undefined> = process.env): string {
  const custom = env.CONTYGO_API_BASE;
  if (!custom) return CONTYGO_API_BASE;
  if (env.VERCEL_ENV === "production") {
    try {
      const url = new URL(custom);
      if (url.protocol === "https:" && !url.username && !url.password && !url.port && hostOf(custom) === CONTYGO_PRODUCTION_HOST) return `https://${CONTYGO_PRODUCTION_HOST}${url.pathname.replace(/\/+$/, "")}`;
    } catch { /* inválida: se ignora */ }
    return CONTYGO_API_BASE;
  }
  return custom.replace(/\/+$/, "");
}
