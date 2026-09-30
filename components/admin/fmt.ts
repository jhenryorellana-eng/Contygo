/* ============================================================
   Utilidades de fecha/hora compartidas por el panel (cliente).
   ============================================================ */
export const DAY = 864e5;

export const timeFmt = new Intl.DateTimeFormat("es-US", { hour: "numeric", minute: "2-digit" });
export const dayFmt = new Intl.DateTimeFormat("es-US", { weekday: "short", day: "numeric", month: "short" });
export const shortDayFmt = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short" });
export const dateTimeFmt = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "ahora mismo", "hace 5 min", "hace 3 h", "ayer", "hace 4 días" */
export function timeAgo(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "ahora mismo";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 31) return `hace ${d} días`;
  const mo = Math.round(d / 30);
  return `hace ${mo} ${mo === 1 ? "mes" : "meses"}`;
}

/** Tiempo de espera compacto: "12 min", "3 h", "2 d" */
export function waitShort(iso: string, now: number): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

/** "Hoy", "Ayer", "Mañana" o "jue, 4 sept" */
export function dayLabel(t: number, now: number): string {
  const d0 = startOfDay(now);
  const d = startOfDay(t);
  if (d === d0) return "Hoy";
  if (d === d0 - DAY) return "Ayer";
  if (d === d0 + DAY) return "Mañana";
  return dayFmt.format(new Date(t));
}

/** Fecha corta con hora: "Hoy 3:30 p.m.", "Mañana 10:00 a.m.", "jue, 4 sept 9:00 a.m." */
export function whenLabel(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  return `${dayLabel(t, now)} ${timeFmt.format(new Date(t))}`;
}

/** Valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

/** Colores de identidad por asesora, en orden fijo (validados para daltonismo). */
export const ADVISOR_COLORS = ["#1b4fa0", "#1f8a70", "#c8901f", "#7a4fbf"];
