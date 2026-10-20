/* ============================================================
   UsaLatinoPrime — Configuración del sitio
   ============================================================ */

// Los números de WhatsApp de la landing. Se definen en código (no por variable
// de entorno) para que ninguna configuración de Vercel pueda sobrescribirlos. No
// escribas otro número en componentes, textos ni enlaces: importa estas constantes.
// El general: el bot de ventas de ContyGo (ayuda, asesor cuando no se puede contratar en línea).
const RAW_WHATSAPP = "+1 (385) 392-7656";
// El del CRM (20-10-2026): «Crea tu contrato con un asesor», al final de los vídeos. El dueño confirmó que es
// el mismo número que el general; va aparte para poder cambiarlo sin tocar los demás botones.
const RAW_CRM_WHATSAPP = "+1 (385) 392-7656";

/** Número tal cual para mostrar en pantalla. */
export const WHATSAPP_DISPLAY = RAW_WHATSAPP;

/** Sólo dígitos, para construir enlaces https://wa.me/<digits>. */
export const WHATSAPP_DIGITS = RAW_WHATSAPP.replace(/[^0-9]/g, "");

/** El WhatsApp del CRM, para mostrar y en dígitos. */
export const CRM_WHATSAPP_DISPLAY = RAW_CRM_WHATSAPP;
export const CRM_WHATSAPP_DIGITS = RAW_CRM_WHATSAPP.replace(/[^0-9]/g, "");

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
 * Siempre apunta al número único de WhatsApp (WHATSAPP_DIGITS).
 */
export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(message)}`;
}

/** El chat del CRM con un mensaje pre-redactado: «Crea tu contrato con un asesor». */
export function crmWaLink(message: string): string {
  return `https://wa.me/${CRM_WHATSAPP_DIGITS}?text=${encodeURIComponent(message)}`;
}
