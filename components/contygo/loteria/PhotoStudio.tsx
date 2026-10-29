"use client";

/* «Arregla tu foto aquí» (28-10-2026). La foto es la causa número uno de descalificación en la Lotería de Visas: la
   persona sube o toma la suya, la encuadra en el cuadrado con la guía del óvalo y la página la deja como la pide el
   sitio oficial: 600 × 600 píxeles, JPEG y 240 KB como máximo. Todo ocurre en su celular: la foto no se envía a ningún
   servidor. El fondo y la nitidez se revisan aquí; lo que una máquina no puede saber (que sea reciente, sin lentes…)
   lo confirma la persona. El validador del sitio oficial sigue siendo la última palabra. */
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent } from "react";
import s from "./PhotoStudio.module.css";

const SIZE = 600, MAX_BYTES = 240 * 1024, MAX_ZOOM = 4;
const QUALITIES = [.92, .86, .8, .72, .64, .56, .48, .4];
const FILE_NAME = "foto-loteria-600x600.jpg";

type Source = { url: string; width: number; height: number };
type Result = { blob: Blob; url: string; bytes: number; light: boolean; sharp: boolean };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const encode = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));

/** Background: the top band and the upper sides of the crop, where a white wall should be. */
function lightBackground(ctx: CanvasRenderingContext2D) {
  const zones = [ctx.getImageData(0, 0, SIZE, 60), ctx.getImageData(0, 60, 54, 240), ctx.getImageData(SIZE - 54, 60, 54, 240)];
  let light = 0, saturation = 0, count = 0;
  for (const { data } of zones) for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i + 1], b = data[i + 2], max = Math.max(r, g, b), min = Math.min(r, g, b);
    light += (r + g + b) / 3; saturation += max ? (max - min) / max : 0; count++;
  }
  return light / count > 200 && saturation / count < .16;
}

