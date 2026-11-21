/* El sonido de la marca (21-11-2026). El dueño compuso un sonido («sonido para landing.wav», casi 4 segundos: una
   subida de notas y un acorde que se apaga), como el arranque de una Mac, y pidió ponerlo en la landing.
   Suena entero y en un solo lugar: al tocar «Empezar mi ruta» (quien lleva data-sound). Se probó repartido (su acorde
   final, corto, al abrir cada servicio y al entrar al Club o a la agenda de Henry) y solo su subida de notas, sin el
   final: probado, «no tiene sentido»; eligió volver al sonido completo, solo ahí.
   Reglas: solo responde a un toque de la persona, nunca suena solo; va bajo; si se toca otra vez mientras suena,
   vuelve a empezar en vez de montarse; se puede silenciar, y el silencio se recuerda. Se reproduce con Web Audio, que
   en el iPhone respeta el interruptor de silencio. Si el archivo no llega a tiempo (medio segundo), ese toque no
   suena: un sonido tarde confunde más que uno que falta. */
/* As AAC (light), and as plain WAV for the few browsers that cannot decode AAC. */
const FILES = ["/contygo/audio/marca.m4a", "/contygo/audio/marca.wav"] as const;
const GAIN = .5, KEY = "contygo-sound";

let context: AudioContext | null = null, ready: Promise<AudioBuffer | null> | null = null, playing: AudioBufferSourceNode | null = null;
const heard = new Set<() => void>();

export const soundMuted = () => { try { return localStorage.getItem(KEY) === "off"; } catch { return false; } };
export function setSoundMuted(off: boolean) {
  try { if (off) localStorage.setItem(KEY, "off"); else localStorage.removeItem(KEY); } catch { /* Private mode: it lasts for this visit. */ }
  if (off) void context?.suspend(); else void context?.resume();
}
/** Tells when a sound has actually played (the page shows, the first time, how to silence it). */
export function onSoundHeard(listener: () => void) { heard.add(listener); return () => { heard.delete(listener); }; }

function load() {
  if (!context) return null;
  if (!ready) {
    const ctx = context, read = (file: string) => fetch(file).then(response => response.arrayBuffer()).then(data => ctx.decodeAudioData(data));
    ready = read(FILES[0]).catch(() => read(FILES[1])).catch(() => null);
  }
  return ready;
}

/** On the person's first touch of the page: the sounds get ready, so the first one is not late. */
export function warmSound() {
  if (typeof window === "undefined" || soundMuted()) return;
  if (!context) {
    const Engine = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Engine) return;
    try { context = new Engine(); } catch { return; }
  }
  void load();
}

/** From a tap. */
export function playSound() {
  if (soundMuted()) return;
  warmSound();
  const ctx = context;
  if (!ctx) return;
  const asked = performance.now();
  void ctx.resume();
  void load()?.then(buffer => {
    if (!buffer || soundMuted() || performance.now() - asked > 500) return;
    try { playing?.stop(); } catch { /* It had already ended. */ }
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer; gain.gain.value = GAIN;
    source.connect(gain); gain.connect(ctx.destination); source.start();
    playing = source;
    heard.forEach(listener => listener());
  });
}
