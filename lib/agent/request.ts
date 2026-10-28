/* ============================================================
   Lectura de las peticiones de la guía (SOLO servidor): el cuerpo JSON con tope de tamaño y el audio
   de una respuesta dicha. La comparten /api/agent/service-intake y /api/agent/service-doubt.
   ============================================================ */
import type { NextRequest } from "next/server";

export const MAX_TURN_BYTES = 8 * 1024 * 1024;
const AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", "audio/wav", "audio/mp3", "audio/mpeg", "audio/aac", "audio/flac"];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** The JSON body, read up to `limit` bytes: the value, or the error to answer with. */
export async function readTurnBody(req: NextRequest, limit = MAX_TURN_BYTES): Promise<{ body: unknown } | { error: "too_large" | "bad_json"; status: 413 | 400 }> {
  if (Number(req.headers.get("content-length")) > limit) return { error: "too_large", status: 413 };
  const reader = req.body?.getReader(); if (!reader) return { error: "bad_json", status: 400 };
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); return { error: "too_large", status: 413 }; } chunks.push(value); }
    return { body: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch { return { error: "bad_json", status: 400 }; } finally { reader.releaseLock(); }
}

/** A recorded answer: base64 of a known audio type, at most 5 MB. Null when it is not valid. */
export function readTurnAudio(value: unknown): { data: string; mimeType: string } | null {
  if (!record(value) || typeof value.data !== "string" || typeof value.mimeType !== "string" || value.data.length > 7 * 1024 * 1024 || value.data.length % 4 !== 0 || !value.data.length || !/^[A-Za-z0-9+/]*={0,2}$/.test(value.data)) return null;
  const mime = value.mimeType.toLowerCase().split(";")[0];
  const bytes = Buffer.from(value.data, "base64");
  if (!AUDIO_TYPES.includes(mime) || bytes.length > 5 * 1024 * 1024 || bytes.toString("base64") !== value.data) return null;
  return { data: value.data, mimeType: mime === "audio/mp4" ? "audio/m4a" : mime };
}
