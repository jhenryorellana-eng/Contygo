/* Black Friday 2026 (pedido del dueño, 19-11-2026): 50 % en los honorarios, solo el viernes 27 de noviembre.
   El día se mide en la hora de Utah, donde está registrado ContyGo (en noviembre, UTC−7). La landing solo lo anuncia:
   el descuento lo aplican contygo.app y el Club al cobrar, y el precio que muestra cada tarjeta es el que la plataforma
   publica en ese momento. */
export const BLACK_FRIDAY = {
  day: "2026-11-27", label: "viernes 27 de noviembre", short: "viernes 27", zone: "America/Denver", percent: 50,
  /** The first and the last instant of that Friday in Utah: what the countdown counts to. */
  startsAt: "2026-11-27T07:00:00Z", endsAt: "2026-11-28T07:00:00Z",
} as const;

export type BlackFridayPhase = "antes" | "hoy" | "fuera";

/** Antes del viernes se anuncia; ese día es «hoy»; desde el sábado (hora de Utah), nada. */
export function blackFridayPhase(now: Date): BlackFridayPhase {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BLACK_FRIDAY.zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return today < BLACK_FRIDAY.day ? "antes" : today === BLACK_FRIDAY.day ? "hoy" : "fuera";
}

/** «Faltan 8 días», «Es mañana», «Solo hoy»: los días de calendario que faltan, en la hora de Utah. */
export function blackFridayWait(now: Date): string {
  const phase = blackFridayPhase(now);
  if (phase !== "antes") return phase === "hoy" ? "Solo hoy" : "";
  const days = Math.ceil((Date.parse(BLACK_FRIDAY.startsAt) - now.getTime()) / 86_400_000);
  return days > 1 ? `Faltan ${days} días` : "Es mañana";
}
