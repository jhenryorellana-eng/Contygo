/* ============================================================
   Boletín de visas (Visa Bulletin) · fila EB-4 para el ajuste SIJ (SOLO servidor)
   La fuente es USCIS, no el Departamento de Estado: su página «Adjustment of Status
   Filing Charts» dice cada mes QUÉ tabla vale para presentar el I-485 (Final Action
   Dates o Dates for Filing) y su página mensual la reproduce en HTML. travel.state.gov
   está detrás de Cloudflare y rechaza las descargas de un servidor (403, 10-10-2026).
   Si USCIS no responde o cambia su HTML, se usa la copia verificada (SNAPSHOT) y la
   persona siempre oye de qué mes es el dato. Ver docs/evidencia-fecha-de-prioridad.md.
   ============================================================ */

export const USCIS_ORIGIN = "https://www.uscis.gov";
export const USCIS_CHARTS_URL = `${USCIS_ORIGIN}/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/adjustment-of-status-filing-charts-from-the-visa-bulletin`;
export const USCIS_PRIORITY_DATES_URL = `${USCIS_ORIGIN}/green-card/green-card-processes-and-procedures/visa-availability-priority-dates`;

/** Una columna de país de la fila EB-4: «C» al día, «U» sin visas, o la fecha de corte (YYYY-MM-DD). */
export interface BulletinColumn { header: string; cutoff: "C" | "U" | string }
export interface Eb4Bulletin {
  /** Mes del boletín: "2026-10". */
  month: string;
  /** La tabla que USCIS indica ese mes para presentar el I-485 por empleo. */
  chart: "filing" | "final";
  /** La primera es «All Chargeability Areas Except Those Listed». */
  columns: BulletinColumn[];
  chartUrl: string;
  bulletinUrl: string | null;
  source: "live" | "snapshot";
}

/** Octubre de 2026, comprobado a mano el 10-10-2026 en USCIS (tabla) y en travel.state.gov (boletín). */
export const EB4_SNAPSHOT: Eb4Bulletin = {
  month: "2026-10",
  chart: "filing",
  columns: [
    { header: "All Chargeability Areas Except Those Listed", cutoff: "2025-01-01" },
    { header: "CHINA- mainland born", cutoff: "2025-01-01" },
    { header: "INDIA", cutoff: "2025-01-01" },
    { header: "MEXICO", cutoff: "2025-01-01" },
    { header: "PHILIPPINES", cutoff: "2025-01-01" },
  ],
  chartUrl: `${USCIS_ORIGIN}/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/when-to-file-your-adjustment-of-status-application-for-family-sponsored-or-employment-based-129`,
  bulletinUrl: "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/2027/visa-bulletin-for-october-2026.html",
  source: "snapshot",
};

// ---------------- Lectura del HTML de USCIS ----------------

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MON3 = MONTHS.map(month => month.slice(0, 3).toUpperCase());

const decode = (html: string) => html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;|&#8217;/g, "'").replace(/\s+/g, " ").trim();

/** «01JAN25» → "2025-01-01"; «C» y «U» tal cual. Cualquier otra cosa: null (el HTML cambió). */
export function parseCutoff(cell: string): BulletinColumn["cutoff"] | null {
  const value = cell.replace(/\s+/g, "").toUpperCase();
  if (value === "C" || value === "U") return value;
  const match = /^(\d{2})([A-Z]{3})(\d{2})$/.exec(value);
  if (!match) return null;
  const month = MON3.indexOf(match[2]);
  const day = Number(match[1]);
  if (month < 0 || day < 1 || day > 31) return null;
  return `20${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1]}`;
}

