/* ============================================================
   Páginas legales — plantilla con la identidad del sitio
   Cabecera navy (como la portada) + página de papel para leer.
   ============================================================ */
import type { ReactNode } from "react";
import Link from "next/link";
import LpHeader from "@/components/home/LpHeader";
import SiteFooter from "@/components/home/SiteFooter";

interface LegalPageProps {
  kicker: string;
  title: string;
  intro: string;
  updated: string;
  /** enlace a la otra página legal */
  sibling: { href: string; label: string };
  children: ReactNode;
}

/** Marca visible para datos que la empresa debe completar. */
export function Fill({ children }: { children: ReactNode }) {
  return <mark className="legal__fill">[COMPLETAR: {children}]</mark>;
}

export default function LegalPage({ kicker, title, intro, updated, sibling, children }: LegalPageProps) {
  return (
    <div className="lp legal">
      <LpHeader />
      <section className="legal__hero">
        <div className="lp-wrap">
          <span className="lp-eyebrow lp-eyebrow--gold">{kicker}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <span className="legal__updated">Última actualización: {updated}</span>
        </div>
      </section>
      <section className="lp-paper legal__body">
        <div className="lp-wrap">
          <article className="legal__doc">{children}</article>
          <nav className="legal__nav" aria-label="Otras páginas legales">
            <Link href={sibling.href}>{sibling.label} →</Link>
            <Link href="/">Volver al inicio</Link>
          </nav>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
