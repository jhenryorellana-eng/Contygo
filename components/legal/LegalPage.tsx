/* ============================================================
   Páginas legales — plantilla con la identidad del sitio
   Cabecera navy (como la portada) + página de papel para leer.
   ============================================================ */
import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { LegalBlock, LegalDoc } from "@/lib/legal/types";
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

/** **negrita**, `código` y [etiqueta](enlace) del texto versionado (lib/legal/*.ts) → elementos. Nada de HTML crudo. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]}>{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function Block({ block }: { block: LegalBlock }) {
  if ("h" in block) return <h2>{inline(block.h)}</h2>;
  if ("box" in block) return <div className="legal__box"><p>{inline(block.box)}</p></div>;
  if ("ul" in block) return <ul>{block.ul.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>;
  return <p>{inline(block.p)}</p>;
}

/** La página completa a partir de su documento versionado. */
export function LegalDocPage({ doc, sibling }: { doc: LegalDoc; sibling: LegalPageProps["sibling"] }) {
  return (
    <LegalPage kicker="Legal" title={doc.title} intro={doc.intro} updated={doc.updated} sibling={sibling}>
      {doc.blocks.map((block, index) => <Block key={index} block={block} />)}
    </LegalPage>
  );
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
