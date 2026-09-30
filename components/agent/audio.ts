/* ============================================================
   Prime — utilidades de audio PCM para la Live API (navegador)
   Entrada: PCM 16-bit little-endian a 16 kHz · Salida: 24 kHz.
   ============================================================ */

export const INPUT_RATE = 16000;
export const OUTPUT_RATE = 24000;

/** Float32 [-1,1] → Int16 PCM. */
export function floatTo16BitPCM(input: Float32Array): Int16Array<ArrayBuffer> {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Int16 PCM → base64 (little-endian). */
export function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

/** base64 (PCM 16-bit LE) → Float32 [-1,1]. */
export function base64ToFloat32(b64: string): Float32Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i]! / 0x8000;
  return out;
}

/** Nivel RMS (0..1) de un bloque de audio, para la onda visual. */
export function rms(input: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) sum += input[i]! * input[i]!;
  return Math.min(1, Math.sqrt(sum / Math.max(1, input.length)) * 4);
}
