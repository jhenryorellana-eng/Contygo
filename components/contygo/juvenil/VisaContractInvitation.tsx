"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import BrandLiquidSurface, { type VisaVisualTheme } from "./BrandLiquidSurface";
import LiquidGlassPlate from "./LiquidGlassPlate";
import s from "./VisaContractInvitation.module.css";

/** A visual invitation only. The actual contract is reviewed inside ContyGo. */
export default function VisaContractInvitation({ contractUrl, visualTheme = "lagoon", serviceName = "Visa Juvenil", isEvaluation = false }: { contractUrl: string; visualTheme?: VisaVisualTheme; serviceName?: string; isEvaluation?: boolean }) {
  const scene = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = scene.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const signature = element.querySelector<SVGPathElement>("[data-signature]");
      const length = signature?.getTotalLength() ?? 1;
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline.fromTo("[data-contract-curtain]", { opacity: 1 }, { opacity: 0, duration: .65 }, 0)
        .from("[data-contract-backdrop]", { opacity: 0, duration: .85 }, 0)
        .from("[data-contract-paper]", { y: 65, scale: .78, rotationY: -24, rotationZ: -8, opacity: 0, duration: 1.15 }, .08)
        .from("[data-contract-fold]", { rotationY: -125, opacity: 0, transformOrigin: "0% 0%", duration: .8 }, .5)
        .fromTo("[data-contract-copy]", { opacity: 0, y: 24 }, { opacity:1, y:0, stagger: .095, duration: .8, clearProps:"transform,opacity" }, .36)
        .from("[data-contract-seal]", { scale: .6, opacity: 0, rotationZ: -15, duration: .7 }, .85);
      if (signature) timeline.fromTo(signature, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.3, ease: "power2.inOut" }, .8);
    }, element);
    return () => context.revert();
  }, []);

  return <section ref={scene} className={s.scene} data-visual-theme={visualTheme} aria-labelledby="visa-contract-title">
    <div className={s.entranceCurtain} data-contract-curtain aria-hidden="true"/>
    <div className={s.artwork} aria-hidden="true">
      <div className={s.artworkBackdrop} data-contract-backdrop><BrandLiquidSurface theme={visualTheme === "prism" ? "lagoon" : visualTheme} progress={5}/></div>
      <Image className={s.brand} src="/contygo/brand/logo-dark.png" alt="" width={3000} height={849} priority />
      <div className={s.documentStage}>
        <div className={s.documentShadow}/>
        <div className={s.document} data-contract-paper>
          <span className={s.documentFold} data-contract-fold/>
          <Image className={s.documentLogo} src="/contygo/brand/logo-light.png" alt="" width={3000} height={849} priority />
          <span className={s.documentEyebrow}>{serviceName.toUpperCase()}</span>
          <strong>{isEvaluation?"Tu evaluación.":"Tu contrato."}<br/>Todo claro.</strong>
          <div className={s.documentLines}><i/><i/><i/><i/></div>
          <div className={s.documentRule}/>
          <svg className={s.signature} viewBox="0 0 200 70" fill="none"><path data-signature d="M8 49C28 49 51 8 39 13c-13 5-20 53-6 45 17-10 22-40 17-37-7 5-17 39-5 35 8-2 13-24 17-23 4 1-8 22-1 22 8 1 15-14 20-13 6 2-1 13 6 11 9-2 15-11 20-10 7 2 3 9 12 7 17-4 31-10 61-11M29 65c50-13 95-16 164-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className={s.documentCaption}>PARA REVISAR EN CONTYGO</span>
          <span className={s.seal} data-contract-seal><Image src="/contygo/brand/symbol-light.png" alt="" width={1024} height={1024}/></span>
        </div>
      </div>
      <p className={s.artworkCaption}>De entender el camino.<br/><strong>A dar tu siguiente paso.</strong></p>
    </div>

    <div className={s.copy}>
      <span className={s.eyebrow} data-contract-copy><i/> CONTIGO, EN LO QUE SIGUE</span>
      <h3 id="visa-contract-title" className={s.title} data-contract-copy>Tu próximo paso,<br/><span>con todo claro.</span></h3>
      <p className={s.description} data-contract-copy>Ya conoces el camino. Ahora puedes revisar {isEvaluation?"las condiciones de tu evaluación":"el contrato de tu servicio"} en ContyGo.</p>
      <div className={s.reviewNote} data-contract-copy><span>01</span><p>Conoce el alcance.<br/><strong>Lee las condiciones a tu ritmo.</strong></p></div>
      <a className={s.contractLink} href={contractUrl} target="_blank" rel="noopener noreferrer" data-contract-copy>
        <LiquidGlassPlate radius={19} strength={24} tone="dark"/>
        <i className={s.edgeLight} aria-hidden="true"/>
        <span className={s.linkText}><small>CONTINÚA EN CONTYGO</small><strong>{isEvaluation?"Continuar con mi evaluación":"Revisar mi contrato"}</strong></span>
        <span className={s.linkArrow}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
      </a>
      <p className={s.footnote} data-contract-copy>Entra o crea tu cuenta. Podrás leer {isEvaluation?"las condiciones antes de solicitar la evaluación.":"tu contrato antes de decidir y firmar."}</p>
      <div className={s.signoff} data-contract-copy><Image src="/contygo/brand/logo-light.png" alt="ContyGo" width={3000} height={849}/><span>Un paso a la vez. Contigo.</span></div>
    </div>
  </section>;
}
