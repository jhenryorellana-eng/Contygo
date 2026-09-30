/* ============================================================
   /terminos — Términos y Condiciones
   Texto base en español claro con los datos de USA LATINO PRIME LLC.
   Un abogado con licencia debe revisarlo antes de darlo por definitivo.
   ============================================================ */
import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { WHATSAPP_DISPLAY } from "@/lib/config";

const UPDATED = "2 de septiembre de 2026";

export const metadata: Metadata = {
  title: "Términos y Condiciones — USA Latino Prime",
  description:
    "Condiciones de uso de la plataforma de USA Latino Prime: una empresa de tecnología y servicios administrativos que te ayuda a llevar tu propio trámite migratorio. No somos un bufete ni damos asesoría legal.",
  alternates: { canonical: "/terminos" },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Términos y Condiciones"
      intro="Lo que puedes esperar de UsaLatinoPrime, lo que no hacemos, y lo que necesitamos de ti para que tu trámite salga ordenado. Lee esto antes de usar la plataforma."
      updated={UPDATED}
      sibling={{ href: "/privacidad", label: "Política de Privacidad" }}
    >
      <h2>1. Qué es UsaLatinoPrime (y qué no es)</h2>
      <div className="legal__box">
        <p>
          <strong>UsaLatinoPrime es una empresa de tecnología y servicios administrativos.</strong> No somos un
          bufete de abogados, no somos abogados, no damos asesoría legal ni recomendaciones legales, y usar la
          plataforma <strong>no crea una relación abogado-cliente</strong>.
        </p>
      </div>
      <p>
        Lo que sí hacemos: organizamos y preparamos documentos, apoyamos con traducciones y te guiamos para que
        lleves <strong>tu propio trámite</strong> de forma ordenada desde la plataforma. Las decisiones sobre tu caso
        son siempre tuyas, y en todo momento tienes derecho a consultar a un abogado con licencia.
      </p>
      <p>
        Estos Términos regulan el uso del sitio <strong>usalatinoprime.com</strong> y de la plataforma operada por{" "}
        <strong>USA LATINO PRIME LLC</strong>, con domicilio en 10951 N. Town Center Drive, Highland, Utah 84003 (en adelante,
        &quot;UsaLatinoPrime&quot;, &quot;nosotros&quot;). Al usar el sitio o contratar un servicio aceptas estos
        Términos. Si no estás de acuerdo con alguna parte, no uses la plataforma.
      </p>

      <h2>2. Alcance de los servicios</h2>
      <p>Ofrecemos dos cosas que se complementan:</p>
      <ul>
        <li>
          <strong>Una plataforma tecnológica de autogestión:</strong> te guía paso a paso para reunir tu información
          y tus documentos, valida que no falten datos y te muestra en qué punto va tu trámite.
        </li>
        <li>
          <strong>Servicios administrativos de apoyo:</strong> organización de documentos, traducciones y orientación
          sobre cómo usar la plataforma, con acompañamiento de nuestro equipo en los momentos que importan.
        </li>
      </ul>
      <p>
        Los trámites que hoy puedes gestionar con apoyo de la plataforma son: Visa Juvenil (SIJS), Petición I-360,
        I-485 (Ajuste de Estatus), Asilo Político, Reforzar Asilo, Apelación ante el BIA, Cambio de Corte, ITIN
        Number y Declaración de Impuestos. En todos los casos <strong>el trámite lo gestionas tú</strong>; nosotros
        aportamos la herramienta y el apoyo administrativo. Podemos añadir, modificar o retirar servicios en cualquier
        momento; el alcance concreto de cada servicio contratado se detalla en su contrato o descripción.
      </p>

      <h2>3. No damos asesoría legal</h2>
      <p>
        Nada de lo que encuentres en el sitio, en la plataforma, en nuestros mensajes o en las respuestas de nuestro
        asistente automático constituye asesoría legal. Explicamos en qué consiste un trámite, qué requisitos generales
        tiene y cómo organizar tus documentos; <strong>no evaluamos la estrategia legal de tu caso</strong> ni te decimos
        qué te conviene legalmente. Si necesitas una opinión legal, consulta a un abogado con licencia: es tu derecho y
        te lo recomendamos siempre que tengas dudas sobre tu situación.
      </p>

      <h2>4. Tus responsabilidades</h2>
      <ul>
        <li>
          <strong>Información verdadera:</strong> eres responsable de que todos los datos y documentos que aportas sean
          ciertos, completos y estén actualizados.
        </li>
        <li>
          <strong>Revisión antes de firmar o presentar:</strong> debes leer y revisar cada documento antes de firmarlo o
          presentarlo ante cualquier autoridad. Lo que se presenta lo presentas tú.
        </li>
        <li>
          <strong>Tus credenciales:</strong> guarda con cuidado tu acceso a la plataforma y no lo compartas. Eres
          responsable de lo que se haga desde tu cuenta.
        </li>
        <li>
          <strong>Uso correcto:</strong> no uses la plataforma para fines ilegales, para suplantar a otra persona ni para
          interferir con su funcionamiento.
        </li>
      </ul>

      <h2>5. Herramientas automatizadas</h2>
      <p>
        Nuestra tecnología, incluidas las herramientas automatizadas y de inteligencia artificial,{" "}
        <strong>no inventa ni genera información nueva sobre tu caso</strong>. Únicamente organiza, estructura y da
        formato a la información y los documentos que tú proporcionas. El resultado es un{" "}
        <strong>borrador administrativo</strong> que tú revisas y apruebas. Nuestro asistente automático (&quot;Prime&quot;)
        orienta sobre el uso de la plataforma y sus servicios; no es abogado y sus respuestas no son asesoría legal.
      </p>

      <h2>6. Pagos y honorarios</h2>
      <p>
        Los precios, formas de pago y condiciones de cada servicio se rigen por el contrato o la descripción de ese
        servicio, que aceptas al contratarlo. Las <strong>tarifas oficiales del gobierno</strong> (por ejemplo, las que
        cobran USCIS, las cortes o el IRS) son independientes de nuestros honorarios y{" "}
        <strong>no son reembolsables una vez presentadas</strong>. Las condiciones de reembolso de nuestros propios
        honorarios, cuando existan, se indican en el contrato de cada servicio.
      </p>

      <h2>7. Decisiones y plazos de las autoridades</h2>
      <p>
        Las decisiones sobre cada trámite y sus tiempos dependen únicamente de las autoridades del gobierno (USCIS,
        las cortes de inmigración, el IRS y otras), nunca de nosotros. <strong>No garantizamos resultados ni plazos</strong>.
        Que un trámite se prepare de forma ordenada mejora la experiencia, pero no asegura una decisión favorable.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        En la medida en que la ley aplicable lo permita, UsaLatinoPrime no será responsable de daños indirectos,
        pérdida de oportunidades ni consecuencias derivadas de decisiones de las autoridades, de información inexacta
        o incompleta aportada por el usuario, de documentos presentados sin revisar, o de fallos ajenos a nuestro
        control (por ejemplo, interrupciones de internet o de proveedores). Nuestra responsabilidad total frente a un
        usuario no excederá el importe que ese usuario haya pagado por el servicio en cuestión.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        El sitio, la plataforma, su diseño, textos, marcas, logotipos, videos y software son propiedad de
        UsaLatinoPrime o de sus licenciantes y están protegidos por las leyes de propiedad intelectual. Puedes usarlos
        para gestionar tu propio trámite; no puedes copiarlos, redistribuirlos ni usarlos con fines comerciales sin
        nuestro permiso por escrito. Los documentos e información que aportas siguen siendo tuyos.
      </p>

      <h2>10. Cambios a estos Términos</h2>
      <p>
        Podemos actualizar estos Términos cuando cambie el servicio o la normativa. Publicaremos la versión vigente en
        esta página con su fecha de actualización. Si el cambio es relevante, te lo avisaremos por los canales que
        tengamos contigo. Seguir usando la plataforma después de un cambio significa que lo aceptas.
      </p>

      <h2>11. Ley aplicable y contacto</h2>
      <p>
        Estos Términos se rigen por las leyes del estado de Utah, Estados Unidos, sin
        perjuicio de los derechos que te correspondan como consumidor en tu lugar de residencia. Cualquier controversia
        intentaremos resolverla primero de buena fe; si no es posible, se someterá a los tribunales competentes de{" "}
        Highland, Utah.
      </p>
      <p>
        Contacto: <a href="mailto:henryorellana@usalatinoprime.com">henryorellana@usalatinoprime.com</a> · WhatsApp {WHATSAPP_DISPLAY} ·{" "}
        10951 N. Town Center Drive, Highland, Utah 84003.
      </p>
    </LegalPage>
  );
}
