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
   un mundo de plastilina donde el contrato viaja por cinco estaciones (ContractJourney), que se recorre con el scroll.
   23-11-2026, más tarde: la segunda mitad del final (AssistantStart: «¿Listo? Tu contrato, en menos de 3 minutos», los
   trámites, la caja y las preguntas de siempre) se quitó. El dueño: «quita esto de la página… no tiene sentido
   repetirlo 2 veces». Con ella se fueron id="preguntas" y data-thread="faq": el menú abre el asistente y el hilo
   verde baja por el margen hasta el cierre (GreenThread). */
import { CONTRACT_TIME } from "@/lib/agent/landing-chat-ui";
import ContractJourney from "./ContractJourney";
import { openAssistant } from "./assistantBus";
import page from "./ContygoLanding.module.css";
import d from "./AssistantDoor.module.css";

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Speaker = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4Zm12-1a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12" /></svg>;

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

/** The invitation under the services (22-11-2026): for whoever does not know which one is theirs. One line and a button. */
export function AssistantInvite() {
  return <div className={d.invite}>
    <span><strong>¿No sabes cuál es el tuyo?</strong><small>El asistente te lo dice y llena tu contrato contigo, en {CONTRACT_TIME}.</small></span>
    <button type="button" onClick={() => openAssistant()}>Preguntarle<i aria-hidden="true"><Arrow /></i></button>
  </div>;
}
