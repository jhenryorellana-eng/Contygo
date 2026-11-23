"use client";

/* El viaje del contrato (23-11-2026, cuarta versión de la escena de «Haz tu contrato tú mismo»). Tres intentos
   anteriores no gustaron (una conversación de ejemplo; una historia dibujada en un teléfono: «demora mucho»; las
   pantallas reales en un teléfono: «feo… sin creatividad, nada sorprendente»; las dos últimas, en stashes). Se le
   preguntó al dueño por el estilo, entre los que ya había aprobado en esta página, y eligió «Escena 3D de plastilina»:
   un mundo en miniatura donde el contrato viaja por la cinta verde y pasa por cinco estaciones hasta quedar firmado.
   - Cinco escenas de plastilina hechas con Codex en el estilo de las de los servicios (public/contygo/v8/viaje): el
     mismo muñeco toca un teléfono gigante, responde, mira cómo se llena su contrato, confirma su código y firma.
   - Se recorre de lado con el scroll, como los tramos y los productos: la sección se queda quieta y el dedo lleva el
     viaje de una estación a la siguiente. Cada escena llega girando un poco y creciendo; su número, enorme, pasa por
     detrás más despacio; su palabra entra desde el lado; un camino punteado une cada base con la siguiente.
   - Sin quedarse quieta (pantalla muy baja o «reducir movimiento»): las cinco estaciones se pasan con el dedo, de lado.
   El botón «Empezar mi contrato» está siempre a la vista, al pie.
   Segunda vuelta, el mismo día. El dueño: «está bien esa referencia, pero me gustaría que el proceso resalte la
   compañía de un agente especializado… que en la pantalla se vea lo que realmente pasa, así mezclamos ambos; además
   añade mejores efectos de transición, que parezca real». Entonces:
   - En cada escena la persona va con su asistente (un muñeco verde con auriculares, a su lado) y hay un teléfono
     gigante de frente. Las frases lo nombran.
   - En la pantalla de ese teléfono van las PANTALLAS REALES del asistente (las capturas de la versión anterior,
     public/contygo/v8/proceso), colocadas sobre el hueco de la pantalla (`screen`: su caja, en centésimas de la
     imagen; la halla docs/viaje-originales/viajeframes.cjs). Al llegar a una estación la cámara se acerca al teléfono
     hasta que la pantalla se lee, y ahí pasan sus dos o tres momentos, con el toque marcado; al seguir, se aleja.
   - El paso de una estación a otra es en profundidad: cada escena gira sobre su eje, se aleja y se desenfoca al irse.
   Tercera vuelta. El dueño: «se nota un poco sobreexpuesto, podrías mejorarlo mucho más, perfeccionarlo; además la
   versión escritorio tampoco me convenció». La luz: las pantallas reales (blancas) quemaban contra la plastilina;
   ahora van un punto más bajas, con su cristal y su sombra interior, y solo suben al acercarse la cámara; la escena
   lleva un foco en el suelo y una viñeta que la recoge, y polvo de plastilina a tres profundidades. Escritorio: el
   mundo ocupa todo el ancho (ya no es una tarjeta junto al titular): la escena grande a un lado y, al otro, el
   número, la palabra enorme y su frase.
   Cuarta vuelta, con una captura suya del primer plano: «la pantalla está mal cuadrada… y se ve despixelada». Dos
   causas. La pantalla real iba en una caja con esquinas más cerradas que las del teléfono de plastilina, y la captura
   traía en sus esquinas un trozo de la página: ahora la caja lleva el radio medido de cada pantalla y las capturas
   son rectángulos limpios (pantallas.cjs). Y la escena se dibujaba pequeña y se AMPLIABA al acercarse la cámara
   (borroso, sobre todo en Safari, y más con filtros encima): ahora se dibuja al tamaño del primer plano y se ENCOGE
   para verse entera, como el teléfono de «Tu expediente»; nada se estira nunca, y no hay filtros sobre lo que se
   acerca (el tono va en las propias imágenes). Imágenes a más resolución (escenas 1254 px, pantallas 780 px).
   Quinta vuelta: «en la versión mobile está realmente mal el gráfico… revísalo y ve tus errores». Lo había revisado
   en un Chrome que simula un celular, no en el Safari de un iPhone, con su alto real (390×664). Ahí: la escena
   quedaba en 242 px (el botón y las frases se comían el alto), el primer plano enseñaba la pantalla entera a 130 px de
   ancho (ilegible), los muñecos se cortaban contra un borde duro y el tamaño saltaba de una estación a otra (una
   frase de dos líneas). Ahora, en el celular: el botón de dentro se va (el del pie de la página dice lo mismo y está
   debajo), las frases ocupan siempre el mismo alto, la escena llega de lado a lado y se desvanece en sus cuatro bordes,
   y en el primer plano la pantalla llena el ancho y LA CÁMARA SIGUE AL DEDO: baja o sube hasta donde se toca, que es
   lo que hay que leer (`geo`: cuánto se acerca y cuánto de la pantalla cabe, medido en cada aparato).
   Sexta vuelta: fluidez. «En el celular se me pone un poco lento… que sea súper fluido, sin cambiar los efectos y el
   diseño.» Medido: el trabajo por cuadro era poco, pero el navegador sostenía las cinco escenas a tamaño de primer
   plano a la vez (unos 290 MB de capas en una pantalla de tres píxeles por punto) y, al acercarse la cámara, repintaba
   la escena entera en cada cuadro (un velo y un camino cuya opacidad dependía del scroll). Ahora: solo existen la
   escena en la que se está y su vecina (las demás, ocultas: sin capa); el tamaño al que se dibuja tiene un tope en
   píxeles reales (`lay`); nada dentro de la escena cambia de pintura con el scroll (lo que cambiaba, cambia por
   estado, con su transición); el desenfoque de lejos es fijo; y cada cuadro solo escribe lo que cambió. Las imágenes
   de la estación siguiente se piden antes de llegar. Lo que se ve es lo mismo. */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { openAssistant } from "./assistantBus";
