"use client";

import Image from "next/image";
import Link from "next/link";
import { CONTYGO_SERVICES, type ContygoCategory } from "@/lib/contygo-catalog";
import { CONTYGO_DELIVERABLES } from "@/lib/contygo-deliverables";
import { getServicePresentationUrl } from "@/lib/contygo";
import { getServicePresentation } from "@/lib/contygo-presentation";
import s from "./ServiceOffer.module.css";

type ServiceOfferProps = {
  serviceId: string;
  onServiceChange: (id: string) => void;
};

const categories: { id: ContygoCategory; label: string; image: string }[] = [
  { id: "familia", label: "Familia", image: "/services-images/juvenil-1200.webp" },
  { id: "asilo", label: "Asilo", image: "/services-images/asilo-1200.webp" },
  { id: "corte", label: "Corte", image: "/services-images/corte-1200.webp" },
  { id: "fiscal", label: "Impuestos", image: "/services-images/impuestos-1200.webp" },
  { id: "empresa", label: "Empresa", image: "/contygo/empresa-editorial.webp" },
];

const steps = [
  { title: "Firma tu contrato.", copy: "Revisa el alcance y el plan antes de firmar." },
  { title: "Confirma tu pago inicial.", copy: "Tu proceso se activa cuando se confirma el primer pago." },
  { title: "Comparte tus documentos.", copy: "Aporta tu información y responde las preguntas del servicio." },
  { title: "Empieza la preparación.", copy: "Avanzamos en los documentos y entregables de tu servicio." },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Arrow() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Check() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Chevron() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CategoryIcon({ category }: { category: ContygoCategory }) {
  const paths = {
    familia: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v2" /></>,
    asilo: <><path d="M12 3 4 6v5c0 5 8 10 8 10s8-5 8-10V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    corte: <><path d="m3 8 9-5 9 5H3Zm0 13h18M5 11v6m7-6v6m7-6v6M3 18h18" /></>,
    fiscal: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6m-6 5h1m4 0h1m-6 4h1m4 0h1" /></>,
    empresa: <><rect x="3" y="7" width="18" height="14" rx="3" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a25 25 0 0 0 18 0m-9 0v4" /></>,
  };
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[category]}</svg>;
}

