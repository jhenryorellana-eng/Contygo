/** Reviewed AE export, compressed for on-demand playback on the landing. */
export const VISA_JUVENIL_VIDEO = {
  src: "/contygo/films/visa-juvenil-v1-720p.mp4",
  poster: "/contygo/films/visa-juvenil-v1-poster.webp",
  captions: "/contygo/films/visa-juvenil-v1.es.vtt",
  duration: 125,
};

export const APELACION_VIDEO = {
  src: "/contygo/films/apelacion-v1-720p.mp4",
  poster: "/contygo/films/apelacion-v1-poster.webp",
  duration: 109.83333333333333,
};

export const REFORZAMIENTO_ASILO_VIDEO = {
  src: "/contygo/films/reforzamiento-asilo-v1-720p.mp4",
  poster: "/contygo/films/reforzamiento-asilo-v1-poster.webp",
  duration: 120,
};

export function formatVideoDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, "0")}`;
}

/** Existing explanatory media. Shared videos are labelled as introductions,
 * never as a dedicated explanation of a different service's scope. */
const PRESENTATIONS: Record<string, { src: string; poster?: string; caption: string }> = {
  "visa-juvenil": { ...VISA_JUVENIL_VIDEO, caption: "Conoce las tres etapas de Visa Juvenil · 2:05." },
  "i-360": { ...VISA_JUVENIL_VIDEO, caption: "Introducción general a Visa Juvenil. Este servicio se limita a la petición I-360; revisa el alcance de tu paquete." },
  "i-485": { src: "/videos/ajuste-estatus.mp4", caption: "Presentación del ajuste de estatus." },
  "asilo": { src: "/videos/asilo-politico.mp4", caption: "Presentación de Asilo Político." },
  "reforzar-asilo": { ...REFORZAMIENTO_ASILO_VIDEO, caption: "Conoce el Reforzamiento de Asilo · 2:00." },
  "apelacion": { ...APELACION_VIDEO, caption: "Conoce el proceso de Apelación ante la BIA · 1:50." },
  "cambio-corte": { src: "/videos/cambio-corte.mp4", caption: "Presentación de Cambio de Corte." },
  "itin": { src: "/videos/itin.mp4", caption: "Presentación de Número ITIN." },
  "impuestos": { src: "/videos/taxes.mp4", caption: "Presentación de Declaración de Impuestos." },
};

export function getServicePresentation(serviceId: string) {
  return Object.hasOwn(PRESENTATIONS, serviceId) ? PRESENTATIONS[serviceId] : null;
}