function Icon({ name }: { name: "camera" | "image" | "lock" | "check" | "alert" | "download" | "share" | "reset" }) {
  const paths = {
    camera: <><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" /><circle cx="12" cy="12.5" r="3.4" /></>,
    image: <><rect x="4" y="5" width="16" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4.5 3 3 2.5-2.5L19 17" /></>,
    lock: <><rect x="5.5" y="10.5" width="13" height="9" rx="2.2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
    check: <path d="m5.5 12.5 4 4 9-9" />,
    alert: <><path d="M12 8v5" /><path d="M12 16.5h.01" /><path d="M10.3 4.6 3.4 17a2 2 0 0 0 1.7 3h13.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" /></>,
    download: <><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5" /><path d="M5 19.5h14" /></>,
    share: <><path d="M12 15V4m-4 4 4-4 4 4" /><path d="M6 11v7.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V11" /></>,
    reset: <><path d="M5 12a7 7 0 1 0 2.1-5" /><path d="M5 4.5V8h3.5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function PhotoStudio({ onReady }: { onReady?: () => void }) {
  const [source, setSource] = useState<Source | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [view, setView] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState({ recent: false, glasses: false, front: false });
  const [canShare, setCanShare] = useState(false);
  const decoded = useRef<HTMLImageElement | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const resultRef = useRef<Result | null>(null);

  // The square measures itself: the crop is computed in its own pixels.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setView(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  useEffect(() => () => { if (resultRef.current) URL.revokeObjectURL(resultRef.current.url); }, []);
  useEffect(() => {
    try { setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], FILE_NAME, { type: "image/jpeg" })] })); } catch { setCanShare(false); }
  }, []);

  const cover = source && view ? view / Math.min(source.width, source.height) : 1;
  const fit = useCallback((next: { x: number; y: number }, level: number) => {
    if (!source || !view) return next;
    const scale = cover * level, maxX = Math.max(0, (source.width * scale - view) / 2), maxY = Math.max(0, (source.height * scale - view) / 2);
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }, [source, view, cover]);
  const zoomTo = useCallback((level: number) => {
    const next = clamp(level, 1, MAX_ZOOM);
    setZoom(next); setOffset(current => fit(current, next));
  }, [fit]);

  // Desktop: the wheel zooms (a native listener, so the page does not scroll under the photo).
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => { event.preventDefault(); setZoom(current => { const next = clamp(current * Math.exp(-event.deltaY * .0015), 1, MAX_ZOOM); setOffset(o => fit(o, next)); return next; }); };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [source, fit]);

  // The finished photo, redone a moment after each change: 600 × 600, JPEG, as light as needed to stay under 240 KB.
  useEffect(() => {
    const image = decoded.current;
    if (!source || !view || !image) return;
    setWorking(true);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = cover * zoom, side = view / scale;
      const sx = source.width / 2 - (view / 2 + offset.x) / scale, sy = source.height / 2 - (view / 2 + offset.y) / scale;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, sx, sy, side, side, 0, 0, SIZE, SIZE);
      const light = lightBackground(ctx);
      let blob: Blob | null = null;
      for (const quality of QUALITIES) { blob = await encode(canvas, quality); if (!blob || blob.size <= MAX_BYTES) break; }
      if (cancelled || !blob) return;
      const next: Result = { blob, url: URL.createObjectURL(blob), bytes: blob.size, light, sharp: side >= SIZE * .8 };
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
      resultRef.current = next; setResult(next); setWorking(false);
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [source, view, zoom, offset, cover]);

  function load(file: File | undefined) {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) { setError("Elige una foto (JPG o PNG)."); return; }
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      decoded.current = probe;
      setSource({ url, width: probe.naturalWidth, height: probe.naturalHeight });
      setZoom(1); setOffset({ x: 0, y: 0 }); setError(""); setConfirmed({ recent: false, glasses: false, front: false });
    };
    probe.onerror = () => { URL.revokeObjectURL(url); setError("No pudimos abrir esa foto. Prueba con otra en JPG o PNG."); };
    probe.src = url;
  }
  const picked = (event: ChangeEvent<HTMLInputElement>) => { load(event.target.files?.[0]); event.target.value = ""; };
  function dropped(event: DragEvent) { event.preventDefault(); setDragging(false); load(event.dataTransfer.files?.[0]); }

  function down(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      zoomTo(pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance);
    } else if (pointers.current.size === 1) {
      setOffset(current => fit({ x: current.x + event.clientX - last.x, y: current.y + event.clientY - last.y }, zoom));
    }
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }
  function nudge(dx: number, dy: number) { setOffset(current => fit({ x: current.x + dx, y: current.y + dy }, zoom)); }

  function download() {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result.url; link.download = FILE_NAME;
    document.body.appendChild(link); link.click(); link.remove();
    onReady?.();
  }
  async function share() {
    if (!result) return;
    try { await navigator.share({ files: [new File([result.blob], FILE_NAME, { type: "image/jpeg" })], title: "Mi foto para la Lotería de Visas" }); onReady?.(); }
    catch { /* closed by the person */ }
  }

  const scale = cover * zoom;
  const kilobytes = result ? Math.max(1, Math.round(result.bytes / 1024)) : 0;
  const allConfirmed = confirmed.recent && confirmed.glasses && confirmed.front;

  if (!source) return <div className={s.drop} data-dragging={dragging} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropped}>
    <div className={s.dropArt} aria-hidden="true">
      <span className={s.ghost}><svg viewBox="0 0 120 120"><circle cx="60" cy="48" r="20" /><path d="M24 112c4-22 18-34 36-34s32 12 36 34" /></svg></span>
      <span className={s.corner} data-at="tl" /><span className={s.corner} data-at="tr" /><span className={s.corner} data-at="bl" /><span className={s.corner} data-at="br" />
    </div>
    <strong className={s.dropTitle}>Sube tu foto y la dejamos lista</strong>
    <p className={s.dropText}>La recortamos en cuadrado de 600 × 600, la pasamos a JPG y la dejamos en menos de 240 KB, como la pide el sitio oficial.</p>
    <div className={s.pick}>
      <label className={s.camera}><Icon name="camera" />Tomar una foto<input type="file" accept="image/*" capture="user" onChange={picked} /></label>
      <label className={s.gallery}><Icon name="image" />Elegir de mis fotos<input type="file" accept="image/*" onChange={picked} /></label>
    </div>
    <span className={s.desktopHint}>o arrastra tu foto aquí</span>
    {error && <p className={s.error} role="alert">{error}</p>}
    <p className={s.private}><Icon name="lock" />Tu foto no sale de tu celular: se arregla aquí mismo.</p>
  </div>;

  return <div className={s.studio}>
    <div className={s.editor}>
      <div ref={frame} className={s.frame} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        tabIndex={0} role="application" aria-label="Encuadre de tu foto. Arrastra para moverla; usa las flechas del teclado para moverla y la barra para acercarla."
        onKeyDown={event => { const step = event.shiftKey ? 24 : 8; if (event.key === "ArrowLeft") nudge(step, 0); else if (event.key === "ArrowRight") nudge(-step, 0); else if (event.key === "ArrowUp") nudge(0, step); else if (event.key === "ArrowDown") nudge(0, -step); else if (event.key === "+" || event.key === "=") zoomTo(zoom * 1.1); else if (event.key === "-") zoomTo(zoom / 1.1); else return; event.preventDefault(); }}>
        <img src={source.url} alt="Tu foto" draggable={false} style={{ width: source.width * scale, height: source.height * scale, transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)` }} />
        <svg className={s.guide} viewBox="0 0 600 600" aria-hidden="true">
          <defs><mask id="photo-oval"><rect width="600" height="600" fill="#fff" /><ellipse cx="300" cy="268" rx="132" ry="176" fill="#000" /></mask></defs>
          <rect width="600" height="600" fill="rgb(6 27 61 / 34%)" mask="url(#photo-oval)" />
          <ellipse cx="300" cy="268" rx="132" ry="176" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="10 9" />
          <path d="M150 226h300" stroke="#25D366" strokeWidth="2" strokeDasharray="4 8" opacity=".9" />
        </svg>
        <span className={s.guideLabel} data-at="eyes">ojos aquí</span>
        <span className={s.guideLabel} data-at="chin">mentón</span>
      </div>
      <div className={s.controls}>
        <button type="button" className={s.round} onClick={() => zoomTo(zoom / 1.15)} aria-label="Alejar">−</button>
        <input className={s.range} type="range" min={1} max={MAX_ZOOM} step={.01} value={zoom} onChange={event => zoomTo(Number(event.target.value))} aria-label="Acercar o alejar la foto" />
        <button type="button" className={s.round} onClick={() => zoomTo(zoom * 1.15)} aria-label="Acercar">+</button>
      </div>
      <p className={s.hint}>Arrastra la foto y acércala hasta que tu cara llene el óvalo, con los ojos sobre la línea verde.</p>
    </div>

    <div className={s.report} aria-live="polite">
      <div className={s.result}>
        <span className={s.thumb} data-working={working}>{result && <img src={result.url} alt="Así queda tu foto final, de 600 por 600 píxeles" />}</span>
        <div>
          <strong>Tu foto final</strong>
          <span>{result ? `600 × 600 px · JPG · ${kilobytes} KB` : "Preparándola…"}</span>
        </div>
      </div>
      <ul className={s.checks}>
        <li data-state="ok"><Icon name="check" />Cuadrada, de 600 × 600 píxeles</li>
        <li data-state="ok"><Icon name="check" />En formato JPG</li>
        <li data-state={result && result.bytes <= MAX_BYTES ? "ok" : "wait"}><Icon name="check" />{result ? `Pesa ${kilobytes} KB (máximo 240)` : "Calculando el peso…"}</li>
        <li data-state={!result ? "wait" : result.light ? "ok" : "warn"}><Icon name={result && !result.light ? "alert" : "check"} />{!result || result.light ? "Fondo claro" : "El fondo no parece blanco: tómate la foto frente a una pared blanca"}</li>
        <li data-state={!result ? "wait" : result.sharp ? "ok" : "warn"}><Icon name={result && !result.sharp ? "alert" : "check"} />{!result || result.sharp ? "Buena nitidez" : "Se ve poco nítida: aleja el zoom o usa una foto con más calidad"}</li>
      </ul>
      <fieldset className={s.confirm}>
        <legend>Confírmalo tú</legend>
        <label><input type="checkbox" checked={confirmed.recent} onChange={event => setConfirmed(c => ({ ...c, recent: event.target.checked }))} /><span>Me la tomé en los últimos 6 meses</span></label>
        <label><input type="checkbox" checked={confirmed.glasses} onChange={event => setConfirmed(c => ({ ...c, glasses: event.target.checked }))} /><span>Sin lentes, ni gorra, ni filtros</span></label>
        <label><input type="checkbox" checked={confirmed.front} onChange={event => setConfirmed(c => ({ ...c, front: event.target.checked }))} /><span>De frente, con los ojos abiertos y la boca cerrada</span></label>
      </fieldset>
      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={download} disabled={!result || working}><Icon name="download" />Descargar mi foto</button>
        {canShare && <button type="button" className={s.secondary} onClick={share} disabled={!result || working}><Icon name="share" />Guardar en el celular</button>}
        <label className={s.change}><Icon name="reset" />Cambiar foto<input type="file" accept="image/*" onChange={picked} /></label>
      </div>
      {!allConfirmed && <p className={s.note}>Marca las tres casillas: el sitio oficial descalifica fotos con lentes, filtros o de más de 6 meses.</p>}
      {error && <p className={s.error} role="alert">{error}</p>}
      <p className={s.private}><Icon name="lock" />Tu foto no sale de tu celular. Al subirla, el sitio oficial la revisa otra vez.</p>
    </div>
  </div>;
}
