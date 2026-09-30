/* ============================================================
   Tipado global de la función `fbq` del Meta Pixel.
   Recogido automáticamente por el include de TypeScript en tsconfig.
   ============================================================ */
export {};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}