/** «October 2026» → "2026-10". */
function monthKey(text: string): string | null {
  const match = new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{4})\\b`, "i").exec(text);
  return match ? `${match[2]}-${String(MONTHS.indexOf(match[1].toLowerCase()) + 1).padStart(2, "0")}` : null;
}

/** Del índice de USCIS: el enlace a la página del mes en curso y la tabla que manda para empleo. */
export function parseChartsIndex(html: string): { chartUrl: string; chart: "filing" | "final"; bulletinUrl: string | null } | null {
  const start = html.search(/<h2[^>]*>\s*Current Month/i);
  if (start < 0) return null;
  const rest = html.slice(start + 4);
  const end = rest.search(/<h2[\s>]/i);
  const section = end < 0 ? rest : rest.slice(0, end);
  const employment = /employment-based preference categories[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(section);
  const page = /<a[^>]*href="([^"]+)"[^>]*>\s*USCIS\s+[A-Za-z]+\s+\d{4}\s+Adjustment of Status Filing Charts\s*<\/a>/i.exec(section);
  if (!employment || !page) return null;
  const label = decode(employment[2]);
  const chart = /dates for filing/i.test(label) ? "filing" : /final action/i.test(label) ? "final" : null;
  if (!chart) return null;
  const chartUrl = page[1].startsWith("/") ? `${USCIS_ORIGIN}${page[1]}` : page[1];
  if (!/^https:\/\/www\.uscis\.gov\//.test(chartUrl)) return null;
  return { chartUrl, chart, bulletinUrl: /^https:\/\/travel\.state\.gov\//.test(employment[1]) ? employment[1] : null };
}

/** De la página mensual de USCIS: el mes y la fila «4th» de la tabla de empleo. */
export function parseChartPage(html: string): { month: string; chart: "filing" | "final"; columns: BulletinColumn[] } | null {
  const title = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) ?? /<title>([\s\S]*?)<\/title>/i.exec(html);
  const month = title ? monthKey(decode(title[1])) : null;
  if (!month) return null;
  for (const table of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const caption = decode(/<caption[^>]*>([\s\S]*?)<\/caption>/i.exec(table)?.[1] ?? "");
    if (!/employment-based/i.test(caption)) continue;
    const chart = /dates for filing/i.test(caption) ? "filing" : /final action/i.test(caption) ? "final" : null;
    const rows = (table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []).map(row => (row.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi) ?? []).map(decode));
    const headers = rows[0]?.slice(1) ?? [];
    const eb4 = rows.find(cells => /^4th$/i.test(cells[0] ?? ""));
    if (!chart || !headers.length || !eb4 || eb4.length - 1 !== headers.length || !/all chargeability/i.test(headers[0])) return null;
    const columns: BulletinColumn[] = [];
    for (let index = 0; index < headers.length; index++) {
      const cutoff = parseCutoff(eb4[index + 1]);
      if (!cutoff) return null;
      columns.push({ header: headers[index], cutoff });
    }
    return { month, chart, columns };
  }
  return null;
}

// ---------------- Descarga con memoria ----------------

const FRESH_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;
type Memory = { at: number; value: Eb4Bulletin | null; pending?: Promise<Eb4Bulletin | null> };
const holder = globalThis as typeof globalThis & { __contygoBulletin?: Memory };

/** Solo tests: fija el boletín (o null = USCIS caído) o lo borra (undefined). */
export function setBulletinForTests(value: Eb4Bulletin | null | undefined) {
  holder.__contygoBulletin = value === undefined ? undefined : { at: Date.now(), value };
}

async function download(url: string) {
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "text/html", "User-Agent": "ContyGo-landing/1.0 (+https://contygo.app)" }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.text();
}

async function fetchLive(): Promise<Eb4Bulletin | null> {
  try {
    const index = parseChartsIndex(await download(USCIS_CHARTS_URL));
    if (!index) { console.warn("[boletín] índice de USCIS ilegible"); return null; }
    const page = parseChartPage(await download(index.chartUrl));
    if (!page) { console.warn("[boletín] tabla de USCIS ilegible"); return null; }
    // La tabla de la página y la que el índice designa deben coincidir.
    if (page.chart !== index.chart) { console.warn("[boletín] la tabla no coincide con la designada"); return null; }
    return { ...page, chartUrl: index.chartUrl, bulletinUrl: index.bulletinUrl, source: "live" };
  } catch (error) {
    console.warn(`[boletín] USCIS no respondió: ${error instanceof Error ? error.message : "error"}`);
    return null;
  }
}

/** El boletín en vigor según USCIS (6 h en memoria); sin él, la copia verificada. */
export async function loadEb4Bulletin(): Promise<Eb4Bulletin> {
  const memo = holder.__contygoBulletin;
  if (memo && !memo.pending && Date.now() - memo.at < (memo.value ? FRESH_MS : RETRY_MS)) return memo.value ?? EB4_SNAPSHOT;
  if (memo?.pending) return (await memo.pending) ?? EB4_SNAPSHOT;
  const pending = fetchLive();
  holder.__contygoBulletin = { at: memo?.at ?? 0, value: memo?.value ?? null, pending };
  const value = await pending;
  // Un fallo no borra un dato vivo anterior: se sigue usando y se reintenta a los 10 minutos.
  holder.__contygoBulletin = value ? { at: Date.now(), value }
    : { at: memo?.value ? Date.now() - FRESH_MS + RETRY_MS : Date.now(), value: memo?.value ?? null };
  return holder.__contygoBulletin.value ?? EB4_SNAPSHOT;
}

/** Mes en curso en Washington: "2026-10". */
export function currentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(part => part.type === "year")!.value}-${parts.find(part => part.type === "month")!.value}`;
}

/** Vale el boletín del mes o el del mes anterior (los primeros días, antes de que USCIS publique). Más viejo: no se usa. */
export function isUsable(bulletin: Eb4Bulletin, now = new Date()) {
  const [year, month] = currentMonth(now).split("-").map(Number);
  const previous = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  return bulletin.month === currentMonth(now) || bulletin.month === previous;
}
