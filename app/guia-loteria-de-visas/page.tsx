/* ============================================================
   /guia-loteria-de-visas — la guía gratuita de la Lotería de Visas DV-2027 (26-10-2026).
   Es el camino «Hazlo tú gratis» del cierre de su guía (lib/agent/lottery-intake.ts) y una página para buscadores.
   El contenido vive en lib/loteria-guide.ts; las fuentes, en docs/loteria-dv-2027.md.
   ============================================================ */
import type { Metadata } from "next";
import Link from "next/link";
import { crmWaLink } from "@/lib/config";
import { whatsappLotteryMessage } from "@/lib/contygo-api/messages";
import { DV_OFFICIAL_URL } from "@/lib/agent/lottery-intake";
import { LOTTERY_AFTER, LOTTERY_COUNTRIES, LOTTERY_FORM_STEPS, LOTTERY_GUIDE_UPDATED, LOTTERY_KEY_FACTS, LOTTERY_NEEDS, LOTTERY_PHOTO_RULES, LOTTERY_SCAMS } from "@/lib/loteria-guide";
import s from "./guia.module.css";

const title = "Lotería de Visas DV-2027: guía gratis para inscribirte tú mismo · ContyGo";
const description = "Quién puede participar, qué documentos y fotos necesitas y el paso a paso para inscribirte gratis en la Lotería de Visas DV-2027 en el sitio oficial. Para Perú y toda Latinoamérica.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guia-loteria-de-visas" },
  robots: { index: true, follow: true },
  openGraph: { title, description, url: "/guia-loteria-de-visas", type: "article", locale: "es_US", siteName: "ContyGo", images: [{ url: "/contygo/compartir/loteria-dv-2027.jpg", width: 1200, height: 630, alt: "Lotería de Visas DV-2027" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/contygo/compartir/loteria-dv-2027.jpg"] },
};

function Check() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Cross() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function LotteryGuidePage() {
  const helpHref = crmWaLink(whatsappLotteryMessage());
  return <main className={s.page}>
    <header className={s.top}>
      <Link href="/" className={s.logo} aria-label="ContyGo · Inicio"><img src="/contygo/brand/logo-dark.png" alt="ContyGo" width={150} height={42} /></Link>
      <Link href="/loteria-de-visas" className={s.topLink}>Ver la guía en vídeo</Link>
    </header>

    <section className={s.hero}>
      <span className={s.eyebrow}>Gratis · Para Perú y toda Latinoamérica</span>
      <h1>Lotería de Visas DV-2027: inscríbete tú mismo, paso a paso</h1>
      <p className={s.lead}>Cada año Estados Unidos sortea visas de residencia para personas de países con pocos inmigrantes. Aquí tienes todo lo que necesitas para inscribirte gratis en el sitio oficial, sin intermediarios.</p>
      <ul className={s.facts}>{LOTTERY_KEY_FACTS.map(fact => <li key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></li>)}</ul>
      <div className={s.actions}>
        <a className={s.primary} href={DV_OFFICIAL_URL} target="_blank" rel="noopener noreferrer">Ir al sitio oficial <Arrow /></a>
        <Link className={s.secondary} href="/loteria-de-visas">¿Puedo participar? Pregúntale al asistente</Link>
      </div>
      <p className={s.notice}>Fechas según una orden judicial del 14 de octubre de 2026; pueden cambiar. Confírmalas en el anuncio oficial del Departamento de Estado.</p>
    </section>

    <section className={s.section}>
      <h2>1. ¿Puedo participar?</h2>
      <p>Cuenta el <strong>país donde naciste</strong>, no tu nacionalidad ni dónde vives hoy. Además necesitas <strong>secundaria completa</strong>, o <strong>dos años de experiencia</strong> en los últimos cinco en un oficio que requiera formación.</p>
      <div className={s.countries}>
        <div><h3>Pudieron participar en la edición anterior</h3><ul className={s.yes}>{LOTTERY_COUNTRIES.yes.map(country => <li key={country}><Check />{country}</li>)}</ul></div>
        <div><h3>No pudieron participar</h3><ul className={s.no}>{LOTTERY_COUNTRIES.no.map(country => <li key={country}><Cross />{country}</li>)}</ul></div>
      </div>
      <p className={s.small}>Si naciste en un país que no participa, puedes usar el país de nacimiento de tu cónyuge. La lista oficial de la DV-2027 la publica el Departamento de Estado.</p>
    </section>

    <section className={s.section}>
      <h2>2. Lo que necesitas antes de empezar</h2>
      <div className={s.cards}>{LOTTERY_NEEDS.map(need => <article key={need.title}><h3>{need.title}</h3><p>{need.text}</p></article>)}</div>
    </section>

    <section className={s.section}>
      <h2>3. La foto: la razón número uno de descalificación</h2>
      <ul className={s.rules}>{LOTTERY_PHOTO_RULES.map(rule => <li key={rule}><Check />{rule}</li>)}</ul>
    </section>

    <section className={s.section}>
      <h2>4. El formulario oficial, paso a paso</h2>
      <ol className={s.steps}>{LOTTERY_FORM_STEPS.map((step, index) => <li key={step.title}><b>{index + 1}</b><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
    </section>

    <section className={s.section}>
      <h2>5. Después de enviar</h2>
      <ul className={s.plain}>{LOTTERY_AFTER.map(item => <li key={item}>{item}</li>)}</ul>
    </section>

    <section className={`${s.section} ${s.alert}`}>
      <h2>Cuidado con las estafas</h2>
      <ul className={s.plain}>{LOTTERY_SCAMS.map(item => <li key={item}>{item}</li>)}</ul>
    </section>

    <section className={s.help}>
      <h2>¿Prefieres que lo hagamos por ti?</h2>
      <p>ContyGo revisa tus fotos y tus datos, envía tu inscripción y te entrega tu número de confirmación. Te atendemos por WhatsApp, en español.</p>
      <a className={s.primary} href={helpHref} target="_blank" rel="noopener noreferrer">Que ContyGo lo haga por mí <Arrow /></a>
    </section>

    <footer className={s.footer}>
      <p>ContyGo, marca de USA LATINO PRIME LLC, no es el gobierno de Estados Unidos ni está afiliada a él, y no es un bufete de abogados. Esta guía resume las instrucciones oficiales del Programa de Visas de Diversidad; las reglas que valen son las del Departamento de Estado. Nadie puede garantizar la selección.</p>
      <p>Actualizada el {LOTTERY_GUIDE_UPDATED}.</p>
    </footer>
  </main>;
}
