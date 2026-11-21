"use client";

/* «De la mano de Henry Orellana» (21-11-2026): al final de todos los servicios y antes de «Así funciona cada trámite»,
   quién acompaña. El dueño la pidió así: «algo como "de la mano del asesor acreditado Henry Orellana" y una imagen de
   Henry como CEO… que se vea bien y corto».
   - El título dice lo que Henry es: consultor de inmigración registrado en Utah. No «asesor acreditado»: en
     inmigración, «acreditado» nombra a los representantes que acredita el Departamento de Justicia, y Henry no lo es
     ni puede dar asesoría legal; la página lo dice junto a su nombre, también aquí.
   - La foto es suya, de su sesión de estudio (proyecto «automatizado de imágenes para redes», referencias/henry/840):
     sin retoque de su rostro, solo recortada.
   - La frase es de él, de la página de su Club: «No enseño una ruta que leí. Enseño la que recorrí».
   - «ContyGo está hecho con su experiencia…»: el dueño pidió decir, «en pocas palabras y claras», que las
     automatizaciones y los procesos están pensados en cómo Henry lo hizo y que la plataforma incluye su experiencia.
     Habla de lo que él hizo con sus trámites; no promete un resultado a quien lee.
   Es una hoja en tinta, como el cartel que abre la ruta: la ruta empieza y termina en el azul de la marca. La foto
   llega con el barrido en diagonal de las hojas, al ritmo del dedo (--x). */
import Image from "next/image";
import { useEffect, useRef } from "react";
import h from "./HenryHand.module.css";

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Shield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.900 7.5-9.500V6Zm-3 9 2.200 2.200 4-4.400" /></svg>;

export default function HenryHand() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const paint = () => { frame = 0; const p = calm.matches ? 1 : Math.min(1, Math.max(0, (innerHeight * .96 - el.getBoundingClientRect().top) / (innerHeight * .55))); el.style.setProperty("--x", (p * p * (3 - 2 * p)).toFixed(4)); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    paint();
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);

  return <section ref={ref} className={h.hand} id="henry" aria-labelledby="henry-titulo">
    <div className={h.sheet}>
      <figure className={h.photo}>
        <Image src="/contygo/v8/henry-ceo.webp" alt="Henry Orellana, de traje azul, con los brazos cruzados y sonriendo." width={880} height={1100} sizes="(max-width:760px) 88vw, 420px" />
        <figcaption><strong>Henry Orellana</strong><span>CEO de ContyGo</span></figcaption>
        <i className={h.edge} aria-hidden="true" />
      </figure>
      <div className={h.copy}>
        <h2 id="henry-titulo">De la mano de <em>Henry Orellana.</em></h2>
        <p className={h.role}>Consultor de inmigración registrado en Utah.</p>
        <p className={h.made}><strong>ContyGo está hecho con su experiencia.</strong> Cada proceso y cada automatización de la plataforma siguen la forma en que Henry resolvió sus propios trámites.</p>
        <blockquote>«No enseño una ruta que leí. Enseño la que recorrí.»</blockquote>
        <a className={h.registry} href="#registro"><i><Shield /></i>Comprueba su registro en Utah<Arrow /></a>
        <p className={h.fine}>Henry Orellana no es abogado y no puede dar asesoría legal.</p>
      </div>
    </div>
  </section>;
}
