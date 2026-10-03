/* ============================================================
   /terminos — Términos y Condiciones
   ContyGo, marca de USA LATINO PRIME LLC (la entidad legal es la LLC;
   ContyGo es la marca del producto).
   PENDIENTE DE APROBACIÓN LEGAL DEL DUEÑO. Un abogado con licencia debe
   revisarlo antes de darlo por definitivo. Si cambia el texto de la casilla
   de aceptación (lib/contygo-api/terms.ts), cambia también su versión.
   ============================================================ */
import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { WHATSAPP_DISPLAY } from "@/lib/config";

const UPDATED = "2 de octubre de 2026";

export const metadata: Metadata = {
  title: "Términos y Condiciones — ContyGo",
  description:
    "Condiciones de uso de ContyGo, marca de USA LATINO PRIME LLC: una plataforma de tecnología y servicios administrativos que te ayuda a llevar tu propio trámite migratorio. No somos un despacho de abogados ni damos asesoría legal.",
  alternates: { canonical: "/terminos" },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Términos y Condiciones"
      intro="Lo que puedes esperar de ContyGo, lo que no hacemos, y lo que necesitamos de ti para que tu trámite salga ordenado. Lee esto antes de usar el sitio o contratar un servicio."
      updated={UPDATED}
      sibling={{ href: "/privacidad", label: "Política de Privacidad" }}
    >
      <h2>1. Quiénes somos y qué es este sitio</h2>
      <div className="legal__box">
        <p>
          <strong>ContyGo no es un despacho de abogados y no ofrece asesoría legal.</strong> No somos abogados y usar el
          sitio o la plataforma <strong>no crea una relación abogado-cliente</strong>.
        </p>
      </div>
      <p>
        <strong>ContyGo es una marca de USA LATINO PRIME LLC</strong>, con domicilio en 10951 N. Town Center Drive,
        Highland, Utah 84003. USA LATINO PRIME LLC es la empresa que responde legalmente por el servicio; ContyGo es el
        nombre con el que lo ofrecemos (en adelante, &quot;ContyGo&quot;, &quot;nosotros&quot;).
      </p>
      <p>
        Este sitio es la puerta de entrada: te presenta los servicios, te ayuda a revisar tu situación con unas preguntas
        sencillas y te permite iniciar tu contratación. <strong>Tu cuenta, tu caso y tu contrato se crean y se firman en
        la plataforma ContyGo (contygo.app)</strong>. Al usar el sitio o contratar un servicio aceptas estos Términos; si
        no estás de acuerdo, no lo uses.
      </p>

      <h2>2. Alcance de los servicios</h2>
      <p>Ofrecemos dos cosas que se complementan:</p>
      <ul>
        <li>
          <strong>Una plataforma tecnológica de autogestión:</strong> te guía paso a paso para reunir tu información y
          tus documentos, valida que no falten datos y te muestra en qué punto va tu trámite.
        </li>
        <li>
          <strong>Servicios administrativos de apoyo:</strong> organización de documentos, traducciones y orientación
          sobre cómo usar la plataforma.
        </li>
      </ul>
      <p>
        Los servicios disponibles, su alcance y sus condiciones son los que se muestran en el catálogo de ContyGo en el
        momento de contratar. En todos los casos <strong>el trámite lo gestionas tú</strong>; nosotros aportamos la
        herramienta y el apoyo administrativo. Podemos añadir, modificar o retirar servicios en cualquier momento.
      </p>

      <h2>3. No damos asesoría legal</h2>
      <p>
        Nada de lo que encuentres en el sitio, en la plataforma, en nuestros mensajes o en las respuestas de nuestro
        asistente automático constituye asesoría legal. Explicamos en qué consiste un trámite, qué requisitos generales
        tiene y cómo organizar tus documentos; <strong>no evaluamos la estrategia legal de tu caso</strong> ni te
        decimos qué te conviene legalmente. Las preguntas de revisión del sitio son una orientación general y no
        sustituyen la opinión de un abogado. Si necesitas una opinión legal, consulta a un abogado con licencia: es tu
        derecho y te lo recomendamos siempre que tengas dudas sobre tu situación.
      </p>

      <h2>4. Cómo se contrata</h2>
      <ul>
        <li>
          <strong>Tus datos:</strong> para contratar nos das tu nombre, correo, teléfono (de Estados Unidos), dirección
          y, si el servicio lo requiere, los datos de otras personas del caso. Debes tener permiso para compartir los
          datos de esas personas.
        </li>
        <li>
          <strong>Verificación:</strong> ContyGo te envía a tu correo un código de verificación para confirmar que el
          correo es tuyo.
        </li>
        <li>
          <strong>Contrato:</strong> ContyGo prepara el contrato de tu servicio y te envía a tu correo un enlace para
          firmarlo. El contrato se firma en ContyGo y es el que rige tu servicio.
        </li>
        <li>
          <strong>Precios:</strong> el precio que ves en el sitio sale del catálogo vigente de ContyGo. El precio y las
          condiciones que valen son los del contrato que firmas.
        </li>
      </ul>

      <h2>5. Tus responsabilidades</h2>
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
          <strong>Tus credenciales y códigos:</strong> guarda con cuidado tu acceso, tus códigos de verificación y tus
          enlaces de firma, y no los compartas. Eres responsable de lo que se haga con ellos.
        </li>
        <li>
          <strong>Uso correcto:</strong> no uses el sitio para fines ilegales, para suplantar a otra persona ni para
          interferir con su funcionamiento.
        </li>
      </ul>

      <h2>6. Herramientas automatizadas</h2>
      <p>
        Nuestra tecnología, incluidas las herramientas automatizadas y de inteligencia artificial,{" "}
        <strong>no inventa ni genera información nueva sobre tu caso</strong>. Organiza, estructura y da formato a la
        información que tú proporcionas. Los asistentes automáticos del sitio (de texto y de voz) orientan sobre el uso
        del sitio y de los servicios; no son abogados y sus respuestas no son asesoría legal.
      </p>

      <h2>7. Pagos y tarifas del gobierno</h2>
      <p>
        Los precios, formas de pago y condiciones de cada servicio se rigen por el contrato de ese servicio. Las{" "}
        <strong>tarifas oficiales del gobierno</strong> (por ejemplo, las que cobran USCIS, las cortes o el IRS) son
        independientes de nuestros honorarios y <strong>no son reembolsables una vez presentadas</strong>. Las
        condiciones de reembolso de nuestros honorarios, cuando existan, se indican en el contrato.
      </p>

      <h2>8. Decisiones y plazos de las autoridades</h2>
      <p>
        Las decisiones sobre cada trámite y sus tiempos dependen únicamente de las autoridades del gobierno (USCIS, las
        cortes de inmigración, el IRS y otras), nunca de nosotros. <strong>No garantizamos resultados ni plazos</strong>.
        Que un trámite se prepare de forma ordenada mejora la experiencia, pero no asegura una decisión favorable.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        En la medida en que la ley aplicable lo permita, ContyGo y USA LATINO PRIME LLC no serán responsables de daños
        indirectos, pérdida de oportunidades ni consecuencias derivadas de decisiones de las autoridades, de información
        inexacta o incompleta aportada por el usuario, de documentos presentados sin revisar, o de fallos ajenos a
        nuestro control (por ejemplo, interrupciones de internet o de proveedores). Nuestra responsabilidad total frente
        a un usuario no excederá el importe que ese usuario haya pagado por el servicio en cuestión.
      </p>

      <h2>10. Propiedad intelectual</h2>
      <p>
        El sitio, la plataforma, su diseño, textos, marcas, logotipos, videos y software son propiedad de USA LATINO
        PRIME LLC o de sus licenciantes y están protegidos por las leyes de propiedad intelectual. Puedes usarlos para
        gestionar tu propio trámite; no puedes copiarlos, redistribuirlos ni usarlos con fines comerciales sin nuestro
        permiso por escrito. Los documentos e información que aportas siguen siendo tuyos.
      </p>

      <h2>11. Cambios a estos Términos</h2>
      <p>
        Podemos actualizar estos Términos cuando cambie el servicio o la normativa. Publicaremos la versión vigente en
        esta página con su fecha de actualización. Seguir usando el sitio después de un cambio significa que lo aceptas.
      </p>

      <h2>12. Ley aplicable y contacto</h2>
      <p>
        Estos Términos se rigen por las leyes del estado de Utah, Estados Unidos, sin perjuicio de los derechos que te
        correspondan como consumidor en tu lugar de residencia. Cualquier controversia intentaremos resolverla primero
        de buena fe; si no es posible, se someterá a los tribunales competentes de Highland, Utah.
      </p>
      {/* TODO (dueño): si ContyGo tiene un correo de contacto propio, añadirlo aquí; no se inventa ninguno. */}
      <p>
        Contacto: WhatsApp {WHATSAPP_DISPLAY} · <a href="https://contygo.app">contygo.app</a> · USA LATINO PRIME LLC,
        10951 N. Town Center Drive, Highland, Utah 84003.
      </p>
    </LegalPage>
  );
}
