import { useEffect } from "react";
import type { useVisaVoice } from "./useVisaVoice";

export const closingName = (value:string) => value.replace(new RegExp("[^\\p{L}\\p{M} '-]", "gu"), "").trim().slice(0,32);
/** Ajuste de estatus: el cierre del segundo vídeo sigue lo que el agente dijo de la fecha de prioridad.
 *  «current»: ya puede presentar → su contrato. «near» (próxima), «far» (aún en el futuro) y «unknown»
 *  (sin la fecha a mano) → el contrato previo, cada uno con su forma de decirlo. El botón es siempre
 *  «Revisar mi contrato»: el vídeo termina diciendo «Toca "Revisar mi contrato"» (guion v2, 10-10-2026). */
/** Reforzamiento de Asilo: igual, sigue lo que el agente dijo del plazo para presentar pruebas. «asilo-tiempo»: hay
 *  tiempo → su contrato. Sin fecha («asilo-sinfecha») o con la próxima audiencia en pocos días («asilo-pronto») → el
 *  contrato con un asesor. El botón dice «Revisar mi contrato», como pide el final del vídeo 2. Con el plazo vencido
 *  («asilo-asesor», y «asilo-apelacion» si el mérito final ya está encima) no hay contrato que revisar: «Hablar con un asesor». */
/** Preparación de audiencia: el cierre nombra la preparación que le toca («audiencia-segunda» o «audiencia-tercera»).
 *  Sin audiencia programada («audiencia-henry») no hay sesión que reservar todavía: «Hablar con Henry». */
/** Los demás servicios, cuando contygo dice que no (13-10-2026): no hay contrato en línea que revisar, así que el cierre no
 *  invita a revisarlo («asesor»; en Apelación, «apelacion-asesor», por el plazo). Botón: «Hablar con un asesor». */
export type ClosingVariant = "current" | "near" | "far" | "unknown" | "asilo-tiempo" | "asilo-sinfecha" | "asilo-pronto" | "asilo-asesor" | "asilo-apelacion" | "audiencia-segunda" | "audiencia-tercera" | "audiencia-henry" | "asesor" | "apelacion-asesor" | null;
type AsylumClosing = { kind: string; advisor: boolean; appeal: boolean };
type HearingClosing = { kind: string; advisor: boolean };
export const closingVariant = (serviceId:string, priority?:{status:string;previo:boolean;near?:boolean}|null, asylum?:AsylumClosing|null, hearing?:HearingClosing|null, eligible?:boolean|null):ClosingVariant =>
  ownVariant(serviceId,priority,asylum,hearing)??(eligible===false&&serviceId!=="evaluacion-asilo"?serviceId==="apelacion"?"apelacion-asesor":"asesor":null);
const ownVariant = (serviceId:string, priority?:{status:string;previo:boolean;near?:boolean}|null, asylum?:AsylumClosing|null, hearing?:HearingClosing|null):ClosingVariant =>
  serviceId==="preparacion-audiencia"?!hearing?null:hearing.advisor?"audiencia-henry":hearing.kind==="tercera"?"audiencia-tercera":"audiencia-segunda"
  :serviceId==="reforzar-asilo"?!asylum?null:!asylum.advisor?"asilo-tiempo":asylum.appeal?"asilo-apelacion"
  :asylum.kind==="nodate"?"asilo-sinfecha":asylum.kind==="soon"?"asilo-pronto":"asilo-asesor"
  :serviceId!=="i-485"||!priority?null:priority.status==="current"?"current":!priority.previo?null
  :priority.status==="unknown"?"unknown":priority.near?"near":"far";
export const closingAction=(serviceId:string,variant:ClosingVariant=null)=>serviceId==="evaluacion-asilo"?"Conocer mi evaluación"
  :variant==="asilo-asesor"||variant==="asilo-apelacion"||variant==="asesor"||variant==="apelacion-asesor"?"Hablar con un asesor":variant==="audiencia-henry"?"Hablar con Henry":"Revisar mi contrato";