export default function ServiceOffer({ serviceId, onServiceChange }: ServiceOfferProps) {
  const service = CONTYGO_SERVICES.find(item => item.id === serviceId) ?? CONTYGO_SERVICES[0];
  const category = categories.find(item => item.id === service.category)!;
  const siblings = CONTYGO_SERVICES.filter(item => item.category === category.id);
  const guide = CONTYGO_DELIVERABLES[service.id];
  const outputs = guide?.outputs.length ? guide.outputs : service.includes;
  const presentationUrl = getServicePresentationUrl(service.id)!;

  function chooseCategory(id: ContygoCategory) {
    const first = CONTYGO_SERVICES.find(item => item.category === id);
    if (first) onServiceChange(first.id);
  }

  return <div className={s.offer}>
    <section id="servicios" className={s.services} aria-labelledby="service-offer-heading">
      <span id="resumen-oferta" className={s.anchor} aria-hidden="true" />
      <header className={s.introduction} data-story-reveal>
        <div><span className={s.eyebrow}>12 SERVICIOS. TU SIGUIENTE PASO.</span><h2 id="service-offer-heading">Cada servicio,<br />{" "}un camino <em>claro.</em></h2></div>
        <p>Encuentra lo que necesitas. Mira qué incluye y conoce el proceso antes de empezar.</p>
      </header>

      <div className={s.categoryRail} role="group" aria-label="Categorías de servicios">
        {categories.map(item => <button key={item.id} type="button" className={s.categoryButton} aria-label={item.label} aria-pressed={category.id === item.id} aria-controls="offer-service-list service-offer-detail" onClick={() => chooseCategory(item.id)}><CategoryIcon category={item.id} /><span>{item.label}</span><small>{CONTYGO_SERVICES.filter(candidate => candidate.category === item.id).length}</small></button>)}
      </div>

      <div className={s.explorer}>
        <aside className={s.serviceNavigation}>
          <div className={s.listHeading}><span>{category.label}</span><p>Elige tu servicio</p></div>
          <div id="offer-service-list" className={s.serviceList} role="group" aria-label={`Servicios de ${category.label}`}>
            {siblings.map(item => <button key={item.id} type="button" aria-label={`Elegir servicio: ${item.name}`} aria-pressed={item.id === service.id} aria-controls="service-offer-detail service-offer-price" onClick={() => onServiceChange(item.id)}><span>{item.name}</span><Arrow /></button>)}
          </div>
          <p className={s.selectionNote}>Cada etapa puede necesitar un servicio distinto. Aquí puedes revisar su alcance.</p>
        </aside>

        <article key={service.id} id="service-offer-detail" className={s.activeService} aria-labelledby="active-service-heading">
          <header className={s.showcase}>
            <Image className={s.showcaseImage} src={category.image} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1280px) 68vw, 830px" />
            <div className={s.showcaseShade} />
            <div className={s.showcaseContent}>
              <span className={s.categoryLabel}><span />{category.label} · ContyGo</span>
              <h3 id="active-service-heading">{service.name}</h3>
              <p>{service.description}</p>
              <Link href={presentationUrl} className={s.introLink} aria-label={`Conocer este servicio: ${service.name}`} onClick={() => onServiceChange(service.id)}>Conocer este servicio <Arrow /></Link>
            </div>
            <span className={s.imageAccent} aria-hidden="true"><CategoryIcon category={category.id} /></span>
          </header>

          <div className={s.serviceContent}>
            <div className={s.audience}><span>PARA QUIÉN ES</span><p>{service.audience}</p></div>
            <section className={s.deliverables} aria-labelledby="offer-deliverables-heading">
              <div className={s.deliverablesHeading}><span className={s.eyebrow}>CONOCE LAS PIEZAS DE TU PROCESO</span><h4 id="offer-deliverables-heading">Lo que prepararemos.</h4></div>
              <ul className={s.outputs}>{outputs.map(output => <li key={output}><span className={s.outputCheck}><Check /></span><span>{output}</span></li>)}</ul>
            </section>
            <div className={s.moreInformation}>
              <details className={s.disclosure} aria-label="Documentación orientativa">
                <summary><span>Qué necesitarás aportar</span><Chevron /></summary>
                <div className={s.disclosureContent}>{guide?.documents.length > 0 && <ul>{guide.documents.map(document => <li key={document}>{document}</li>)}</ul>}<p>{guide?.documentNote ?? "Los documentos que corresponden a tu servicio se confirman en ContyGo según tu paquete y tu caso."}</p></div>
              </details>
              <details className={s.disclosure} aria-label="Alcance completo y límites">
                <summary><span>Alcance completo y límites</span><Chevron /></summary>
                <div className={s.disclosureContent}><h4>Incluido en el servicio</h4><ul>{service.includes.map(item => <li key={item}>{item}</li>)}</ul><h4>Ten en cuenta</h4><ul>{service.exclusions.map(item => <li key={item}>{item}</li>)}</ul></div>
              </details>
            </div>
          </div>
        </article>
      </div>

      <section id="como-funciona" className={s.process} aria-labelledby="offer-process-heading">
        <div className={s.processHeading}><span className={s.eyebrow}>SABES QUÉ SIGUE</span><h3 id="offer-process-heading">Cuatro pasos para empezar.</h3></div>
        <ol className={s.steps}>{steps.map((step, index) => <li key={step.title}><span className={s.stepNumber}>0{index + 1}</span><div><h4>{step.title}</h4><p>{step.copy}</p></div></li>)}</ol>
      </section>
    </section>

    <section id="precio" className={s.pricing} aria-labelledby="offer-price-heading">
      <div className={s.pricingInner}>
        <div key={service.id} id="service-offer-price" className={s.priceCard}>
          <header className={s.priceIntroduction}><span className={s.eyebrowLight}>EL PRECIO, CON EL ALCANCE CLARO</span><h2 id="offer-price-heading">Tu siguiente<br />paso, <em>ContyGo.</em></h2><span className={s.selectedLabel}>SERVICIO ELEGIDO</span><h3>{service.name}</h3><p>{service.plans.length > 1 ? "Compara los paquetes. Confirmarás tu elección en ContyGo." : "Estos son los honorarios del paquete disponible."}</p></header>
          <div className={s.priceDetails}>
            <div className={s.plans} data-multiple={service.plans.length > 1 || undefined}>{service.plans.map(plan => <div className={s.plan} key={plan.name}><h4>{plan.name}</h4><p>{money.format(plan.price)} <span>USD</span></p></div>)}</div>
            <p className={s.fees}>Tasas gubernamentales aparte. El precio vigente y las opciones de pago se confirman en ContyGo antes de firmar.</p>
            <Link href={presentationUrl} className={s.continueLink} aria-label={`Ver presentación y continuar: ${service.name}`} onClick={() => onServiceChange(service.id)}>Ver presentación y continuar <Arrow /></Link>
            <p className={s.contractNote}>{getServicePresentation(service.id) ? "Conoce el servicio en video." : "Consulta el resumen del servicio."} Después crearás tu cuenta y revisarás tu contrato en ContyGo.</p>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

