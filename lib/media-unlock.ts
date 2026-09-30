/* ============================================================
   Desbloqueo de audio para el video del servicio (solo navegador)
   iOS/Android solo permiten reproducir CON sonido si play() ocurre
   dentro de un gesto del usuario. Al tocar una tarjeta de servicio
   creamos el <video> y lo ponemos a reproducir en ese mismo gesto;
   la página del servicio reutiliza ese elemento ya "autorizado".
   ============================================================ */

const pool = new Map<string, { el: HTMLVideoElement; at: number }>();
const TTL_MS = 90_000;

/** Llamar DENTRO de un onClick/onTouch: prepara el video con permiso de sonido. */
export function unlockVideo(src: string): void {
  if (typeof window === "undefined" || !src) return;
  try {
    const prev = pool.get(src);
    if (prev) {
      prev.el.remove();
      pool.delete(src);
    }
    const el = document.createElement("video");
    el.src = src;
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.preload = "auto";
    el.muted = false;
    el.dataset.unlocked = "1";
    // Oculto pero en el DOM (algunos navegadores lo exigen para reproducir).
    el.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px;";
    document.body.appendChild(el);
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        // Si la página del servicio ya lo tomó, no lo interrumpimos.
        if (el.dataset.claimed === "1") return;
        el.pause();
        try {
          el.currentTime = 0;
        } catch {
          /* aún no se puede buscar; se reinicia al activarse */
        }
      }).catch(() => {
        /* sin permiso: la página del servicio hará el fallback habitual */
      });
    }
    pool.set(src, { el, at: Date.now() });
  } catch {
    /* nada: comportamiento normal */
  }
}

/** Devuelve el elemento desbloqueado para ese src (si existe y no caducó). */
export function takeUnlockedVideo(src: string): HTMLVideoElement | null {
  const e = pool.get(src);
  if (!e) return null;
  if (Date.now() - e.at > TTL_MS) {
    e.el.remove();
    pool.delete(src);
    return null;
  }
  return e.el;
}
