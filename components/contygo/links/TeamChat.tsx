"use client";

/* The team's assistant on /links: an adviser asks what her client is asking her (cost, payments, what a service
   includes, documents, the process) and gets the answer from what ContyGo has written, with the live price
   (POST /api/agent/team-chat). Each answer can be copied for the client's chat, and names the services it talks
   about so she can jump to them on the card. The same assistant sits on every service's row (ServiceAsk): there the
   question is about that service and it feeds on that product. Nothing is kept: closing the page forgets it all. */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LINK_SECTIONS } from "@/lib/contygo-links";
import { copyText } from "./copy";
import s from "./TeamChat.module.css";

type Source = { site: string; url: string };
type Turn = { q: string; a?: string; covered?: boolean; serviceIds?: string[]; sources?: Source[]; failed?: string };
const NAMES = new Map(LINK_SECTIONS.flatMap(section => section.items).map(item => [item.key, item.name.split(" · ")[0]]));
const STARTERS = [
  "¿Cuánto cuesta el permiso de trabajo y cómo se paga?",
  "¿Qué documentos pide el asilo?",
  "¿Qué incluye la Visa Juvenil Premium?",
  "No fue a su audiencia y tiene orden de deportación: ¿qué servicio le sirve?",
];
const FAILED: Record<string, string> = {
  rate_limited: "Hiciste muchas preguntas seguidas. Espera unos minutos y vuelve a preguntar.",
  invalid_question: "La pregunta es muy larga. Escríbela más corta.",
};
const NO_LINE = "No se pudo enviar. Revisa tu internet y vuelve a intentarlo.";

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Chat = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.3" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z" /><path d="M8.500 11.500h.01M12 11.500h.01M15.500 11.500h.01" strokeWidth="3" /></svg>;
const Close = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.600" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const Send = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.600" aria-hidden="true"><path d="M12 19V5M5.500 11.500 12 5l6.500 6.500" /></svg>;
const CopyIcon = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.3" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></svg>;
const Done = <svg viewBox="0 0 24 24" {...stroke} strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;

function CopyAnswer({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button type="button" className={s.copy} data-state={state} onClick={async () => { setState((await copyText(text)) ? "done" : "failed"); clearTimeout(timer.current); timer.current = setTimeout(() => setState("idle"), 1700); }}>
      {state === "done" ? Done : CopyIcon}<span aria-live="polite">{state === "done" ? "Copiada" : state === "failed" ? "No se pudo" : "Copiar respuesta"}</span>
    </button>
  );
}

type Asked = Pick<Turn, "a" | "covered" | "serviceIds" | "sources" | "failed">;
/** One question to the assistant; `serviceId` when it is written on that service's row. */
async function askTeam(question: string, turns: Turn[], serviceId?: string): Promise<Asked> {
  const history = turns.filter(turn => turn.a).slice(-4).map(turn => ({ q: turn.q, a: turn.a }));
  try {
    const response = await fetch("/api/agent/team-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: question.slice(0, 600), history, ...(serviceId ? { serviceId } : {}) }) });
    const data = await response.json().catch(() => null) as { ok?: boolean; error?: string; reply?: string; covered?: boolean; serviceIds?: string[]; sources?: Source[] } | null;
    return data?.ok && data.reply ? { a: data.reply, covered: data.covered !== false, serviceIds: data.serviceIds ?? [], ...(data.sources?.length ? { sources: data.sources } : {}) } : { failed: FAILED[data?.error ?? ""] ?? NO_LINE };
  } catch { return { failed: NO_LINE }; }
}

/** The questions and answers of one conversation: the panel's, or one service's. */
function useTalk(serviceId?: string) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const ask = async (raw: string, from: Turn[] = turns) => {
    const question = raw.replace(/\s+/g, " ").trim();
    if (!question || busy) return false;
    setTurns([...from, { q: question }]); setBusy(true);
    const result = await askTeam(question, from, serviceId);
    setTurns(list => list.map((turn, index) => index === list.length - 1 ? { ...turn, ...result } : turn));
    setBusy(false);
    return true;
  };
  const retry = (index: number) => { const turn = turns[index]; if (turn) void ask(turn.q, turns.filter((_, at) => at !== index)); };
  return { turns, busy, ask, retry };
}

