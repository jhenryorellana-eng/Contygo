"use client";

/* «Haz tu contrato tú mismo. En menos de 3 minutos.» (22-11-2026): la puerta del asistente, donde antes estaba
   «Preguntar también es avanzar».
   Segunda versión, el mismo día. El dueño: «¿puedes mejorar mucho más el diseño? quiero que esté mejor estructurado…
   que el usuario que entre sepa que puede hacer su contrato él mismo y en menos de 3 minutos». La primera apilaba
   seis cosas del mismo peso. Ahora tiene un orden: la promesa y un solo botón principal; debajo, cómo funciona, en
   tres pasos que se encienden al compás del ejemplo; luego, por dónde empezar (lo que necesitas, o con tus
   palabras); y al final, en una fila, las preguntas de siempre.
   Su sitio (tercera decisión del día; el dueño preguntó «dónde crees que sea el lugar adecuado»): estaba al final,
   tras cinco secciones largas, donde llega poca gente. Va en dos: la promesa y cómo funciona (AssistantDoor), justo
   bajo el hero, que es donde se decide; y por dónde empezar con las preguntas de siempre (AssistantStart), al final,
   donde ya estaban, como último paso antes del cierre. Ahí se quedan id="preguntas" y data-thread="faq". El dueño: «lo vamos a cambiar… la idea es hacer el producto de autoservicio de la landing, debe de
   verse y sentirse único, personalizado… su presentación es la manera en la que invitamos al cliente a usar este
   sistema». La lista de preguntas terminaba en «Escríbele al equipo»: empujaba hacia una persona. Esta sección
   enseña lo que el asistente hace (un contrato que se llena solo mientras conversas: un EJEMPLO, y lo dice) y deja
   empezar de tres maneras: contar el caso con sus palabras (escritas o dictadas), tocar una necesidad, o pedir que se
   lo lean en voz alta. Las preguntas de siempre siguen ahí: al tocar una, la responde el asistente, y su respuesta
   termina en el siguiente paso hacia el contrato.
   Conserva id="preguntas" y data-thread="faq": el menú y el hilo verde pasan por aquí. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { waLink } from "@/lib/config";
import { CONTRACT_TIME, LANDING_NEEDS, advisorMessage } from "@/lib/agent/landing-chat-ui";
import ContractSheet, { type SheetData } from "./ContractSheet";
import { openAssistant } from "./assistantBus";
import page from "./ContygoLanding.module.css";
import d from "./AssistantDoor.module.css";

/* The example: a conversation of four lines, and the sheet they fill. Nobody's data. */
const BLANK: SheetData = { stage: "form", firstName: "", lastName: "", email: "", phone: "", city: "", state: "", plan: "", caseNumber: "" };
const SCENES: { who: "you" | "bot"; text: string; data: Partial<SheetData> }[] = [
  { who: "you", text: "Quiero mi permiso de trabajo.", data: {} },
  { who: "bot", text: "Es este servicio. ¿A nombre de quién va?", data: {} },
  { who: "you", text: "Ana Pérez.", data: { firstName: "Ana", lastName: "Pérez" } },
  { who: "bot", text: "¿Dónde te enviamos tu código?", data: { email: "ana@correo.com", phone: "(801) 555-0142" } },
  { who: "bot", text: "¿En qué ciudad vives?", data: { city: "Salt Lake City", state: "UT" } },
  { who: "bot", text: "Elige cómo pagar. Lo revisas todo antes.", data: { plan: "Pago único" } },
  { who: "bot", text: "Te envié tu código. Confírmalo y firmas.", data: { stage: "done" } },
];
/* How it works, in three steps; each scene of the example belongs to one. */
const STEPS = [{ title: "Dime qué necesitas", text: "Te digo cuál es tu servicio." }, { title: "Responde y se llena solo", text: "Tu contrato, dato por dato." }, { title: "Revisa y firma", text: "Con tu código, desde tu celular." }];
const stepOf = (scene: number) => scene <= 1 ? 0 : scene < SCENES.length - 1 ? 1 : 2;
const STEP_MS = 1900, REST_MS = 3200;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Speaker = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4Zm12-1a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12" /></svg>;
const Mic = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>;

