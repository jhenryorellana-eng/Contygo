/* eslint-disable @next/next/no-img-element */
import { SERVICES } from "@/lib/services";
import ServiceLink from "../ServiceLink";
import WhatsAppLink from "../WhatsAppLink";
import ServicesMotion from "./ServicesMotion";
import styles from "./ServicesSection.module.css";

const AREAS = [
  {
    id: "juvenil", eyebrow: "Jóvenes y familias",
    services: ["visa-juvenil", "i-360"],
  },
  {
    id: "residencia", eyebrow: "Residencia permanente",
    services: ["i-485"],
  },
  {
    id: "asilo", eyebrow: "Protección migratoria",
    services: ["asilo", "reforzar-asilo"],
  },
  {
    id: "corte", eyebrow: "Corte de inmigración",
    services: ["apelacion", "cambio-corte"],
  },
  {
    id: "impuestos", eyebrow: "Servicios fiscales",
    services: ["itin", "impuestos"],
  },
];

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>;
}

function imageSizes(id: string) {
  const wide = id === "corte" || id === "impuestos";
  return `(max-width: 640px) calc(100vw - 40px), (max-width: 900px) ${id === "impuestos" ? "89vw" : "44vw"}, (max-width: 1440px) ${wide ? "44vw" : "29vw"}, ${wide ? "628px" : "412px"}`;
}

export default function ServicesSection() {
  return (
    <section id="servicios" className={styles.section} aria-labelledby="services-heading">
      <div className={styles.wrap}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}><span aria-hidden="true">★</span> Nuestros servicios</p>
            <h2 id="services-heading">¿Qué necesitas<br /><em>resolver hoy?</em></h2>
          </div>
          <div className={styles.intro}>
            <p>Elige tu situación y descubre<br className={styles.desktopBreak} /> cómo podemos ayudarte.</p>
            <span className={styles.assurance}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10 3 3 7-7" /><circle cx="10" cy="10" r="8" /></svg>
              Evaluación gratuita <span aria-hidden="true">·</span> En español
            </span>
          </div>
        </header>

        <ServicesMotion>
          {AREAS.map(area => (
            <div key={area.id} className={styles.cardSlot} data-service-motion>
              <article className={[styles.card, styles[area.id]].filter(Boolean).join(" ")} aria-labelledby={`area-${area.id}`}>
                <div className={styles.visual}>
                  <img className={styles.photo} src={`/services-images/${area.id}-1200.webp`}
                    srcSet={`/services-images/${area.id}-720.webp 720w, /services-images/${area.id}-1200.webp 1200w`}
                    sizes={imageSizes(area.id)} width={1200} height={800} alt="" loading="lazy" decoding="async" />
                  <div className={styles.shade} />
                  <div className={styles.cardCopy}>
                    <p id={`area-${area.id}`} className={styles.cardEyebrow}>{area.eyebrow}</p>
                  </div>
                </div>
                <div className={styles.actions}>
                  {area.services.map(id => {
                    const service = SERVICES.find(item => item.id === id)!;
                    return <ServiceLink key={id} href={`/${service.slug}`} video={service.video}
                      className={styles.action} aria-labelledby={`service-${id}`} aria-describedby={`service-detail-${id}`}>
                      <div className={styles.actionCopy}>
                        <h3 id={`service-${id}`} className={styles.actionLabel}>{service.name}</h3>
                        <p id={`service-detail-${id}`} className={styles.actionDetail}>{service.tagline}</p>
                      </div>
                      <span className={styles.actionArrow}><Arrow /></span>
                    </ServiceLink>;
                  })}
                </div>
              </article>
            </div>
          ))}
        </ServicesMotion>

        <div className={styles.guidance}>
          <span className={styles.guidanceStar} aria-hidden="true">★</span>
          <div className={styles.guidanceCopy}>
            <p>¿No sabes cuál elegir?</p>
            <span>Cuéntanos tu situación. Te ayudamos a encontrar por dónde empezar.</span>
          </div>
          <WhatsAppLink className={styles.guidanceLink} message="Hola, no tengo claro qué servicio necesito. Quisiera orientación sobre mi situación.">
            Ayúdame a elegir <Arrow />
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