function Thread({ turns, busy, retry, onJump }: { turns: Turn[]; busy: boolean; retry: (index: number) => void; onJump: (key: string) => void }) {
  return (
    <>
      {turns.map((turn, index) => (
        <div key={index} className={s.turn}>
          <p className={s.asked}>{turn.q}</p>
          {turn.a && (
            <div className={s.answer} data-unsure={(turn.covered === false && !turn.sources) || undefined} data-official={turn.sources ? true : undefined}>
              <p>{turn.a}</p>
              {turn.sources ? (
                <div className={s.official}>
                  <b>Leído ahora en la página oficial.</b> Ábrela y compruébalo antes de decírselo al cliente.
                  <ul>{turn.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.site}</a></li>)}</ul>
                </div>
              ) : turn.covered === false && <p className={s.unsure}>Confírmalo con Henry o con la oficina antes de responder al cliente.</p>}
              <div className={s.after}>
                <CopyAnswer text={turn.a} />
                {(turn.serviceIds ?? []).filter(id => NAMES.has(id)).map(id => <button key={id} type="button" className={s.jump} onClick={() => onJump(id)}>Ver {NAMES.get(id)}</button>)}
              </div>
            </div>
          )}
          {turn.failed && <p className={s.failed} role="alert">{turn.failed} <button type="button" onClick={() => retry(index)}>Preguntar de nuevo</button></p>}
        </div>
      ))}
      {busy && <p className={s.thinking} role="status"><i /><i /><i /><span>Buscando la respuesta</span></p>}
    </>
  );
}

const QUICK = ["¿Qué documentos pide?", "¿Cómo se paga?", "¿Para quién es?", "¿Qué pasa después de contratar?"];

/** The assistant on a service's own row: the question is about that service without naming it, and the answer stays there. */
export function ServiceAsk({ serviceId, name, onJump }: { serviceId: string; name: string; onJump: (key: string) => void }) {
  const { turns, busy, ask, retry } = useTalk(serviceId);
  const [draft, setDraft] = useState("");
  const send = (text: string) => { if (busy || !text.trim()) return; setDraft(""); void ask(text); };
  return (
    <div className={s.own}>
      <form className={s.ownForm} onSubmit={event => { event.preventDefault(); send(draft); }}>
        <span className={s.ownIcon}>{Chat}</span>
        <input type="text" value={draft} maxLength={600} onChange={event => setDraft(event.target.value)} placeholder="Pregunta sobre este servicio" aria-label={`Pregunta al asistente sobre ${name}`} enterKeyHint="send" autoComplete="off" />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar la pregunta">{Send}</button>
      </form>
      {!turns.length && <div className={s.quick}>{QUICK.map(text => <button key={text} type="button" disabled={busy} onClick={() => send(text)}>{text}</button>)}</div>}
      {(turns.length > 0 || busy) && <div className={s.ownTalk} aria-live="polite"><Thread turns={turns} busy={busy} retry={retry} onJump={onJump} /></div>}
    </div>
  );
}

export default function TeamChat({ open, onOpen, onJump }: { open: boolean; onOpen: (open: boolean) => void; onJump: (key: string) => void }) {
  const { turns, busy, ask, retry } = useTalk();
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    field.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onOpen(false); };
    window.addEventListener("keydown", key);
    // On a phone the panel covers the page: the page behind must not scroll under the finger.
    const phone = window.matchMedia("(max-width:759px)").matches, before = document.body.style.overflow;
    if (phone) document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); if (phone) document.body.style.overflow = before; };
  }, [open, onOpen]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: "end" }); }, [turns, busy, open]);

  const close = () => { onOpen(false); launcher.current?.focus({ preventScroll: true }); };
  const send = (text: string) => { if (busy || !text.trim()) return; setDraft(""); void ask(text); };

  const jump = (key: string) => { close(); onJump(key); };

  return (
    <>
      <button ref={launcher} type="button" className={s.launcher} data-hidden={open || undefined} aria-expanded={open} aria-controls="asistente-equipo" aria-label="Pregunta al asistente" onClick={() => onOpen(true)}>
        {Chat}<span>Pregunta al asistente</span>
      </button>
      {open && <div className={s.shade} onClick={close} aria-hidden="true" />}
      {open && (
        <section className={s.panel} id="asistente-equipo" role="dialog" aria-modal="true" aria-label="Asistente del equipo">
          <header className={s.head}>
            <Image src="/contygo/v8/producto-henry.webp" alt="" width={48} height={48} />
            <div><h2>Asistente del equipo</h2><p>Costos, pagos y proceso de cada servicio</p></div>
            <button type="button" className={s.close} onClick={close} aria-label="Cerrar el asistente">{Close}</button>
          </header>

          <div className={s.talk} aria-live="polite">
            {!turns.length && (
              <div className={s.start}>
                <p>Pregunta lo que tu cliente te está preguntando. Te respondo con los precios de hoy y lo que ContyGo tiene escrito de cada servicio.</p>
                <ul>{STARTERS.map(text => <li key={text}><button type="button" onClick={() => send(text)}>{text}</button></li>)}</ul>
              </div>
            )}
            <Thread turns={turns} busy={busy} retry={retry} onJump={jump} />
            <div ref={end} />
          </div>

          <form className={s.write} onSubmit={event => { event.preventDefault(); send(draft); }}>
            <textarea ref={field} value={draft} rows={1} maxLength={600} placeholder="Escribe la pregunta de tu cliente" aria-label="Tu pregunta" enterKeyHint="send"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(draft); } }} />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar la pregunta">{Send}</button>
          </form>
          <p className={s.fine}>No guarda la conversación. No decide si un cliente califica ni da asesoría legal.</p>
        </section>
      )}
    </>
  );
}
