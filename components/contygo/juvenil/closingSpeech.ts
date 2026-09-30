import { useEffect } from "react";
import type { useVisaVoice } from "./useVisaVoice";

export const closingName = (value:string) => value.replace(new RegExp("[^\\p{L}\\p{M} '-]", "gu"), "").trim().slice(0,32);
export const closingAction=(serviceId:string)=>serviceId==="evaluacion-asilo"?"Conocer mi evaluación":"Revisar mi contrato";
export const closingLines=(serviceId:string)=>[serviceId==="evaluacion-asilo"?"Conoce tu evaluación,":"Revisa tu contrato,","conoce nuestro compromiso","y, cuando estés listo,","avancemos juntos.","Tu historia sigue. ContyGo."];
export const closingScript = (name:string,serviceId="visa-juvenil") => `${name ? `${name}, tu` : "Tu"} próximo paso merece claridad y compañía. ${closingLines(serviceId).join(" ")} Toca ${closingAction(serviceId)} y descubre cómo vamos a acompañarte. Tu siguiente paso empieza aquí.`;
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
