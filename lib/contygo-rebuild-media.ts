import { CONTYGO_SERVICES, type ContygoCategory } from "./contygo-catalog";
import { APELACION_VIDEO, REFORZAMIENTO_ASILO_VIDEO, VISA_JUVENIL_VIDEO, VISA_JUVENIL_VIDEO_2, getServicePresentation } from "./contygo-presentation";

/** New films only; retained category artwork remains until its visual pilot is ready.
 * null means the owner has not supplied the Grok export. */
/** onScreenText: `captions` is on-screen text for a film without narration (no subtitles toggle). */
export type RebuildFilm = { src: string | null; poster: string; captions?: string; onScreenText?: boolean; duration: number; provisional?: boolean };
export const REBUILD_ASSET_ROOT = "/contygo/rebuild-v4";
export const REBUILD_HERO = { poster: `${REBUILD_ASSET_ROOT}/hero.png`, video: null as string | null };
export const REBUILD_CATEGORIES: Record<ContygoCategory, { poster: string; video: string | null; label: string; headline: string; description: string }> = {
  familia: { poster: `${REBUILD_ASSET_ROOT}/familia.png`, video: null, label: "Familia", headline: "El siguiente paso de tu familia.", description: "Custodia, petición juvenil y ajuste de estatus: cada etapa, con su propio alcance." },
  asilo: { poster: `/contygo/cinema-v3/asilo.png`, video: null, label: "Asilo", headline: "Tu historia merece estar bien preparada.", description: "Preparación, respaldo documental y evaluación de tu caso." },
  corte: { poster: `/contygo/cinema-v3/corte.png`, video: null, label: "Corte", headline: "Documentos para tu siguiente paso.", description: "Conoce el alcance de cada preparación ante la corte o la BIA." },
  fiscal: { poster: `/contygo/cinema-v3/fiscal.png`, video: null, label: "Impuestos", headline: "Tus documentos fiscales, en orden.", description: "ITIN y declaración de impuestos, con tus datos organizados." },
  empresa: { poster: `/contygo/cinema-v3/empresa.png`, video: null, label: "Empresa", headline: "Dale forma a lo que estás construyendo.", description: "Constituye tu LLC en Florida y conoce qué incluye cada paquete." },
};

// Populate only after each assembled export has been reviewed. Do not map old
// category loops or unrelated service videos to these explanatory films.
export const REBUILD_SERVICE_FILMS: Record<string, string | null> = {
  ...Object.fromEntries(CONTYGO_SERVICES.map(s => [s.id, null])),
  "visa-juvenil": VISA_JUVENIL_VIDEO.src,
  "apelacion": APELACION_VIDEO.src,
  "reforzar-asilo": REFORZAMIENTO_ASILO_VIDEO.src,
};
export const REBUILD_PLATFORM_FILMS: Record<string, string | null> = {
  ...Object.fromEntries(CONTYGO_SERVICES.map(s => [s.id, null])),
  "visa-juvenil": VISA_JUVENIL_VIDEO_2.src,
};
/** Shared app demonstration (6 s) until each service's final second film is supplied. */
export const PROVISIONAL_PLATFORM_FILM: RebuildFilm = { src: "/contygo/hero-video-v2/01-elige-desktop.mp4", poster: "/contygo/hero-video-v2/01-elige-desktop.jpg", captions: "/contygo/hero-video-v2/01-elige.es.vtt", onScreenText: true, duration: 6, provisional: true };
export function getRebuildServiceFilm(id: string): RebuildFilm {
  if (id === "visa-juvenil") return { ...VISA_JUVENIL_VIDEO, src: REBUILD_SERVICE_FILMS[id] };
  if (id === "apelacion") return { ...APELACION_VIDEO, src: REBUILD_SERVICE_FILMS[id] };
  if (id === "reforzar-asilo") return { ...REFORZAMIENTO_ASILO_VIDEO, src: REBUILD_SERVICE_FILMS[id] };
  const service = CONTYGO_SERVICES.find(s => s.id === id);
  const presentation = getServicePresentation(id);
  return { src: REBUILD_SERVICE_FILMS[id] ?? presentation?.src ?? null, poster: presentation?.poster ?? REBUILD_CATEGORIES[service?.category ?? "familia"].poster, duration: 0 };
}
export function getRebuildPlatformFilm(id: string): RebuildFilm {
  if (id === "visa-juvenil") return { ...VISA_JUVENIL_VIDEO_2, src: REBUILD_PLATFORM_FILMS[id] };
  const src=REBUILD_PLATFORM_FILMS[id];
  if(!src||src===PROVISIONAL_PLATFORM_FILM.src)return PROVISIONAL_PLATFORM_FILM;
  return {src,poster:getRebuildServiceFilm(id).poster,duration:0};
}

