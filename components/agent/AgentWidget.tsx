"use client";

/* ============================================================
   Prime — widget del asesor virtual (lanzador + panel)
   Móvil: pantalla completa · Escritorio: tarjeta flotante.
   Modo ESCRIBIR: chat inmersivo con revelado palabra a palabra
   (StreamText), aurora de fondo, detener/reintentar, scroll que
   sigue la escritura. Modo LLAMAR: CallView (orbe de voz).
   Se muestra en /califica; la portada de contratación tiene ayuda contextual.
   ============================================================ */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { waRoute } from "@/lib/wa-route";
import { getServiceBySlug } from "@/lib/services";
import { trackBrowser } from "@/lib/meta/pixel-client";
import { Ico } from "../icons";
import ServiceLink from "../ServiceLink";
import CallView from "./CallView";

interface Msg {
  id: string;
  role: "user" | "model";
  text: string;
  error?: boolean;
  /** true mientras la respuesta sigue llegando del servidor */
  streaming?: boolean;
}

const GREETING =
  "Hola, soy Prime, el asistente automático de USA Latino Prime. No soy abogado ni doy asesoría legal: te oriento y te llevo al trámite que te corresponde. ¿En qué te ayudo?";
const QUICK = ["¿Califico para asilo?", "¿Cuánto cuesta?", "Visa Juvenil", "Hablar con una persona"];
const FALLBACK =
  "Estoy terminando de configurarme y todavía no puedo responder aquí. Escríbenos por WhatsApp y una persona del equipo te ayuda ahora mismo. {{whatsapp}}";
const ERROR_TEXT = "Se me cortó la conexión un momento. Inténtalo de nuevo o escríbenos por WhatsApp. {{whatsapp}}";
const STORAGE = "pa_msgs_v1";
const SHOW_ON = new Set(["/califica"]);

const MicIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const StopIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
);

let seq = 0;
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

/* ------------------------------------------------------------
   Render enriquecido: palabras animables, negritas, saltos y
   marcadores {{svc:slug}} / {{whatsapp}}.
   Las claves de cada palabra son deterministas desde el inicio del
   texto, así al ir revelando solo se montan (y animan) las nuevas.
   ------------------------------------------------------------ */
function renderRich(text: string, onWa: () => void): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\{\{svc:([a-z0-9-]+)\}\}|\{\{whatsapp\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  let wc = 0; // contador global de palabras (claves estables)

  const words = (s: string, prefix: string): ReactNode[] =>
    s.split(/(\s+)/).map((tok) => {
      if (tok === "") return null;
      if (/^\s+$/.test(tok)) return " ";
      const key = `${prefix}${wc++}`;
      return (
        <span key={key} className="pa-w">
          {tok}
        </span>
      );
    });

  const pushText = (chunk: string) => {
    if (!chunk.trim()) return;
    const lines = chunk.split("\n").filter((l, i, arr) => !(l.trim() === "" && (i === 0 || i === arr.length - 1)));
    lines.forEach((line, li) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, pi) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={`b${k}-${li}-${pi}`}>{words(p.slice(2, -2), "w")}</strong>
        ) : (
          words(p, "w")
        ),
      );
      out.push(
        <span key={`l${k}-${li}`} className="pa-line">
          {parts}
        </span>,
      );
    });
    k++;
  };

  while ((m = re.exec(text)) !== null) {
    pushText(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1]) {
      const svc = getServiceBySlug(m[1]);
      if (svc) {
        out.push(
          <ServiceLink key={`s${k++}`} href={`/${svc.slug}`} video={svc.video} className="pa-card pa-pop">
            <span className="pa-card__t">
              <span className="pa-card__name">{svc.name}</span>
              <span className="pa-card__sub">Ver su guía en vídeo</span>
            </span>
            {Ico.arrow}
          </ServiceLink>,
        );
      }
    } else {
      out.push(
        <a
          key={`w${k++}`}
          className="pa-btn pa-btn--wa pa-btn--inline pa-pop"
          href={waRoute({ kind: "prime_chat", message: "Hola, vengo del chat de Prime y quiero hablar con una persona sobre mi trámite." })}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWa}
        >
          {Ico.whatsapp} Hablar con una persona
        </a>,
      );
    }
  }
  pushText(text.slice(last));
  return out;
}

