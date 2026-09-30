/* ============================================================
   LP — CTA final: banda navy con resplandor dorado
   ============================================================ */
import Link from "next/link";
import { Ico } from "../icons";
import WhatsAppLink from "../WhatsAppLink";

export default function CtaBand() {
  return (
    <section className="lp-cta lp-section">
      <div className="lp-wrap lp-cta__in" data-reveal>
        <span className="lp-eyebrow lp-eyebrow--gold">Empieza hoy</span>
        <h2>
          Tu trámite empieza hoy, <em>desde tu celular</em>
        </h2>
        <p>Elige tu servicio y descubre en minutos si calificas. Sin citas, sin filas, sin miles de dólares.</p>
        <div className="lp-cta__row">
          <Link className="lp-btn lp-btn--gold" href="/#servicios">
            Elegir mi trámite {Ico.arrow}
          </Link>
          <WhatsAppLink
            className="lp-btn lp-btn--line"
            message="Hola, quiero información sobre sus servicios migratorios."
          >
            {Ico.whatsapp} Hablar con el equipo
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
