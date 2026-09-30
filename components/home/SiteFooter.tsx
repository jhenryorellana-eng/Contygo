/* ============================================================
   LP — Footer
   ============================================================ */
import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { Ico } from "../icons";
import WhatsAppLink from "../WhatsAppLink";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__in">
        <div className="lp-footer__brand">
          <span className="lp-footer__logo">
            <Image src="/logo.png" alt="USA Latino Prime" width={53} height={42} />
          </span>
          <p>
            Plataforma digital de inmigración. Llevas tu propio trámite desde el celular, con
            nuestro equipo a tu lado.
          </p>
        </div>
        <nav className="lp-footer__col" aria-label="Servicios">
          <h4>Servicios</h4>
          {SERVICES.slice(0, 5).map((s) => (
            <Link key={s.id} href={`/${s.slug}`}>
              {s.name}
            </Link>
          ))}
          <Link href="/#servicios">Ver todos los servicios</Link>
        </nav>
        <div className="lp-footer__col">
          <h4>Contacto</h4>
          <WhatsAppLink
            className="lp-footer__wa"
            message="Hola, quiero información sobre sus servicios migratorios."
          >
            {Ico.whatsapp} Escríbenos por WhatsApp
          </WhatsAppLink>
          <Link href="/califica">Califica nuestro servicio</Link>
        </div>
      </div>
      <div className="lp-footer__bottom">
        <span>© {year} USA Latino Prime — Todos los derechos reservados</span>
        <span className="lp-footer__legal">
          <Link href="/terminos">Términos y Condiciones</Link>
          <Link href="/privacidad">Política de Privacidad</Link>
        </span>
      </div>
    </footer>
  );
}
