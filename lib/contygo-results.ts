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
 * `RESULTS_SAMPLE` and `REVIEWS_SAMPLE` exist only so the design can be judged: on the local page, and in the owner's
 * panel when he asks to see examples (24-11-2026: «haz unos ejemplos… para que Henry pueda ver cómo quedaría»). They render in
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
/* Examples, never clients: the names, the stories and the people in the pictures are made up (the photos were generated
   on 24-11-2026 and carry the word «EJEMPLO» across them). They are shown in development, and in the owner's panel only
   when he asks for them («Ver ejemplos»), always under a notice that says so. Never mixed with real stories. */
export const REVIEWS_SAMPLE: PublicReview[] = [
  { name: "María G.", service: "Permiso de Trabajo (I-765)", serviceId: "permiso-de-trabajo", rating: 5, kind: "approval", place: "Utah", image: "/contygo/ejemplos/permiso.webp", comment: "¡Me llegó mi permiso de trabajo! Subí mis documentos desde el celular y siempre supe en qué paso iba. Ya empecé en mi nuevo empleo." },
  { name: "Rosa y Kevin M.", service: "Visa Juvenil Premium", serviceId: "visa-juvenil", rating: 5, kind: "approval", place: "Maryland", image: "/contygo/ejemplos/juvenil.webp", comment: "Aprobaron la petición de mi hijo. Pensé que iba a ser imposible entender tanto papel, pero nos explicaron cada paso con paciencia. Gracias, Henry." },
  { name: "José L.", service: "Cambio de Corte", serviceId: "cambio-corte", rating: 5, kind: "approval", place: "Texas", image: "/contygo/ejemplos/corte.webp", comment: "Me mudé de estado y no sabía qué hacer con mi audiencia. Me guiaron paso a paso y mi caso ya está en mi nueva corte." },
  { name: "Familia Ramírez", service: "Asilo Político", serviceId: "asilo", rating: 5, kind: "review", place: "Florida", image: "/contygo/ejemplos/asilo.webp", comment: "Lo que más valoramos es que nos dijeron la verdad sobre los tiempos, qué dependía de ellos y qué no. Presentamos nuestra solicitud completa y ordenada." },
  { name: "Carlos V.", service: "Número ITIN", serviceId: "itin", rating: 5, kind: "approval", place: "Nevada", image: "/contygo/ejemplos/itin.webp", comment: "Ya tengo mi ITIN. Lo hice todo desde el celular, en los ratos libres del trabajo, y me avisaban cada vez que había una novedad." },
  { name: "Lucía P.", service: "Creación de LLC", serviceId: "llc", rating: 5, kind: "approval", place: "Florida", image: "/contygo/ejemplos/llc.webp", comment: "¡Abrí mi panadería con mi propia empresa! Me dejaron la LLC y el EIN listos, y entendí por fin qué papel era cada cosa." },
  { name: "Ana R.", service: "Reforzar Asilo", serviceId: "reforzar-asilo", rating: 5, kind: "review", place: "California", comment: "Ya había presentado mi asilo y sentía que le faltaba respaldo. Ordenaron mis pruebas y mi declaración, y llegué a mi audiencia mucho más tranquila." },
  { name: "Miguel T.", service: "Apelación (BIA)", serviceId: "apelacion", rating: 4, kind: "review", place: "Nueva Jersey", comment: "El juez decidió en mi contra y tenía pocos días. Prepararon el paquete a tiempo y me explicaron qué seguía. Todavía espero respuesta, pero no me quedé sin apelar." },
];

/** The scoreboard of the live show: what the case counter holds (lib/case-counter.ts), per service and in total. */
export type ScoreRow = { serviceId: string; label: string; created: number; pending: number; won: number };
export type Score = { totals: { created: number; pending: number; won: number }; rows: ScoreRow[]; updatedAt: string | null; updatedBy: string | null };
/** An example scoreboard, for «Ver ejemplos» only: made-up figures, shown under the notice that says so. */
export const SCORE_SAMPLE: Score = (() => {
  const rows: ScoreRow[] = [
    { serviceId: "permiso-de-trabajo", label: "Permiso de Trabajo (I-765)", created: 212, pending: 64, won: 141 },
    { serviceId: "visa-juvenil", label: "Visa Juvenil Premium", created: 58, pending: 31, won: 22 },
    { serviceId: "cambio-corte", label: "Cambio de Corte", created: 47, pending: 9, won: 36 },
    { serviceId: "asilo", label: "Asilo Político", created: 39, pending: 30, won: 4 },
    { serviceId: "itin", label: "Número ITIN", created: 26, pending: 5, won: 21 },
    { serviceId: "i-485", label: "Ajuste de Estatus I-485 (SIJ)", created: 21, pending: 12, won: 9 },
  ];
  return { rows, totals: rows.reduce((sum, row) => ({ created: sum.created + row.created, pending: sum.pending + row.pending, won: sum.won + row.won }), { created: 0, pending: 0, won: 0 }), updatedAt: null, updatedBy: null };
})();

/** From this many shared approvals on, the board shows their count. */
export const BOARD_FROM = 5;
