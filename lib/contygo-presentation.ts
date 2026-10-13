/** Reviewed AE export, compressed for on-demand playback on the landing. */
export const VISA_JUVENIL_VIDEO = {
  src: "/contygo/films/visa-juvenil-v1-720p.mp4",
  poster: "/contygo/films/visa-juvenil-v1-poster.webp",
  captions: "/contygo/films/visa-juvenil-v1.es.vtt",
  duration: 125,
};

/** Second Visa Juvenil film (the proposal before the contract), compressed for on-demand playback. */
export const VISA_JUVENIL_VIDEO_2 = {
  src: "/contygo/films/visa-juvenil-video2-v1-720p.mp4",
  poster: "/contygo/films/visa-juvenil-video2-v1-poster.webp",
  duration: 920.92,
};

export const APELACION_VIDEO = {
  src: "/contygo/films/apelacion-v1-720p.mp4",
  poster: "/contygo/films/apelacion-v1-poster.webp",
  duration: 109.83333333333333,
};

/** Second Apelación film (the initial package and the later legal brief, before the contract), compressed for on-demand playback. */
export const APELACION_VIDEO_2 = {
  src: "/contygo/films/apelacion-video2-v1-720p.mp4",
  poster: "/contygo/films/apelacion-video2-v1-poster.webp",
  duration: 383.3333333333333,
};

export const REFORZAMIENTO_ASILO_VIDEO = {
  src: "/contygo/films/reforzamiento-asilo-v1-720p.mp4",
  poster: "/contygo/films/reforzamiento-asilo-v1-poster.webp",
  duration: 120,
};

/** Second Reforzamiento de Asilo film (the three stages, scope and price before the contract), compressed for on-demand playback. */
export const REFORZAMIENTO_ASILO_VIDEO_2 = {
  src: "/contygo/films/reforzamiento-asilo-video2-v1-720p.mp4",
  poster: "/contygo/films/reforzamiento-asilo-video2-v1-poster.webp",
  duration: 374.4583333333333,
};

export const AJUSTE_ESTATUS_VIDEO = {
  src: "/contygo/films/ajuste-estatus-v1-720p.mp4",
  poster: "/contygo/films/ajuste-estatus-v1-poster.webp",
  duration: 145,
};

/** Second Ajuste de estatus film (the proposal and the early-contract offer before the contract), compressed for on-demand playback. */
export const AJUSTE_ESTATUS_VIDEO_2 = {
  src: "/contygo/films/ajuste-estatus-video2-v1-720p.mp4",
  poster: "/contygo/films/ajuste-estatus-video2-v1-poster.webp",
  duration: 392.625,
};

/** First Preparación de audiencia film (what each hearing is and how the session with Henry helps), compressed for on-demand playback. */
export const PREPARACION_AUDIENCIA_VIDEO = {
  src: "/contygo/films/preparacion-audiencia-v1-720p.mp4",
  poster: "/contygo/films/preparacion-audiencia-v1-poster.webp",
  duration: 79.58333333333333,
};

/** Second Preparación de audiencia film (the two sessions with Henry, their prices and how to book), compressed for on-demand playback. */
export const PREPARACION_AUDIENCIA_VIDEO_2 = {
  src: "/contygo/films/preparacion-audiencia-video2-v1-720p.mp4",
  poster: "/contygo/films/preparacion-audiencia-video2-v1-poster.webp",
  duration: 149.08333333333334,
};

export function formatVideoDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, "0")}`;
}

/** Existing explanatory media. Shared videos are labelled as introductions,
 * never as a dedicated explanation of a different service's scope. */
const PRESENTATIONS: Record<string, { src: string; poster?: string; caption: string }> = {
  "visa-juvenil": { ...VISA_JUVENIL_VIDEO, caption: "Conoce las tres etapas de Visa Juvenil · 2:05." },
  "i-360": { ...VISA_JUVENIL_VIDEO, caption: "Introducción general a Visa Juvenil. Este servicio se limita a la petición I-360; revisa el alcance de tu paquete." },
  "i-485": { ...AJUSTE_ESTATUS_VIDEO, caption: "Conoce el Ajuste de estatus · 2:25." },
  "asilo": { src: "/videos/asilo-politico.mp4", caption: "Presentación de Asilo Político." },
  "reforzar-asilo": { ...REFORZAMIENTO_ASILO_VIDEO, caption: "Conoce el Reforzamiento de Asilo · 2:00." },
  "apelacion": { ...APELACION_VIDEO, caption: "Conoce el proceso de Apelación ante la BIA · 1:50." },
  "preparacion-audiencia": { ...PREPARACION_AUDIENCIA_VIDEO, caption: "Conoce la Preparación de Audiencia · 1:20." },
  "cambio-corte": { src: "/videos/cambio-corte.mp4", caption: "Presentación de Cambio de Corte." },
  "itin": { src: "/videos/itin.mp4", caption: "Presentación de Número ITIN." },
  "impuestos": { src: "/videos/taxes.mp4", caption: "Presentación de Declaración de Impuestos." },
};

export function getServicePresentation(serviceId: string) {
  return Object.hasOwn(PRESENTATIONS, serviceId) ? PRESENTATIONS[serviceId] : null;
}