export default function AssistantDoor() {
  const [at, setAt] = useState(SCENES.length - 1);
  const stage = useRef<HTMLDivElement>(null);
  // The example plays while it is on screen: line by line, then it rests whole and starts again.
  useEffect(() => {
    const el = stage.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0, seen = false, step = SCENES.length - 1;
    const tick = () => { step = (step + 1) % SCENES.length; setAt(step); timer = window.setTimeout(tick, step === SCENES.length - 1 ? REST_MS : STEP_MS); };
    const watch = new IntersectionObserver(entries => {
      const now = entries[0].isIntersecting;
      if (now === seen) return;
      seen = now; window.clearTimeout(timer);
      if (now) timer = window.setTimeout(tick, 700);
    }, { threshold: .4 });
    watch.observe(el);
    return () => { watch.disconnect(); window.clearTimeout(timer); };
  }, []);
  const data = SCENES.slice(0, at + 1).reduce<SheetData>((all, scene) => ({ ...all, ...scene.data }), BLANK);
  const lines = SCENES.slice(Math.max(0, at - 2), at + 1);

  const step = stepOf(at);
  return <section className={d.door} id="contrato" aria-labelledby="asistente-titulo">
    {/* 1 · The promise, and one way in. */}
    <div className={d.intro}>
      <span className={page.eyebrow}>Tu contrato, en una conversación</span>
      <h2 id="asistente-titulo">Haz tu contrato tú mismo.<br /><em>En {CONTRACT_TIME}.</em></h2>
      <p>El asistente te dice cuál es tu servicio, revisa contigo si calificas y llena tu contrato contigo. Tú lo revisas y firmas.</p>
      <div className={d.cta}>
        <button type="button" className={d.primary} onClick={() => openAssistant()}><span>Empezar mi contrato</span><i aria-hidden="true"><Arrow /></i></button>
        <button type="button" className={d.listen} onClick={() => openAssistant({ listen: true })}><i aria-hidden="true"><Speaker /></i>Prefiero que me lo lea en voz alta</button>
      </div>
    </div>

    {/* 2 · How it works: three steps, lit in time with an example (marked as one). */}
    <div ref={stage} className={d.stage} aria-label="Cómo funciona, en tres pasos" role="group">
      <ol className={d.steps}>{STEPS.map((item, index) => <li key={item.title} data-state={index < step ? "done" : index === step ? "now" : "next"}><b aria-hidden="true">{index + 1}</b><span><strong>{item.title}</strong><small>{item.text}</small></span></li>)}</ol>
      <div className={d.demo} aria-hidden="true">
        <div className={d.talk}>{lines.map((line, index) => <p key={`${at}-${index}`} className={d.line} data-who={line.who} data-new={index === lines.length - 1 || undefined}>{line.text}</p>)}</div>
        <div className={d.paper}><ContractSheet example service="Permiso de Trabajo" data={data} /></div>
      </div>
    </div>

  </section>;
}

/** Where to start, and the usual questions: at the end of the page, the last step before its closing. */
export function AssistantStart({ questions }: { /** The questions people ask most (the approved ones). */ questions: string[] }) {
  const [draft, setDraft] = useState(""), [canTalk, setCanTalk] = useState(false);
  useEffect(() => { const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }; setCanTalk(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition)); }, []);
  const submit = (event: FormEvent) => { event.preventDefault(); const text = draft.replace(/\s+/g, " ").trim(); if (!text) return; setDraft(""); openAssistant({ question: text }); };
  return <section className={d.close} id="preguntas" data-thread="faq" aria-labelledby="empezar-titulo">
    <div className={d.intro}>
      <span className={page.eyebrow}>Empieza aquí</span>
      <h2 id="empezar-titulo">¿Listo?<br /><em>Tu contrato, en {CONTRACT_TIME}.</em></h2>
    </div>
    {/* Where to start: what you need, or in your own words. */}
    <div className={d.start}>
      <h3>Toca lo que necesitas</h3>
      <div className={d.needs}>{LANDING_NEEDS.map(need => <button key={need.label} type="button" onClick={() => openAssistant({ need: need.label })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span><img src={`/contygo/v8/${need.art}.webp`} alt="" width={96} height={96} loading="lazy" /></span><strong>{need.label}</strong>
      </button>)}</div>
      <form className={d.box} onSubmit={submit}>
        <label htmlFor="asistente-caso">O cuéntamelo con tus palabras</label>
        <div><input id="asistente-caso" value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} placeholder="Quiero mi permiso de trabajo…" enterKeyHint="send" />
          {canTalk && <button type="button" className={d.round} onClick={() => openAssistant({ talk: true })} aria-label="Decirlo con mi voz"><Mic /></button>}
          <button type="submit" className={d.send} disabled={!draft.trim()} aria-label="Enviar al asistente"><Arrow /></button></div>
      </form>
    </div>

    {/* The usual questions, in one row: the assistant answers them. */}
    <div className={d.faqs}>
      <h3>Lo que más nos preguntan</h3>
      <div>{questions.map(question => <button key={question} type="button" onClick={() => openAssistant({ question })}>{question}</button>)}</div>
      <p>Respuestas automáticas; no es asesoría legal. Si lo prefieres, <a href={waLink(advisorMessage())} target="_blank" rel="noopener noreferrer">una persona del equipo te atiende por WhatsApp</a>.</p>
    </div>
  </section>;
}

/** The invitation under the services (22-11-2026): for whoever does not know which one is theirs. One line and a button. */
export function AssistantInvite() {
  return <div className={d.invite}>
    <span><strong>¿No sabes cuál es el tuyo?</strong><small>El asistente te lo dice y llena tu contrato contigo, en {CONTRACT_TIME}.</small></span>
    <button type="button" onClick={() => openAssistant()}>Preguntarle<i aria-hidden="true"><Arrow /></i></button>
  </div>;
}
