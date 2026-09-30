"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import LiquidGlassPlate from "./LiquidGlassPlate";
import s from "./ThinkingOverlayDemo.module.css";

type Message = { id: number; role: "assistant" | "user"; text: string };
type Phase = "idle" | "thinking";

const samples = [
  { prompt: "¿Cómo me acompaña ContyGo?", reply: "Te ayudamos a entender cada paso y a mantener tus próximos pendientes a la vista. Podemos empezar por lo que necesitas hoy." },
  { prompt: "¿Puedo avanzar a mi ritmo?", reply: "Sí. Podemos ir una pregunta a la vez. Lo importante es que entiendas la información antes de dar el siguiente paso." },
  { prompt: "¿Dónde veo mis próximos pasos?", reply: "En tu espacio de ContyGo podrás encontrar el recorrido de tu servicio. Aquí podemos ayudarte a entender qué viene después." },
];

export default function ThinkingOverlayDemo({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "assistant", text: "Hola, soy ContyGo. Estoy aquí para acompañarte." },
    { id: 1, role: "user", text: "Quiero conocer el proceso." },
    { id: 2, role: "assistant", text: "Claro. Cuéntame qué te gustaría entender primero." },
  ]);
  const [value, setValue] = useState(samples[0].prompt);
  const [phase, setPhase] = useState<Phase>("idle");
  const [completed, setCompleted] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const sampleRef = useRef(0);
  const messageIdRef = useRef(3);
  const busy = phase !== "idle";

  useEffect(() => {
    mountedRef.current = true;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: "auto" });
  }, [messages]);

  useEffect(() => {
    if (phase === "idle" && completed > 0) inputRef.current?.focus({ preventScroll: true });
  }, [phase, completed]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (busyRef.current || !text) return;
    busyRef.current = true;
    const reply = samples[sampleRef.current % samples.length].reply;
    const messageId = messageIdRef.current++;
    setMessages(current => [...current, { id: messageId, role: "user", text }]);
    setValue("");
    setPhase("thinking");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!mountedRef.current) return;
      const response: Message = { id: messageIdRef.current++, role: "assistant", text: reply };
      busyRef.current = false;
      sampleRef.current += 1;
      setMessages(current => [...current, response]);
      setCompleted(current => current + 1);
      setValue(samples[sampleRef.current % samples.length].prompt);
      setPhase("idle");
    }, 1200);
  }

  return <dialog ref={dialogRef} className={s.demo} aria-label="Demo de respuesta de ContyGo" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={s.stage}>
      <header className={s.header}>
        <Image className={s.logo} src="/contygo/brand/logo-dark.png" alt="ContyGo" width={3000} height={849} priority />
      </header>

      <div ref={threadRef} className={s.thread} role="log" aria-label="Conversación de muestra" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
        <div className={s.messages}>
          {messages.map(message => <div key={message.id} className={`${s.message} ${message.role === "user" ? s.user : s.assistant}`}>
            <span className={s.speaker}>{message.role === "user" ? "Tú" : "ContyGo"}</span>
            <p>{message.text}</p>
          </div>)}
        </div>
      </div>

      <div className={s.composerArea}>
        <form className={s.composer} onSubmit={sendMessage} aria-label="Enviar un mensaje de muestra">
          <LiquidGlassPlate radius={32} strength={22} tone="dark" active />
          <label className={s.srOnly} htmlFor="thinking-demo-message">Mensaje de prueba</label>
          <input ref={inputRef} id="thinking-demo-message" value={value} onChange={event => setValue(event.target.value)} disabled={busy} autoComplete="off" maxLength={220} placeholder="Escribe un mensaje de prueba…" />
          <button className={s.send} type="submit" disabled={busy || !value.trim()} aria-label="Enviar mensaje de prueba">
            <span>Enviar mensaje de prueba</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>
        <div className={s.inputReaction} data-active={busy} aria-hidden="true" />
        <p className={s.status} role="status" aria-live="polite">{busy ? "Preparando tu siguiente paso…" : completed ? "Respuesta lista. Puedes probar otra vez." : "Envía el mensaje para probar el efecto."}</p>
      </div>
      <div className={s.lowerSpace} aria-hidden="true"><span>SIEMPRE CONTIGO. PASO A PASO.</span></div>
    </div>
    <button className={s.close} type="button" onClick={onClose} autoFocus aria-label="Volver a la vista de prueba"><span aria-hidden="true">←</span> Volver</button>
    <span className={s.demoLabel}>DEMO DE RESPUESTA</span>
  </dialog>;
}
