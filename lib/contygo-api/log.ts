/* ============================================================
   ContyGo · registro de fallos de configuración (SOLO servidor)
   Formato fijo para alertar, sin PII ni credenciales: dónde y qué código.
   A lo sumo UNA línea por código y minuto en cada instancia: un error de
   configuración no debe inundar la alerta con cada visita.
   ============================================================ */

const THROTTLE_MS = 60_000;
const MAX_CODES = 200;
const holder = globalThis as typeof globalThis & { __contygoConfigLog?: Map<string, number> };
const seen = () => (holder.__contygoConfigLog ??= new Map());

/** Solo tests. */
export function resetConfigLog() { holder.__contygoConfigLog = undefined; }

export function logConfig(where: string, code: string) {
  const clean = code.replace(/[^A-Za-z0-9_]/g, "").slice(0, 60);
  const map = seen();
  const now = Date.now();
  const last = map.get(clean);
  if (last !== undefined && now - last < THROTTLE_MS) return;
  if (map.size >= MAX_CODES) map.clear();
  map.set(clean, now);
  console.error(`[contygo:config] ${where} ${clean}`);
}