/** Corta el texto parcial sin dejar negritas ni marcadores a medias. */
function safeCut(full: string, n: number): string {
  let s = full.slice(0, n);
  const bolds = (s.match(/\*\*/g) ?? []).length;
  if (bolds % 2 === 1) s = s.slice(0, s.lastIndexOf("**"));
  const open = s.lastIndexOf("{{");
  if (open !== -1 && s.indexOf("}}", open) === -1) s = s.slice(0, open);
  return s;
}

/* ------------------------------------------------------------
   StreamText: revela el texto a ritmo constante aunque llegue a
   trompicones. Cuanto más texto pendiente, más rápido (nunca se
   queda atrás más de un par de segundos). Con reduced-motion se
   muestra directo.
   ------------------------------------------------------------ */
function StreamText({
  text,
  streaming,
  animate,
  onWa,
}: {
  text: string;
  streaming: boolean;
  animate: boolean;
  onWa: () => void;
}) {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (!animate) {
      setShown(text.length);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const backlog = text.length - shownRef.current;
      if (backlog > 0) {
        const rate = Math.min(520, 55 + backlog * 3.2); // caracteres por segundo
        const next = Math.min(text.length, shownRef.current + Math.max(1, Math.round(rate * dt)));
        shownRef.current = next;
        setShown(next);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, animate]);

  const partial = shown >= text.length ? text : safeCut(text, shown);
  const revealing = streaming || shown < text.length;
  return (
    <>
      {renderRich(partial, onWa)}
      {revealing && <span className="pa-caret" aria-hidden="true" />}
    </>
  );
}

