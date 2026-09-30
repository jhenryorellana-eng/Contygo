/* ============================================================
   UsaLatinoPrime — URL pública del sitio
   Permite override manual; si no, usa el dominio de producción que
   Vercel inyecta automáticamente; en local cae a localhost.
   (`||` y no `??`: la env var puede venir como cadena vacía.)
   ============================================================ */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
