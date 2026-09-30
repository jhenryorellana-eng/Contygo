/* ============================================================
   LP — La estela de la estrella (firma visual, del logo)
   Doble trazo rojo + azul que se dibuja al cargar y termina en
   la estrella dorada. Animación en CSS (lpDraw / lpStarPop).
   ============================================================ */

export default function StarTrail() {
  return (
    <svg className="lp-trail" viewBox="0 0 520 420" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lpTrailBlue" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1b4fa0" stopOpacity="0" />
          <stop offset="45%" stopColor="#2563c4" stopOpacity=".85" />
          <stop offset="100%" stopColor="#1b4fa0" />
        </linearGradient>
        <linearGradient id="lpTrailRed" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d8201f" stopOpacity="0" />
          <stop offset="55%" stopColor="#d8201f" stopOpacity=".9" />
          <stop offset="100%" stopColor="#ef4d3c" />
        </linearGradient>
        <radialGradient id="lpStarGlow">
          <stop offset="0%" stopColor="#efc44d" stopOpacity=".55" />
          <stop offset="100%" stopColor="#efc44d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lpStarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#efc44d" />
          <stop offset="100%" stopColor="#c8901f" />
        </linearGradient>
      </defs>

      {/* resplandor de la estrella */}
      <circle className="lp-trail__glow" cx="452" cy="72" r="86" fill="url(#lpStarGlow)" />

      {/* estela: azul (ancha) + roja (fina), como el swoosh del logo */}
      <path
        className="lp-trail__path lp-trail__path--blue"
        pathLength={1}
        d="M 24 398 C 150 386 268 330 336 244 C 388 180 414 128 446 84"
      />
      <path
        className="lp-trail__path lp-trail__path--red"
        pathLength={1}
        d="M 40 374 C 158 356 262 302 326 222 C 374 162 402 122 436 86"
      />

      {/* estrellitas del camino */}
      <circle cx="150" cy="368" r="2.4" fill="#efc44d" opacity=".7" />
      <circle cx="292" cy="282" r="2" fill="#ffffff" opacity=".55" />
      <circle cx="384" cy="168" r="2.6" fill="#efc44d" opacity=".8" />

      {/* la estrella (5 puntas) */}
      <polygon
        className="lp-trail__star"
        fill="url(#lpStarFill)"
        stroke="#fff8e6"
        strokeWidth="2"
        strokeLinejoin="round"
        points="452,26 459.4,47.4 482,47.9 464,61.5 470.5,83.1 452,70.3 433.5,83.1 440,61.5 422,47.9 444.6,47.4"
      />
    </svg>
  );
}
