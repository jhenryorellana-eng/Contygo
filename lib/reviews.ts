/* ============================================================
   Felicitaciones y reseñas de clientes (SOLO servidor)
   - Un cliente la envía desde /califica (queda «pending»).
   - El dueño la aprueba o la rechaza en /admin, y enseña las
     aprobadas desde su panel (/admin/felicitaciones). No hay lista
     pública.

   Dónde se guardan (22-11-2026): en un almacén PRIVADO de Vercel
   Blob del proyecto, sin base de datos: cada felicitación es un
   archivo JSON y su foto, un JPEG al lado. Nada de ello tiene
   dirección pública: se lee con la credencial del proyecto y solo
   sale por las rutas del panel, que piden la sesión del dueño.
     felicitaciones/historias/<id>.json
     felicitaciones/fotos/<id>.jpg
   (Antes iba a Supabase, que nunca llegó a conectarse en este
   proyecto; el plan gratuito no está disponible en la cuenta.)

   Sin almacén conectado: en desarrollo se guarda en una carpeta
   local (.felicitaciones-local/, fuera de git) para poder probar;
   en producción el sistema se declara apagado (reviewsEnabled).
   ============================================================ */
import { get, list, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  name: string;
  service_id: string | null;
  rating: number;
  comment: string;
  created_at: string;
  status?: ReviewStatus;
  /** Si es un trámite aprobado, desde dónde, y si trae foto (con el permiso de quien la envió). */
  kind?: "review" | "approval";
  place?: string | null;
  consent?: boolean;
  has_photo?: boolean;
}

const BLOB = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
const LOCAL = !BLOB && process.env.NODE_ENV === "development";
const LOCAL_DIR = path.join(process.cwd(), ".felicitaciones-local");
const STORIES = "felicitaciones/historias/";
const PHOTOS = "felicitaciones/fotos/";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const reviewsEnabled = BLOB || LOCAL;

/* ---- Leer y escribir un archivo, en el almacén o (en desarrollo) en la carpeta local ---- */
async function write(file: string, body: string | Uint8Array, type: string): Promise<void> {
  if (BLOB) {
    const data = typeof body === "string" ? body : Buffer.from(body);
    await put(file, data, { access: "private", contentType: type, addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  const target = path.join(LOCAL_DIR, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
}
async function read(file: string): Promise<Uint8Array | null> {
  if (BLOB) {
    // Sin la caché: un cambio de estado se ve al instante.
    const found = await get(file, { access: "private", useCache: false });
    if (!found || found.statusCode !== 200) return null;
    return new Uint8Array(await new Response(found.stream).arrayBuffer());
  }
  try {
    return new Uint8Array(await fs.readFile(path.join(LOCAL_DIR, file)));
  } catch {
    return null;
  }
}
async function names(prefix: string): Promise<string[]> {
  if (BLOB) {
    const all: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      all.push(...page.blobs.map((blob) => blob.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return all;
  }
  try {
    return (await fs.readdir(path.join(LOCAL_DIR, prefix))).map((name) => prefix + name);
  } catch {
    return [];
  }
}
async function story(id: string): Promise<Review | null> {
  const bytes = await read(`${STORIES}${id}.json`);
  if (!bytes) return null;
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as Review;
  } catch {
    return null;
  }
}

/** Guarda una felicitación (y su foto, ya revisada y limpia por la ruta); queda «pending». */
export async function insertReview(input: {
  name: string;
  serviceId: string | null;
  rating: number;
  comment: string;
  kind?: "review" | "approval";
  place?: string | null;
  consent?: boolean;
  photo?: Uint8Array | null;
}): Promise<boolean> {
  if (!reviewsEnabled) return false;
  // Una foto, solo con permiso.
  if (input.photo && !input.consent) return false;
  const id = randomUUID();
  try {
    if (input.photo) await write(`${PHOTOS}${id}.jpg`, input.photo, "image/jpeg");
    const record: Review = {
      id,
      name: input.name,
      service_id: input.serviceId,
      rating: input.rating,
      comment: input.comment,
      created_at: new Date().toISOString(),
      status: "pending",
      kind: input.kind === "approval" ? "approval" : "review",
      place: input.place ?? null,
      consent: input.consent === true,
      has_photo: Boolean(input.photo),
    };
    await write(`${STORIES}${id}.json`, JSON.stringify(record), "application/json");
    return true;
  } catch {
    return false;
  }
}

/** Las felicitaciones por estado, las más recientes primero (para el panel: la ruta pide la sesión del dueño). */
export async function adminListReviews(status: ReviewStatus | "all"): Promise<Review[] | null> {
  if (!reviewsEnabled) return null;
  try {
    const ids = (await names(STORIES)).map((file) => file.slice(STORIES.length, -".json".length)).filter((id) => UUID.test(id));
    const all: Review[] = [];
    for (let from = 0; from < ids.length; from += 16) {
      const batch = await Promise.all(ids.slice(from, from + 16).map(story));
      for (const item of batch) if (item) all.push(item);
    }
    return all
      .filter((item) => status === "all" || item.status === status)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  } catch {
    return null;
  }
}

/** Cambia el estado de una felicitación (aprobar / rechazar / devolver a pendiente). */
export async function adminSetReviewStatus(id: string, status: ReviewStatus): Promise<boolean> {
  if (!reviewsEnabled || !UUID.test(id)) return false;
  try {
    const record = await story(id);
    if (!record) return false;
    await write(`${STORIES}${id}.json`, JSON.stringify({ ...record, status }), "application/json");
    return true;
  } catch {
    return false;
  }
}

/** La foto de una felicitación (para el panel: la ruta pide la sesión del dueño). */
export async function adminReviewPhoto(id: string): Promise<Uint8Array | null> {
  if (!reviewsEnabled || !UUID.test(id)) return null;
  try {
    return await read(`${PHOTOS}${id}.jpg`);
  } catch {
    return null;
  }
}
