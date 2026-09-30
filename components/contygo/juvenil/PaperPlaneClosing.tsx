"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { CONTYGO_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { getRebuildPlatformFilm, type RebuildFilm } from "@/lib/contygo-rebuild-media";
import { getContygoServiceUrl } from "@/lib/contygo";
import { useVisaVoice } from "./useVisaVoice";
import { LiquidGlow } from "./ThinkingOverlay";
import ExternalVideoCaptions from "./ExternalVideoCaptions";
import s from "./PaperPlaneClosing.module.css";
import { closingName, closingScript, closingAction, closingLines, useClosingSpeechWarmup, type ClosingVoice } from "./closingSpeech";

export { closingName, closingScript } from "./closingSpeech";
const wordCount=(text:string)=>text.trim()?text.trim().split(/\s+/).length:0;
function VoiceWords({text,offset,total,progress}:{text:string;offset:number;total:number;progress:number}){
  return <>{text.split(/\s+/).map((word,index)=><span className={s.wordMask} key={`${text}-${index}`}><span className={s.spokenWord} data-revealed={progress>=0&&(offset+index)/total<=progress}>{word}</span>{" "}</span>)}</>;
}
const options=CONTYGO_SERVICES;
const rays=Array.from({length:16},(_,i)=>({angle:i*22.5,distance:i%2?115:155}));
function Arrow(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function TouchHand(){return <svg viewBox="0 0 56 72" fill="none" aria-hidden="true"><path d="M19 37V12c0-8 11-8 11 0v19c1-6 10-6 10 1v3c2-5 9-3 9 3v11c0 10-6 18-16 18h-4c-6 0-10-4-13-9L5 42c-4-6 3-12 8-7l6 7" fill="#f6f8f7" stroke="#061b3d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M24 13v23m11-1v9m9-4v7" stroke="#061b3d" strokeOpacity=".2" strokeWidth="2" strokeLinecap="round"/><path d="M19 13c0-8 11-8 11 0" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>;}

/** Shared service closing. Video stays untouched; animation starts at ended. */
/** onContract: abre la ficha de contratación del recorrido; sin ella, el botón sigue enlazando a ContyGo. */
type ClosingProps={autoPlay?:boolean;displayName?:string;preparedVoice?:ClosingVoice;service?:ContygoService;film?:RebuildFilm;onContract?:()=>void};
export default function PaperPlaneClosing(props:ClosingProps){
  return props.preparedVoice?<ClosingScene {...props} voice={props.preparedVoice}/>:<LocalClosing {...props}/>;
}
function LocalClosing(props:ClosingProps){
  const voice=useVisaVoice();
  return <ClosingScene {...props} voice={voice}/>;
}
function ClosingScene({autoPlay=false,displayName="",preparedVoice,voice,service:providedService,film:providedFilm,onContract}:{voice:ClosingVoice}&ClosingProps){
  const [serviceId,setServiceId]=useState(providedService?.id??"visa-juvenil"),[name,setName]=useState(closingName(displayName)),[take,setTake]=useState(0);
  const [phase,setPhase]=useState<"watch"|"flying"|"invitation">("watch"),[blocked,setBlocked]=useState(false),[failed,setFailed]=useState(false);
  const [calling,setCalling]=useState(false),[ctaInvited,setCtaInvited]=useState(false);
  const scene=useRef<HTMLDivElement>(null),frame=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),plane=useRef<HTMLDivElement>(null),symbol=useRef<HTMLDivElement>(null),brand=useRef<HTMLDivElement>(null),cta=useRef<HTMLAnchorElement>(null),title=useRef<HTMLHeadingElement>(null);
  const context=useRef<gsap.Context|null>(null),flying=useRef(false),voiceRef=useRef(voice);voiceRef.current=voice;
  const service=providedService??options.find(item=>item.id===serviceId)!;
  const film=providedFilm??getRebuildPlatformFilm(service.id),action=closingAction(service.id);
  const script=closingScript(closingName(name),service.id),scriptRef=useRef(script);scriptRef.current=script;
  const nameWords=wordCount(closingName(name)),totalWords=wordCount(script);
  // Follow the real audio clock. Word boundaries are proportional estimates:
  // the current voice endpoint does not return per-word alignment timestamps.
  const speechProgress=phase!=="invitation"?-1:calling||voice.muted||voice.status==="blocked"||voice.status==="unavailable"?1:voice.status==="speaking"?voice.progress:voice.status==="idle"?1:-1;
  let lineOffset=nameWords+7;
  const cues=closingLines(service.id).map(text=>{const cue={text,offset:lineOffset};lineOffset+=wordCount(text);return cue;});
  const currentCue=cues.filter(cue=>speechProgress>=cue.offset/totalWords).pop();
  useLayoutEffect(()=>{flying.current=false;const ctx=gsap.context(()=>{},scene);context.current=ctx;return()=>{ctx.revert();context.current=null;};},[take,serviceId]);
  // Coming from the chat portal: start exactly on the portal's frame and glide into place, so the
  // player never jumps (the portal and this layout disagree by some pixels on short screens).
  useLayoutEffect(()=>{
    const film=frame.current,dialog=film?.closest("dialog"),raw=dialog?.getAttribute("data-portal-from");
    if(!film||!dialog||!raw)return;
    let from:{x:number;y:number;w:number;h:number};
    try{from=JSON.parse(raw);}catch{dialog.removeAttribute("data-portal-from");return;}
    const own=film.getBoundingClientRect();
    if(!own.width||window.matchMedia("(prefers-reduced-motion: reduce)").matches){dialog.removeAttribute("data-portal-from");return;}
    const props="transform,translate,rotate,scale";
    // The handoff is consumed only when the glide ends, so a remount (React Strict Mode) replays it cleanly.
    const tween=gsap.fromTo(film,{x:from.x+from.w/2-(own.left+own.width/2),y:from.y+from.h/2-(own.top+own.height/2),scale:from.w/own.width},{x:0,y:0,scale:1,duration:.6,ease:"power3.inOut",clearProps:props,onComplete:()=>dialog.removeAttribute("data-portal-from")});
    return()=>{tween.kill();gsap.set(film,{clearProps:props});};
  },[]);
  useClosingSpeechWarmup(voice,preparedVoice?null:script);
  useEffect(()=>()=>voiceRef.current.stop(),[]);
  useEffect(()=>{if(autoPlay)void video.current?.play().catch(()=>setBlocked(true));},[autoPlay,take]);
  function speakInvitation(){
    setCalling(false);setCtaInvited(false);
    void voiceRef.current.speak(scriptRef.current,{
      cuePhrase:`Toca ${action}`,
      onCue:()=>{setCalling(true);setCtaInvited(true);},
    });
  }
  function replay(){voice.stop();setCalling(false);setCtaInvited(false);context.current?.revert();setPhase("watch");setBlocked(false);setFailed(false);setTake(n=>n+1);}
  function play(){voice.unlock();setBlocked(false);void video.current?.play().catch(()=>setBlocked(true));}
  function finish(){
    if(flying.current||!scene.current||!frame.current||!plane.current||!symbol.current||!brand.current||!cta.current)return;
    flying.current=true;setPhase("flying");
    // A quick preview may skip the debounce/video; start preparing immediately.
    void voiceRef.current.prefetch(scriptRef.current);
    const bounds=scene.current.getBoundingClientRect(),film=frame.current.getBoundingClientRect(),mark=brand.current.getBoundingClientRect(),button=cta.current.getBoundingClientRect();
    const w=bounds.width,h=bounds.height,cx=w/2,cy=h*.43;
    const brandY=mark.top-bounds.top,brandX=mark.left-bounds.left;
    const symbolX=cx-(brandX+mark.width*.60),symbolY=cy-(brandY+mark.height*.5);
    const endX=button.left-bounds.left+button.width/2,endY=button.top-bounds.top+button.height/2;
    const finishInvitation=()=>{setPhase("invitation");title.current?.focus({preventScroll:true});speakInvitation();};
    // By day the paper plane is ink on paper: its folded seam turns navy and its glow becomes a shadow.
    const light=scene.current.closest("[data-contygo-theme]")?.getAttribute("data-contygo-theme")==="light";
    context.current?.add(()=>{
      const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if(reduced){gsap.set(frame.current,{autoAlpha:0});gsap.set("[data-final],[data-name],[data-message],[data-brand-half]",{autoAlpha:1});gsap.set(symbol.current,{opacity:1});finishInvitation();return;}
      gsap.set(plane.current,{x:cx,y:film.top-bounds.top+film.height/2,scale:.8,rotation:-12,opacity:0});
      gsap.set(symbol.current,{x:symbolX,y:symbolY,scale:2.8,opacity:0,transformOrigin:"60% 50%"});
      const drift={t:0};
      const p0={x:cx-22,y:cy+4},p1={x:Math.min(w-45,cx+140),y:cy+30},p2={x:w*.73,y:endY-100};
      const tl=gsap.timeline();
      tl.to(frame.current,{scaleX:.22,scaleY:.07,rotationZ:-10,filter:"brightness(2)",duration:.62,ease:"power3.inOut"},0)
        .to(frame.current,{autoAlpha:0,duration:.18},.48)
        .to(plane.current,{opacity:1,scale:1,duration:.2},.46)
        .fromTo("[data-plane-wing]",{rotationX:70},{rotationX:0,duration:.35,stagger:.07},.55)
        .to(symbol.current,{opacity:1,duration:.5},.7)
        .to(plane.current,{x:w*.18,y:h*.56,rotation:-23,scale:.85,duration:.52,ease:"power2.inOut"},.8)
        .to(plane.current,{x:w*.32,y:h*.27,rotation:17,scale:1.05,duration:.65,ease:"power2.inOut"},1.32)
        .to(plane.current,{x:cx-22,y:cy+4,rotation:28,scale:.68,duration:.4,ease:"power3.in"},1.97)
        .fromTo("[data-impact]",{x:cx,y:cy,scale:.2,opacity:.9},{scale:3.4,opacity:0,duration:.9,ease:"power3.out"},2.30)
        .fromTo("[data-ray]",{x:cx,y:cy,opacity:1,scale:.5},{x:i=>cx+Math.cos(rays[i].angle*Math.PI/180)*rays[i].distance,y:i=>cy+Math.sin(rays[i].angle*Math.PI/180)*rays[i].distance,opacity:0,scale:0,duration:.8,ease:"power3.out"},2.32)
        .to(symbol.current,{x:0,y:0,scale:1,duration:.95,ease:"power3.inOut"},2.43)
        .fromTo("[data-brand-half]",{opacity:0,x:i=>i===0?-28:28},{opacity:1,x:0,duration:.6,stagger:.08},2.99)
        .to(drift,{t:1,duration:1.08,ease:"sine.inOut",onUpdate:()=>{
          const t=drift.t,u=1-t;
          gsap.set(plane.current,{x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*endX,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*endY,rotation:28+Math.sin(t*Math.PI)*38-28*t});
        }},2.34)
        .to("[data-plane-top]",{attr:{points:"0,28 104,28 104,30 0,30"},fill:light?"#061B3D":"#F6F8F7",duration:.48,ease:"power2.inOut"},3.08)
        .to("[data-plane-bottom]",{attr:{points:"104,30 104,32 0,32 0,30"},fill:"#25D366",duration:.48,ease:"power2.inOut"},3.12)
        .to("[data-plane-crease]",{opacity:0,duration:.22},3.12)
        .to(plane.current,{scaleX:button.width/104,scaleY:1,filter:light?"drop-shadow(0 6px 10px rgb(8 127 70 / 55%))":"drop-shadow(0 0 9px #25D366)",duration:.7,ease:"power3.inOut"},3.3)
        .fromTo(cta.current,{autoAlpha:0,clipPath:"inset(48% 0 round 42px)"},{autoAlpha:1,clipPath:"inset(0% 0 round 42px)",duration:.85,ease:"expo.inOut"},3.64)
        .fromTo("[data-rim-trace]",{opacity:1,strokeDashoffset:1},{strokeDashoffset:0,duration:1,ease:"power2.inOut"},3.72)
        .to(plane.current,{opacity:0,duration:.45},3.95)
        .to("[data-rim-trace]",{opacity:0,duration:.6},4.66)
        .fromTo("[data-button-copy]",{opacity:0,y:6,filter:"blur(3px)"},{opacity:1,y:0,filter:"blur(0px)",duration:.6,stagger:.07},4.2)
        .fromTo("[data-message]",{opacity:0,y:12,filter:"blur(6px)"},{opacity:1,y:0,filter:"blur(0px)",duration:.65,stagger:.08},4.35)
        .call(finishInvitation,[],3.6);
      const settle=()=>tl.progress(1);window.addEventListener("resize",settle,{once:true});
      return()=>window.removeEventListener("resize",settle);
    });
  }
  return <main className={s.page} data-service-id={service.id} data-phase={phase} data-voice-state={voice.status} data-immersive={autoPlay}>
    {!autoPlay&&<header className={s.tools}><span>PRUEBA DEL CIERRE</span><div><label>Tu nombre<input aria-label="Nombre para probar el cierre" value={name} maxLength={32} disabled={phase!=="watch"} placeholder="Opcional" onChange={e=>setName(e.target.value.replace(new RegExp("[^\\p{L}\\p{M} '-]", "gu"),""))}/></label><label className={s.serviceLabel}>Servicio<select value={serviceId} disabled={phase!=="watch"} onChange={e=>{replay();setServiceId(e.target.value);}}>{options.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={replay}>↻ Repetir</button></div></header>}
    <div className={s.scene} ref={scene} key={`${take}-${serviceId}`}>
      {/* While the film plays, the journey's threads and the «y» frame it exactly like the first film.
          From the paper plane on, a calm stage light takes over (no threads at the invitation). */}
      <div className={s.stageLight} aria-hidden="true"/>
      <div className={s.light} aria-hidden="true"><LiquidGlow intensity={phase==="watch"?.5:1} level={voice.level}/></div>
      <div ref={frame} className={s.filmFrame}><video ref={video} src={film.src??undefined} poster={film.poster} playsInline controls={false} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture disableRemotePlayback tabIndex={-1} autoPlay={autoPlay} onEnded={finish} onPlay={()=>{voice.unlock();setBlocked(false);}} onError={()=>setFailed(true)} onPause={event=>{if(!flying.current&&!event.currentTarget.ended&&!event.currentTarget.closest("dialog")?.hasAttribute("data-closing"))setBlocked(true);}} onContextMenu={event=>event.preventDefault()} aria-label={`Cómo te acompaña ContyGo · ${service.name}${film.provisional?" · vídeo provisional":""}`}>{film.captions&&<track data-external-captions default ref={element=>{if(element)element.track.mode="hidden";}} kind="captions" src={film.captions} srcLang="es" label="Español"/>}</video></div>
      {/* Same subtitles as the first film, shown as soon as this film has its WebVTT file. */}
      {film.captions&&phase==="watch"&&<div className={s.filmCaptions} data-film-captions><ExternalVideoCaptions videoRef={video} src={film.captions} toggle={!film.onScreenText}/></div>}
      <div className={s.plane} ref={plane} aria-hidden="true"><svg viewBox="0 0 104 60" fill="none"><polygon data-plane-wing data-plane-top points="2,6 101,1 44,30 44,30" fill="#F6F8F7"/><polygon data-plane-wing data-plane-bottom points="101,1 64,56 44,30 44,30" fill="#B8CABC"/><path data-plane-crease d="m101 1-62 29 5 24 7-18Z" fill="#087F46"/><path data-plane-crease d="m39 30 62-29-57 29" stroke="#fff" strokeWidth=".8"/></svg></div>
      <i data-impact className={s.impact} aria-hidden="true"/>{rays.map((ray,i)=><i key={i} data-ray className={s.ray} style={{"--turn":`${ray.angle}deg`} as CSSProperties} aria-hidden="true"/>)}
      <div className={s.brand} ref={brand} aria-label="ContyGo"><img data-brand-half className={s.cont} src="/contygo/brand/logo-dark.png" alt=""/><div ref={symbol} className={s.y}><img src="/contygo/brand/logo-dark.png" alt=""/></div><img data-brand-half className={s.go} src="/contygo/brand/logo-dark.png" alt=""/></div>
      <section className={s.invitation} aria-hidden={phase!=="invitation"}>
        <p data-message className={s.eyebrow}>{service.name} · TU SIGUIENTE PASO</p>
        <h1 ref={title} tabIndex={-1} className={s.voiceTitle} aria-label={`${closingName(name)?`${closingName(name)}, `:""}tu próximo paso merece claridad y compañía.`}>
          {!!closingName(name)&&<span className={s.personalName} aria-hidden="true"><VoiceWords text={`${closingName(name)},`} offset={0} total={totalWords} progress={speechProgress}/></span>}
          <span className={s.headlineBuild} aria-hidden="true"><VoiceWords text="Tu próximo paso merece" offset={nameWords} total={totalWords} progress={speechProgress}/><br/><strong><VoiceWords text="claridad y compañía." offset={nameWords+4} total={totalWords} progress={speechProgress}/></strong></span>
        </h1>
        <p className={s.voiceCaption} aria-label={calling?"Tu siguiente paso empieza aquí.":currentCue?.text} key={calling?"cta":currentCue?.offset??"waiting"}>{calling?<span className={s.callCaption}>Tu siguiente paso<br/><strong>empieza aquí.</strong></span>:currentCue&&<VoiceWords text={currentCue.text} offset={currentCue.offset} total={totalWords} progress={speechProgress}/>}</p>
        {/* What comes next, as the same paper sculpture family as the landing: the contract, ready to read. */}
        <img data-message className={s.contractArt} src="/contygo/v8/flujo-contrato.webp" width={512} height={512} alt="" draggable={false}/>
      </section>
      <div className={s.actionArea} aria-hidden={phase!=="invitation"}>
        <div className={s.ctaDock} data-invited={ctaInvited} data-calling={calling&&voice.status==="speaking"} style={{"--voice-energy":voice.level} as CSSProperties}>
          <svg className={s.rimTrace} aria-hidden="true"><rect data-rim-trace x="1" y="1" rx="42" pathLength="1"/><rect className={s.voiceTrace} x="1" y="1" rx="42" pathLength="1"/></svg>
          <a ref={cta} data-final className={s.cta} href={getContygoServiceUrl(service.id)??"https://contygo.app"} target="_blank" rel="noopener noreferrer" tabIndex={phase==="invitation"?0:-1} aria-hidden={phase!=="invitation"} onClick={event=>{voice.stop();if(onContract){event.preventDefault();onContract();}}}><span className={s.liquidInk} aria-hidden="true"/><span className={s.contactWave} aria-hidden="true"/><span data-button-copy><strong>{action}</strong><small>Conoce cómo te acompañamos</small></span><span data-button-copy className={s.arrow}><Arrow/></span></a>
          <span className={s.touchActor} aria-hidden="true"><TouchHand/></span>
        </div>
        <p data-message className={s.footnote}>{service.id==="evaluacion-asilo"?"Conoce el alcance. Después decides.":"Primero lees. Después decides y firmas."}</p>
        {phase==="invitation"&&<div className={s.voiceControls}><button onClick={()=>{voice.unlock();speakInvitation();}}>{voice.status==="blocked"?"Activar voz":voice.status==="unavailable"?"Reintentar voz":"Escuchar invitación"}</button><button onClick={voice.toggleMute}>{voice.muted?"Activar sonido":"Silenciar"}</button><details><summary>Leer invitación</summary><p>{script}</p></details></div>}
      </div>
      {phase==="watch"&&(!autoPlay||blocked||failed)&&<div className={s.watchTools}><button onClick={()=>{if(failed){setFailed(false);video.current?.load();}play();}}>{failed?"Reintentar vídeo":blocked?"Continuar vídeo":"Reproducir vídeo + cierre"}</button>{failed&&<p>No se pudo cargar el vídeo.</p>}{!autoPlay&&<><button onClick={()=>{voice.unlock();video.current?.pause();finish();}}>Probar solo la transición</button><small>{film.provisional?"Clip temporal · ":""}la transición comienza después del vídeo.</small></>}</div>}
    </div>
  </main>;
}
