/* ============================================================
   UsaLatinoPrime — Configuración del sitio
   ============================================================ */

// Número general de WhatsApp: lo usan TODOS los servicios.
// Se define en código (no por variable de entorno) para que ninguna
// configuración de Vercel pueda sobrescribirlo.
const RAW_WHATSAPP = "+1 (763) 342-2258";

/** Número tal cual para mostrar en pantalla. */
export const WHATSAPP_DISPLAY = RAW_WHATSAPP;

/** Sólo dígitos, para construir enlaces https://wa.me/<digits>. */
export const WHATSAPP_DIGITS = RAW_WHATSAPP.replace(/[^0-9]/g, "");

/** Video de fallback general (cuando un servicio no define el suyo). */
export const VIDEO_URL = process.env.NEXT_PUBLIC_VIDEO_URL ?? "";

/** Imagen de portada opcional del video. */
export const VIDEO_POSTER = process.env.NEXT_PUBLIC_VIDEO_POSTER ?? "";

/** Fases del embudo de cada servicio (página /slug). */
export const FUNNEL_PHASES = ["Video", "Preguntas", "Resultado"] as const;

/** Contenido del hero (admite <em> para resaltar). */
export const HERO_TITLE = "Tu trámite migratorio, <em>en tus manos</em>";
export const HERO_LEAD =
  "UsaLatinoPrime es una plataforma digital de inmigración — no un servicio tradicional. " +
  "Llevas tu propio caso desde el celular, guiado paso a paso, con validación automática " +
  "y nuestro equipo a tu lado en los momentos clave.";

/**
 * Construye el enlace de WhatsApp con un mensaje pre-redactado.
 * Si se pasa `digits`, usa ese número; si no, el general.
 */
export function waLink(message: string, digits: string = WHATSAPP_DIGITS): string {
  const target = digits || WHATSAPP_DIGITS;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}