const CLOSING_LINES:Record<Exclude<ClosingVariant,null>,string[]>={
  current:["Tu fecha ya está vigente:","revisa tu contrato","y presentemos juntos","el ajuste del menor.","Tu historia sigue. ContyGo."],
  near:["Tu fecha está muy cerca:","asegura hoy tu lugar","con el contrato previo","y llega listo a tu fecha.","Tu historia sigue. ContyGo."],
  far:["Tu fecha aún está por llegar,","pero tu lugar puede quedar asegurado hoy","con el contrato previo","y sus garantías.","Tu historia sigue. ContyGo."],
  unknown:["Busca tu fecha en el I-797","y, mientras tanto,","asegura tu lugar","con el contrato previo.","Tu historia sigue. ContyGo."],
  "asilo-tiempo":["Todavía tienes tiempo:","revisa tu contrato","y reforcemos juntos","tu caso de asilo.","Tu historia sigue. ContyGo."],
  "asilo-sinfecha":["Todavía tienes tiempo:","un asesor prepara tu contrato contigo","por WhatsApp","y empezamos a reforzar tu caso.","Tu historia sigue. ContyGo."],
  "asilo-pronto":["Tu próxima audiencia es en pocos días:","un asesor prepara tu contrato contigo","por WhatsApp","para empezar cuanto antes.","Tu historia sigue. ContyGo."],
  "asilo-asesor":["Tu fecha está muy cerca:","un asesor revisa tu caso contigo","por WhatsApp","y te dice cómo seguir.","Tu historia sigue. ContyGo."],
  "asilo-apelacion":["Tu audiencia final está muy cerca:","un asesor revisa tu caso contigo","y, si el juez niega tu asilo,","te acompañamos en la apelación.","Tu historia sigue. ContyGo."],
  "audiencia-segunda":["Tu segunda audiencia se prepara mejor acompañado:","revisa tu contrato","y prepárala con Henry,","a tu ritmo y en español.","Tu historia sigue. ContyGo."],
  "audiencia-tercera":["Tu audiencia de mérito merece un plan claro:","revisa tu contrato","y recorre tu historia con Henry","antes de ese día.","Tu historia sigue. ContyGo."],
  "audiencia-henry":["Cuando tengas tu audiencia,","Henry te ayuda a prepararla.","Mientras tanto,","escríbele por WhatsApp.","Tu historia sigue. ContyGo."],
  asesor:["Por lo que nos contaste,","un asesor revisa tu caso contigo","por WhatsApp","antes de contratar.","Tu historia sigue. ContyGo."],
  "apelacion-asesor":["Por la fecha de la decisión,","un asesor revisa tu plazo contigo","por WhatsApp,","hoy mismo.","Tu historia sigue. ContyGo."],
};
export const closingLines=(serviceId:string,variant:ClosingVariant=null)=>
  variant?CLOSING_LINES[variant]
  :[serviceId==="evaluacion-asilo"?"Conoce tu evaluación,":"Revisa tu contrato,","conoce nuestro compromiso","y, cuando estés listo,","avancemos juntos.","Tu historia sigue. ContyGo."];
export const closingScript = (name:string,serviceId="visa-juvenil",variant:ClosingVariant=null) => `${name ? `${name}, tu` : "Tu"} próximo paso merece claridad y compañía. ${closingLines(serviceId,variant).join(" ")} Toca ${closingAction(serviceId,variant)} y descubre cómo vamos a acompañarte. Tu siguiente paso empieza aquí.`;
export type ClosingVoice = ReturnType<typeof useVisaVoice>;

/** Keep the owner's cache alive between the name step, video and closing. */
export function useClosingSpeechWarmup(voice:ClosingVoice, text:string|null) {
  const {prefetch,discardPrefetch}=voice;
  useEffect(()=>{
    if(text===null)return;
    // Typing a name must not launch a separate model session for every letter.
    const timer=setTimeout(()=>{void prefetch(text);},400);
    return()=>{clearTimeout(timer);discardPrefetch(text);};
  },[text,prefetch,discardPrefetch]);
}