import j from "./ContractJourney.module.css";

/* `screen`: where the phone's screen is in the picture (x, y, width, height, in hundredths) and how round its corners
   are (hundredths of its width and of its height). `shots`: the real screens
   shown on it, each with where the person taps (shares of the screen). */
const STOPS = [
  { art: "tocas", word: "Tocas", rest: "tu trámite.", text: "Tu asistente te recibe y empieza por lo que necesitas.", screen: [59.09,13.88,27.03,47.29,13.6,7.8], shots: [["p1", 43, 67], ["p2", 55, 56]] },
  { art: "respondes", word: "Respondes", rest: "con un toque.", text: "Te pregunta lo justo para ver si calificas.", screen: [35.89,18.58,27.51,47.77,13.4,7.7], shots: [["p3", 34, 80], ["p4", 52, 72]] },
  { art: "llena", word: "Se llena", rest: "tu contrato.", text: "Tu asistente lo arma contigo, dato por dato.", screen: [3.59,17.46,22.41,42.66,12.8,6.7], shots: [["p5", 55, 70], ["p6", 46, 81], ["p7", 65, 81]] },
  { art: "confirmas", word: "Confirmas", rest: "tu código.", text: "Te llega a tu correo: así sabemos que eres tú.", screen: [61.96,14.35,27.51,46.65,10.6,6.3], shots: [["p8", 68, 70]] },
  { art: "firmas", word: "Firmas", rest: "y listo.", text: "Desde tu celular, con tu asistente a tu lado.", screen: [9.25,12.36,27.35,48.09,13.9,7.9], shots: [["p9", 43, 47]] },
] as const;
/* How long each real screen stays while the camera is on the phone. */
const SHOT_MS = 1500;
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;

