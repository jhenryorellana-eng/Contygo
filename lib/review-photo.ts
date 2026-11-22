/* La foto de una felicitación, vista por el servidor (21-11-2026): cuánto puede pesar y cómo se le quitan los datos
   ocultos antes de guardarla. La reduce y la tapa quien la envía, en su teléfono (ShareStory); esto es la segunda
   comprobación, para lo que llegue sin pasar por el formulario. */
export const PHOTO_MAX = 1_500_000;

/** Un JPEG sin sus datos ocultos (EXIF con el lugar y la cámara, notas): se quitan los segmentos APP1…APP15 y COM
    que van antes de la imagen. `null` si no es un JPEG bien formado. */
export function cleanJpeg(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const keep: Uint8Array[] = [bytes.subarray(0, 2)];
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1];
    if (marker === 0xda) { keep.push(bytes.subarray(at)); break; } // la imagen empieza: el resto va tal cual
    const size = (bytes[at + 2] << 8) | bytes[at + 3];
    if (size < 2 || at + 2 + size > bytes.length) return null;
    const hidden = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!hidden) keep.push(bytes.subarray(at, at + 2 + size));
    at += 2 + size;
  }
  if (keep.length < 2) return null;
  const out = new Uint8Array(keep.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of keep) { out.set(part, offset); offset += part.length; }
  return out;
}