export default function AgentWidget({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "call">("chat");
  const [msgs, setMsgs] = useState<Msg[]>([{ id: "g", role: "model", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trackedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  /** ids de mensajes creados en esta sesión (se animan); los restaurados no */
  const liveIds = useRef<Set<string>>(new Set());

  // Restaura la conversación de la sesión.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE);
      if (raw) {
        const saved = JSON.parse(raw) as Msg[];
        if (Array.isArray(saved) && saved.length > 0) {
          setMsgs(saved.map((m) => ({ ...m, streaming: false })));
        }
      }
    } catch {
      /* sin storage */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(msgs.slice(-40)));
    } catch {
      /* sin storage */
    }
  }, [msgs]);

  // El flujo sigue la escritura: cualquier cambio en el contenido hace scroll
  // al final si el usuario ya estaba abajo (si subió a leer, no se le molesta).
  useEffect(() => {
    if (!open || view !== "chat") return;
    const el = listRef.current;
    if (!el) return;
    const follow = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      if (near) el.scrollTop = el.scrollHeight;
    };
    el.scrollTop = el.scrollHeight;
    const mo = new MutationObserver(follow);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [open, view]);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  // Foco automático solo con teclado físico (en móvil abriría el teclado al instante).
  useEffect(() => {
    if (open && view === "chat" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, [open, view]);

  // Al navegar a una página donde el widget no se muestra (p. ej. tocar la
  // tarjeta de un servicio), el panel se cierra de verdad para que el fondo
  // se descongele; si no, la página nueva quedaba en blanco dentro de un
  // body fijo y desplazado.
  useEffect(() => {
    if (open && (!pathname || !SHOW_ON.has(pathname))) setOpen(false);
  }, [pathname, open]);

  // Esc cierra. Bloqueo del scroll de fondo a prueba de iOS: el body se fija
  // conservando la posición, y se restaura al cerrar.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", h);
    const y = window.scrollY;
    const lockedPath = window.location.pathname;
    const b = document.body.style;
    const prev = { position: b.position, top: b.top, left: b.left, right: b.right, width: b.width };
    b.position = "fixed";
    b.top = `-${y}px`;
    b.left = "0";
    b.right = "0";
    b.width = "100%";
    document.documentElement.classList.add("pa-lock");
    return () => {
      window.removeEventListener("keydown", h);
      b.position = prev.position;
      b.top = prev.top;
      b.left = prev.left;
      b.right = prev.right;
      b.width = prev.width;
      document.documentElement.classList.remove("pa-lock");
      // Misma página: vuelve a donde estaba. Página nueva: arriba del todo.
      window.scrollTo(0, window.location.pathname === lockedPath ? y : 0);
    };
  }, [open]);

  // Teclado en móvil: no se mide nada por JS (provocaba huecos y saltos).
  const keepBottom = useCallback(() => {
    setTimeout(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 300);
  }, []);
  const onInputBlur = useCallback(() => {
    setTimeout(() => window.scrollTo(0, 0), 60);
  }, []);

  const onWa = useCallback(() => trackBrowser("Contact"), []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      if (!trackedRef.current) {
        trackedRef.current = true;
        trackBrowser("AgentChat", { content_name: "prime" });
      }
      try {
        navigator.vibrate?.(8);
      } catch {
        /* sin háptica */
      }
      setInput("");
      const userMsg: Msg = { id: uid(), role: "user", text };
      const modelId = uid();
      liveIds.current.add(userMsg.id);
      liveIds.current.add(modelId);
      const history = [...msgs, userMsg];
      setMsgs([...history, { id: modelId, role: "model", text: "", streaming: true }]);
      setBusy(true);

      const patch = (t: string, extra: Partial<Msg> = {}) =>
        setMsgs((cur) => cur.map((m) => (m.id === modelId ? { ...m, text: t, ...extra } : m)));

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let acc = "";
      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            messages: history
              .filter((m) => m.id !== "g" && !m.error && m.text.trim())
              .map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        if (res.status === 503) {
          patch(FALLBACK, { streaming: false });
          return;
        }
        if (!res.ok || !res.body) {
          patch(ERROR_TEXT, { streaming: false, error: true });
          return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (acc.includes("[[error]]")) {
            patch(acc.replace("[[error]]", "").trim() || ERROR_TEXT, { streaming: false, error: true });
            return;
          }
          patch(acc, { streaming: true });
        }
        if (!acc.trim()) patch(ERROR_TEXT, { streaming: false, error: true });
        else patch(acc, { streaming: false });
      } catch (err) {
        if ((err as { name?: string } | null)?.name === "AbortError") {
          // Detenido por el usuario: se conserva lo recibido.
          patch(acc.trim() || "Detenido.", { streaming: false });
        } else {
          patch(ERROR_TEXT, { streaming: false, error: true });
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, msgs],
  );

  function stop() {
    abortRef.current?.abort();
  }

  function quick(q: string) {
    if (q === "Hablar con una persona") {
      onWa();
      window.open(waRoute({ kind: "prime_chat", message: "Hola, quiero hablar con una persona sobre mi trámite." }), "_blank", "noopener");
      return;
    }
    void send(q);
  }

  function retry() {
    // Reenvía la última pregunta del usuario quitando el mensaje de error.
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMsgs((cur) => cur.filter((m) => !(m.role === "model" && m.error)).filter((m) => m.id !== lastUser.id));
    setTimeout(() => void send(lastUser.text), 0);
  }

  function reset() {
    abortRef.current?.abort();
    liveIds.current.clear();
    setMsgs([{ id: "g", role: "model", text: GREETING }]);
    try {
      sessionStorage.removeItem(STORAGE);
    } catch {
      /* nada */
    }
  }

  function endCall(seconds: number) {
    setView("chat");
    if (seconds > 0) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      const id = uid();
      liveIds.current.add(id);
      setMsgs((cur) => [
        ...cur,
        {
          id,
          role: "model",
          text: `Llamada finalizada (${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}). Si quieres, seguimos por aquí o te paso con una persona. {{whatsapp}}`,
        },
      ]);
    }
  }

  if (!enabled || !pathname || !SHOW_ON.has(pathname)) return null;

  // El último mensaje de Prime es el "titular"; lo anterior queda como estela atenuada.
  let lastModelIdx = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]!.role === "model") {
      lastModelIdx = i;
      break;
    }
  }
  const started = msgs.length > 1;

  return (
    <>
      {/* Lanzador */}
      {!open && (
        <button type="button" className="pa-launch" onClick={() => setOpen(true)} aria-label="Abrir el asesor Prime">
          <span className="pa-launch__ava">
            ★<span className="pa-launch__dot" />
          </span>
          <span className="pa-launch__txt">
            <strong>Pregúntale a Prime</strong>
            <small>Resuelve tus dudas al instante</small>
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className={"pa-panel" + (busy ? " is-thinking" : "")} role="dialog" aria-label="Asesor Prime">
          {view === "call" ? (
            <CallView onExit={endCall} />
          ) : (
            <>
              {/* Aurora de fondo: viaja por todo el panel; respira más cuando Prime piensa */}
              <div className="pa-aurora" aria-hidden="true">
                <span className="pa-aurora__a" />
                <span className="pa-aurora__b" />
                <span className="pa-aurora__c" />
                <span className="pa-aurora__d" />
              </div>

              <header className="pa-top">
                <button type="button" className="pa-top__x" onClick={() => setOpen(false)} aria-label="Cerrar">
                  {Ico.close}
                </button>
                <span className="pa-top__pill">
                  <span className="pa-top__star">★</span>
                  Prime
                  <span className={"pa-top__dot" + (busy ? " is-busy" : "")} />
                  <small>{busy ? "escribiendo" : "en línea"}</small>
                </span>
                <button type="button" className="pa-top__call" onClick={() => setView("call")} aria-label="Llamar a Prime">
                  {Ico.phone}
                </button>
              </header>

              <div className="pa-flow" ref={listRef} aria-live="polite" aria-relevant="additions text">
                {msgs.map((m, i) => {
                  if (m.role === "user") {
                    return (
                      <div key={m.id} className={"pa-you" + (i < lastModelIdx ? " is-old" : "")}>
                        {m.text}
                      </div>
                    );
                  }
                  const latest = i === lastModelIdx;
                  const long = m.text.length > 260;
                  return (
                    <div
                      key={m.id}
                      className={
                        "pa-say" +
                        (latest ? " is-latest" : " is-old") +
                        (latest && long ? " is-long" : "") +
                        (m.error ? " is-error" : "")
                      }
                    >
                      {m.text === "" ? (
                        <span className="pa-think" aria-label="Prime está escribiendo">
                          <i />
                          Prime está pensando…
                        </span>
                      ) : (
                        <StreamText
                          text={m.text}
                          streaming={!!m.streaming}
                          animate={latest && liveIds.current.has(m.id)}
                          onWa={onWa}
                        />
                      )}
                      {i === 0 && m.id === "g" && latest && (
                        <div className="pa-quick">
                          {QUICK.map((q, qi) => (
                            <button
                              key={q}
                              type="button"
                              className={"pa-chip" + (qi === 0 ? " is-primary" : "")}
                              onClick={() => quick(q)}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                      {m.error && latest && !busy && (
                        <div className="pa-quick">
                          <button type="button" className="pa-chip is-primary" onClick={retry}>
                            Reintentar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <form
                className="pa-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
              >
                <div className={"pa-composer__box" + (busy ? " is-busy" : "")}>
                  <input
                    ref={inputRef}
                    className="pa-composer__field"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={busy ? "Prime está respondiendo…" : "Escribe tu duda o toca el micro…"}
                    maxLength={1500}
                    autoComplete="off"
                    enterKeyHint="send"
                    onFocus={keepBottom}
                    onBlur={onInputBlur}
                  />
                  <button type="button" className="pa-composer__mic" onClick={() => setView("call")} aria-label="Hablar por voz">
                    {MicIcon}
                  </button>
                  {busy ? (
                    <button type="button" className="pa-composer__send is-stop" onClick={stop} aria-label="Detener respuesta">
                      {StopIcon}
                    </button>
                  ) : (
                    <button type="submit" className="pa-composer__send" disabled={!input.trim()} aria-label="Enviar">
                      {Ico.arrow}
                    </button>
                  )}
                </div>
                <span className="pa-composer__note">
                  Prime es un asistente automatizado; no brinda asesoría legal ·{" "}
                  <a
                    href={waRoute({ kind: "prime_chat", message: "Hola, quiero hablar con una persona sobre mi trámite." })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onWa}
                  >
                    hablar con una persona
                  </a>
                  {started && (
                    <>
                      {" · "}
                      <button type="button" className="pa-composer__reset" onClick={reset}>
                        empezar de nuevo
                      </button>
                    </>
                  )}
                </span>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
