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
   Conserva id="preguntas" y data-thread="faq": el menú y el hilo verde pasan por aquí.
   23-11-2026: la escena de ejemplo (una conversación inventada junto a una hoja) no gustó: «no muestra nada de lo que
   realmente es el proceso». Tras dos demostraciones en un teléfono que tampoco gustaron, el dueño eligió el estilo:
   un mundo de plastilina donde el contrato viaja por cinco estaciones (ContractJourney), que se recorre con el scroll. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { waLink } from "@/lib/config";
import { CONTRACT_TIME, LANDING_NEEDS, advisorMessage } from "@/lib/agent/landing-chat-ui";
import ContractJourney from "./ContractJourney";
import { openAssistant } from "./assistantBus";
import page from "./ContygoLanding.module.css";
import d from "./AssistantDoor.module.css";

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Speaker = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4Zm12-1a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12" /></svg>;
const Mic = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>;

export default function AssistantDoor() {
  return <section className={d.door} id="contrato" aria-labelledby="asistente-titulo">
    {/* The promise, and one way in. */}
    <div className={d.intro}>
      <span className={page.eyebrow}>Tu contrato, en una conversación</span>
      <h2 id="asistente-titulo">Haz tu contrato tú mismo.<br /><em>En {CONTRACT_TIME}.</em></h2>
      <p>Así de fácil: tocas tu trámite, respondes unas preguntas y tu contrato se llena contigo. Tú lo revisas y firmas.</p>
      <div className={d.cta}>
        <button type="button" className={d.primary} onClick={() => openAssistant()}><span>Empezar mi contrato</span><i aria-hidden="true"><Arrow /></i></button>
        <button type="button" className={d.listen} onClick={() => openAssistant({ listen: true })}><i aria-hidden="true"><Speaker /></i>Prefiero que me lo lea en voz alta</button>
      </div>
    </div>
    {/* The whole process, seen: a clay world the contract travels through, station by station (ContractJourney). */}
    <ContractJourney />
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
      {/* The three services people ask for most go first, larger; the rest, after. */}
      <h3>Los más pedidos</h3>
      <div className={d.tops}>{LANDING_NEEDS.filter(need => need.top).map(need => <button key={need.label} type="button" onClick={() => openAssistant({ need: need.label })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span><img src={`/contygo/v8/${need.art}.webp`} alt="" width={128} height={128} loading="lazy" /></span><strong>{need.label}</strong><small>{need.hint}</small><i aria-hidden="true"><Arrow /></i>
      </button>)}</div>
      <h3>Otros trámites</h3>
      <div className={d.needs}>{LANDING_NEEDS.filter(need => !need.top).map(need => <button key={need.label} type="button" onClick={() => openAssistant({ need: need.label })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span><img src={`/contygo/v8/${need.art}.webp`} alt="" width={96} height={96} loading="lazy" /></span><strong>{need.label}</strong>
      </button>)}</div>
      <form className={d.box} onSubmit={submit}>
        <label htmlFor="asistente-caso">O cuéntamelo con tus palabras</label>
        <div><input id="asistente-caso" value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} placeholder="El juez decidió en mi contra…" enterKeyHint="send" />
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
