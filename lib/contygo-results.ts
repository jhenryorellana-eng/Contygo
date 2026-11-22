/**
 * Approvals to show on the landing (21-11-2026). The owner wants a board where Henry shows «cuántas personas están
 * siendo aprobadas sus permisos de trabajo y demás servicios», and a place to ask clients how it went.
 *
 * The page never shows a made-up figure. An approval is a decision of the authority on a client's case, so every
 * number here has to come from the owner's own records, with who confirmed it and when, like the claims in
 * lib/contygo-claims.ts («clientes atendidos» is not a count of approvals and must never read as one). Until
 * `verified` is filled in and a row has a number, the board is not rendered at all.
 *
 * Without confirmed figures, the board counts the approvals clients themselves have shared and the owner approved
 * (`reviews` of kind «approval»): a true count, and it says what it counts. It shows from FIVE on.
 *
 * `RESULTS_SAMPLE` and `REVIEWS_SAMPLE` exist only so the design can be judged on the local page: they render in
 * development alone, under a mark that says they are examples.
 */
export type ResultRow = { serviceId: string; label: string; approved: number };
/** A story the owner approved: what the client told, whether it is an approval, from where and, with their permission, a photo. */
export type PublicReview = { name: string; service: string | null; serviceId?: string | null; rating: number; comment: string; kind?: "review" | "approval"; place?: string | null; image?: string | null };

export const CONTYGO_RESULTS: {
  verified: null | { by: string; on: string; evidence: string };
  /** The day the figures were last counted (YYYY-MM-DD). */
  updatedOn: string | null;
  rows: ResultRow[];
} = { verified: null, updatedOn: null, rows: [] };

export const resultsPublic = () => CONTYGO_RESULTS.verified !== null && CONTYGO_RESULTS.rows.some(row => row.approved > 0);

export const RESULTS_SAMPLE: ResultRow[] = [
  { serviceId: "permiso-de-trabajo", label: "Permiso de trabajo", approved: 128 },
  { serviceId: "visa-juvenil", label: "Visa Juvenil", approved: 46 },
  { serviceId: "cambio-corte", label: "Cambio de corte", approved: 31 },
  { serviceId: "i-485", label: "Residencia (I-485)", approved: 17 },
];
/* (Their pictures are drawings of the brand, standing in for the photo a client would send.) */
export const REVIEWS_SAMPLE: PublicReview[] = [
  { name: "María G.", service: "Permiso de trabajo", rating: 5, kind: "approval", place: "Utah", image: "/contygo/v8/escena-medio.webp", comment: "¡Me llegó mi permiso de trabajo! Subí mis documentos desde el celular y siempre supe en qué paso iba." },
  { name: "José L.", service: "Cambio de corte", rating: 5, kind: "approval", place: "Texas", image: "/contygo/v8/ruta-servicios.webp", comment: "Me mudé de estado y no sabía qué hacer. Me guiaron paso a paso y mi caso ya está en mi nueva corte." },
  { name: "Ana R.", service: "Visa Juvenil", rating: 5, kind: "review", place: "Florida", comment: "Lo que más valoro es que me decían la verdad sobre los tiempos y qué dependía de ellos y qué no." },
];

/** From this many shared approvals on, the board shows their count. */
export const BOARD_FROM = 5;