export default function ContractJourney() {
  const [at, setAt] = useState(0), [close, setClose] = useState(false), [shot, setShot] = useState(0);
  /* For each station, on this screen: how much the camera goes in (`zf`) and what share of the phone's screen fits in
     the window then (`vis`: 1, the whole screen; less, the camera follows the tap). */
  const [geo, setGeo] = useState<{ zf: number; vis: number; lay: number }[]>([]);
  const run = useRef<HTMLDivElement>(null), pin = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null);
  const jump = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    const runEl = run.current, pinEl = pin.current, trackEl = track.current;
    if (!runEl || !pinEl || !trackEl) return;
    const header = document.querySelector<HTMLElement>("header"), stops = Array.from(trackEl.querySelectorAll<HTMLElement>("[data-stop]"));
    let fixed = false, pinTop = 70, range = 0, frame = 0, last = -1, wasNear = false;
    /* Where the journey is. The scroll is cut into five stretches, one per station, and each stretch goes: the scene
       whole (the person and their assistant) → the camera goes in to the phone → the real screens, held → the camera
       comes out → the road to the next station. So the first thing seen is the world, not a screen. */
    // (Each frame writes only what changed.)
    const written = new WeakMap<HTMLElement, Record<string, string>>();
    const put = (el: HTMLElement, name: string, value: string) => { let seen = written.get(el); if (!seen) written.set(el, seen = {}); if (seen[name] !== value) { seen[name] = value; el.style.setProperty(name, value); } };
    const paint = () => {
      frame = 0;
      let along: number, zoom = 0, here = 0;
      if (fixed && range > 0) {
        const s = clamp((pinTop - runEl.getBoundingClientRect().top) / range) * STOPS.length, k = Math.min(STOPS.length - 1, Math.floor(s)), t = s - k;
        here = k;
        zoom = t < .35 ? ease(clamp((t - .14) / .21)) : t < .64 ? 1 : 1 - ease(clamp((t - .64) / .16));
        along = k + (k < STOPS.length - 1 ? ease(clamp((t - .8) / .2)) : 0);
      } else along = trackEl.scrollLeft / Math.max(1, trackEl.clientWidth);
      put(trackEl, "--along", along.toFixed(3));
      stops.forEach((stop, index) => {
        const d = fixed ? clamp(along - index, -1.2, 1.2) : 0, away = fixed && Math.abs(d) > .985, z = index === here ? zoom : 0;
        // A station that is neither this one nor its neighbour is not drawn at all (no layer of its own).
        if (stop.hasAttribute("data-away") !== away) stop.toggleAttribute("data-away", away);
        if (away) return;
        put(stop, "--d", d.toFixed(3)); put(stop, "--z", z.toFixed(3));
        if (stop.hasAttribute("data-far") !== Math.abs(d) > .25) stop.toggleAttribute("data-far", Math.abs(d) > .25);
        if (stop.hasAttribute("data-near") !== z > .15) stop.toggleAttribute("data-near", z > .15);
      });
      const now = clamp(Math.round(along), 0, STOPS.length - 1), near = zoom > .55;
      if (now !== last) { last = now; setAt(now); setShot(0); }
      if (near !== wasNear) { wasNear = near; setClose(near); }
    };
    const measure = () => {
      fixed = getComputedStyle(pinEl).position === "sticky";
      pinTop = (header ? header.offsetHeight : 64) + 8;
      pinEl.style.setProperty("--pin-top", `${pinTop}px`);
      range = runEl.offsetHeight - pinEl.offsetHeight;
      trackEl.toggleAttribute("data-driven", fixed);
      // The close-up, for this window. If the whole screen fits at a size that can be read, it shows whole; if not
      // (a phone), the screen takes the window's width and the camera follows the tap.
      const view = trackEl.querySelector<HTMLElement>("[data-view]");
      if (view && view.clientWidth) {
        const vw = view.clientWidth, vh = view.clientHeight, cap = parseFloat(getComputedStyle(view).getPropertyValue("--cap")) || 430, base = Math.min(vh, .94 * vw, cap);
        // `lay`: the size the scene is laid out at, as a multiple of what fits. It is the close-up's size, up to a
        // limit in real pixels (a layer of 3600 px a side, on a sharp phone, is slow and heavy for nothing).
        const most = 2800 / (base * Math.min(3, window.devicePixelRatio || 1));
        const next = STOPS.map(stop => {
          const [, , w, h] = stop.screen, whole = Math.min(62 / w, 94 / h);
          if (w / 100 * base * whole >= 230) return { zf: +whole.toFixed(3), vis: 1, lay: +Math.min(whole, most).toFixed(3) };
          const zf = Math.min(4, .74 * vw / (w / 100 * base)); // (the clay phone keeps its frame in view)
          return { zf: +zf.toFixed(3), vis: +clamp(vh / (h / 100 * base * zf)).toFixed(3), lay: +Math.min(zf, most).toFixed(3) };
        });
        setGeo(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
      }
      if (fixed) trackEl.scrollLeft = 0;
      paint();
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    jump.current = index => {
      // (To the middle of its stretch: the camera on its phone.)
      if (fixed && range > 0) window.scrollTo({ top: runEl.getBoundingClientRect().top + window.scrollY - pinTop + (index + .5) / STOPS.length * range, behavior: "smooth" });
      else trackEl.scrollTo({ left: index * trackEl.clientWidth, behavior: "smooth" });
    };
    const sizes = new ResizeObserver(measure);
    sizes.observe(runEl); sizes.observe(pinEl);
    addEventListener("scroll", onScroll, { passive: true });
    trackEl.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => { sizes.disconnect(); removeEventListener("scroll", onScroll); trackEl.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  // With the camera on the phone, its real screens pass one after another (and start again).
  const shots = STOPS[at].shots.length;
  useEffect(() => {
    if (!close || shots < 2) return;
    const timer = window.setTimeout(() => setShot(value => (value + 1) % shots), SHOT_MS);
    return () => window.clearTimeout(timer);
  }, [close, shots, shot, at]);

  return <div ref={run} className={j.run}>
    <div ref={pin} className={j.pin}>
      <div className={j.world} role="group" aria-label="Tu contrato, en cinco pasos">
        <div className={j.head}>
          <span>Con tu asistente</span>
          <ol className={j.dots}>{STOPS.map((stop, index) => <li key={stop.art}><button type="button" data-state={index < at ? "done" : index === at ? "now" : "next"} onClick={() => jump.current(index)} aria-label={`Paso ${index + 1}: ${stop.word} ${stop.rest}`} aria-current={index === at ? "step" : undefined}>{index + 1}</button></li>)}</ol>
        </div>

        <div ref={track} className={j.track}>
          {/* Dust of the clay world, at three depths: it drifts as the journey goes (more depth in the travel). */}
          <span className={j.motes} aria-hidden="true">{[[8, 22, .5, 10], [26, 70, 1.3, 16], [44, 14, .8, 8], [63, 58, 1.6, 20], [81, 30, .6, 12], [92, 76, 1.1, 9], [36, 86, 1.9, 24]].map(([x, y, speed, size], k) => <i key={k} data-kind={k % 3} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, "--speed": speed } as CSSProperties} />)}</span>
          {STOPS.map((stop, index) => { const [x, y, w, h, rx, ry] = stop.screen, on = index === at, { zf: zoom, vis, lay } = geo[index] ?? { zf: Math.min(62 / w, 94 / h), vis: 1, lay: Math.min(62 / w, 94 / h) };
            // The camera follows the tap: with the window on the phone, the scene moves so that where the person taps is in view.
            const tapY = stop.shots[Math.min(on ? shot : 0, stop.shots.length - 1)][2] / 100, centre = clamp(tapY, vis / 2, 1 - vis / 2), pan = on && close && vis < 1 ? h * (.5 - centre) : 0;
            return <section key={stop.art} className={j.stop} data-stop data-on={on || undefined} aria-label={`Paso ${index + 1}: ${stop.word} ${stop.rest} ${stop.text}`}>
            <span className={j.number} aria-hidden="true">{index + 1}</span>
            <div className={j.view} data-view aria-hidden="true">
              {/* The scene. The camera goes in to its phone (its screen's centre, --ox/--oy; how much, --zf). */}
              <span className={j.scene} style={{ "--ox": `${x + w / 2}%`, "--oy": `${y + h / 2}%`, "--zf": zoom.toFixed(3), "--lay": lay.toFixed(3), "--pan": pan.toFixed(2) } as CSSProperties}><span className={j.inner}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={j.art} src={`/contygo/v8/viaje/${stop.art}.webp`} alt="" width={1254} height={1254} loading={index <= at + 1 ? "eager" : "lazy"} decoding="async" draggable={false} />
                {/* On the phone, what really happens: the assistant's own screens (a hair over the box, so its edge is clean). */}
                <span className={j.screen} style={{ left: `${x - .3}%`, top: `${y - .3}%`, width: `${w + .6}%`, height: `${h + .6}%`, borderRadius: `${rx}% / ${ry}%` }}>
                  <i className={j.glass} />
                  {stop.shots.map(([file, tx, ty], k) => { const showing = on ? k === Math.min(shot, stop.shots.length - 1) : k === 0; return <span key={file} className={j.shot} data-on={showing || undefined} style={{ "--tx": `${tx}%`, "--ty": `${ty}%` } as CSSProperties}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/contygo/v8/proceso/${file}.webp`} alt="" width={780} height={1404} loading={index <= at + 1 ? "eager" : "lazy"} decoding="async" draggable={false} />
                    {showing && on && close && <i key={`${at}-${shot}`} className={j.tap} />}
                  </span>; })}
                </span>
              </span></span>
            </div>
            <p className={j.copy}><strong>{stop.word} <em>{stop.rest}</em></strong><span>{stop.text}</span></p>
          </section>; })}
        </div>

        <div className={j.foot}>
          <button type="button" className={j.go} data-ready={at === STOPS.length - 1 || undefined} onClick={() => openAssistant()}><span>Empezar mi contrato</span><i aria-hidden="true"><Arrow /></i></button>
          <small>{at < STOPS.length - 1 ? "Sigue bajando para ver el viaje" : "Pantallas reales, con datos de ejemplo"}</small>
        </div>
      </div>
    </div>
  </div>;
}
