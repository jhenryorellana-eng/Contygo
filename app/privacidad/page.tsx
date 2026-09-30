/* ============================================================
   /privacidad — Política de Privacidad
   Declara SOLO lo que el sitio hace de verdad (revisado en el código):
   Meta Pixel + Conversions API, cookie propia ulp_vid, asistente Prime
   (Google Gemini), reseñas (Supabase), alojamiento (Vercel), WhatsApp.
   Datos de USA LATINO PRIME LLC ya incluidos. Un abogado con licencia
   debe revisar el texto antes de darlo por definitivo.
   ============================================================ */
import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { WHATSAPP_DISPLAY } from "@/lib/config";

const UPDATED = "2 de septiembre de 2026";

export const metadata: Metadata = {
  title: "Política de Privacidad — USA Latino Prime",
  description:
    "Qué datos recoge USA Latino Prime, para qué los usa y con quién los comparte. No vendemos datos personales; solo los usamos para organizar y preparar tu trámite y operar el servicio.",
  alternates: { canonical: "/privacidad" },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Política de Privacidad"
      intro="Qué datos recogemos, para qué los usamos y con quién los compartimos, dicho sin rodeos. Tu información es tuya: la usamos solo para organizar y preparar tu trámite y para operar el servicio."
      updated={UPDATED}
      sibling={{ href: "/terminos", label: "Términos y Condiciones" }}
    >
      <h2>1. Quién trata tus datos</h2>
      <p>
        El responsable del tratamiento es <strong>USA LATINO PRIME LLC</strong>, con domicilio en{" "}
        10951 N. Town Center Drive, Highland, Utah 84003 (&quot;UsaLatinoPrime&quot;, &quot;nosotros&quot;). Somos una empresa de
        tecnología y servicios administrativos: no somos un bufete ni damos asesoría legal. Esta política aplica al
        sitio <strong>usalatinoprime.com</strong> y a la plataforma con la que gestionas tu trámite.
      </p>

      <h2>2. Qué datos recogemos</h2>
      <p>
        <strong>En el sitio web (la landing)</strong> recogemos muy poco: no te pedimos registro y el contacto
        principal es por WhatsApp. Lo que sí puede ocurrir en el sitio:
      </p>
      <ul>
        <li>
          <strong>Asistente automático &quot;Prime&quot;:</strong> si le escribes o le hablas, tratamos el texto de tus
          mensajes o el audio de tu voz para responderte (ver sección 4). No tienes que dar tu nombre para usarlo.
        </li>
        <li>
          <strong>Reseñas:</strong> si decides dejar una opinión en la página &quot;Califica nuestro servicio&quot;,
          guardamos el nombre que escribas, tu comentario, la calificación y, si lo indicas, el servicio que usaste.
          Las reseñas se revisan antes de publicarse y se muestran públicamente en el sitio con ese nombre.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador, y páginas visitadas, que se
          generan al navegar (registros del servidor, medición de campañas y límites de uso del asistente).
        </li>
      </ul>
      <p>
        <strong>En la plataforma</strong> (cuando contratas y gestionas un trámite) tratamos los datos y documentos que
        tú decides compartir para prepararlo: identificación, documentos migratorios y de tu caso, información de
        contacto y datos de pago. Solo pedimos lo necesario para el trámite que gestionas.
      </p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Organizar, estructurar y preparar tu trámite, y darte apoyo administrativo.</li>
        <li>Operar el servicio: atenderte, responder tus dudas, procesar pagos y notificarte avances.</li>
        <li>Publicar tu reseña, si nos la dejas, una vez aprobada.</li>
        <li>Medir el rendimiento de nuestros anuncios y mejorar el sitio (ver sección 6).</li>
        <li>Cumplir obligaciones legales y proteger el servicio frente a usos indebidos.</li>
      </ul>
      <div className="legal__box">
        <p>
          <strong>No vendemos tus datos personales</strong> ni los compartimos con terceros para que te hagan
          marketing.
        </p>
      </div>

      <h2>4. Tratamiento con herramientas automatizadas</h2>
      <p>
        Usamos tecnología automatizada, incluida inteligencia artificial, para organizar la información. Estas
        herramientas <strong>solo procesan tu información para estructurarla y darle formato</strong>; no generan
        contenido nuevo sobre tu caso ni toman decisiones por ti. Tú revisas y apruebas el resultado.
      </p>
      <p>
        El asistente <strong>Prime</strong> funciona con el modelo de lenguaje Gemini, de Google. Cuando le escribes,
        el texto de la conversación se envía a los servidores de Google para generar la respuesta; cuando lo llamas por
        voz, tu audio se transmite en tiempo real con el mismo fin. No guardamos las conversaciones de Prime en nuestros
        servidores: la conversación escrita se conserva solo en tu propio navegador mientras dura tu visita, y la
        llamada de voz no se graba ni se almacena. No compartas datos sensibles (como tu número de seguro social o de
        extranjero) con el asistente; no los necesita.
      </p>

      <h2>5. Con quién compartimos datos</h2>
      <p>
        Solo con proveedores estrictamente necesarios para operar, que tratan los datos siguiendo nuestras instrucciones
        y bajo obligaciones de confidencialidad:
      </p>
      <ul>
        <li>
          <strong>Alojamiento web y del servidor:</strong> Vercel (sitio y servicio).
        </li>
        <li>
          <strong>Base de datos de reseñas:</strong> Supabase.
        </li>
        <li>
          <strong>Asistente automático:</strong> Google (modelo Gemini), como se explica en la sección 4.
        </li>
        <li>
          <strong>Medición de anuncios:</strong> Meta (Facebook / Instagram), como se explica en la sección 6.
        </li>
        <li>
          <strong>Mensajería:</strong> WhatsApp, cuando eliges escribirnos por ese canal (aplica su propia política).
        </li>
        <li>
          <strong>Procesamiento de pagos:</strong> Stripe, que recibe los
          datos de pago directamente; nosotros no almacenamos los números completos de tu tarjeta.
        </li>
      </ul>
      <p>
        También podríamos compartir datos si una ley o una autoridad nos lo exige. Nunca con terceros para marketing.
      </p>

      <h2>6. Cookies y medición de campañas</h2>
      <p>Esto es lo que el sitio usa realmente:</p>
      <ul>
        <li>
          <strong>Meta Pixel y Conversions API:</strong> usamos estas herramientas de Meta para saber si nuestros
          anuncios funcionan (por ejemplo, cuántas personas que vieron un anuncio llegaron a escribirnos). El Pixel puede
          colocar las cookies <code>_fbp</code> y <code>_fbc</code>, y nosotros creamos una cookie propia,{" "}
          <code>ulp_vid</code>, con un identificador aleatorio de tu visita. Enviamos a Meta ese identificador (de forma
          cifrada irreversible), tu dirección IP y el tipo de navegador, junto con la acción realizada (por ejemplo,
          &quot;vio un servicio&quot; o &quot;hizo clic en WhatsApp&quot;). Meta trata esa información según su propia
          política de privacidad. Puedes limitar la publicidad personalizada desde la configuración de tu cuenta de
          Facebook o Instagram, y bloquear cookies desde tu navegador.
        </li>
        <li>
          <strong>Preferencia de consentimiento:</strong> en los países donde se muestra un aviso de cookies, tu
          elección se guarda en tu navegador (<code>meta_consent</code>) para no volver a preguntarte.
        </li>
        <li>
          <strong>Asistente Prime:</strong> la conversación escrita se guarda en el almacenamiento de sesión de tu
          navegador, solo en tu dispositivo, y se borra al cerrar la pestaña.
        </li>
        <li>
          <strong>Asesora asignada:</strong> cuando tocas un botón de WhatsApp, te asignamos una persona de nuestro
          equipo por turno y guardamos esa asignación en la cookie <code>ulp_adv</code> durante 30 días, para que
          siempre te atienda la misma asesora. No contiene datos personales tuyos.
        </li>
        <li>
          <strong>Panel interno:</strong> una cookie de sesión (<code>ulp_admin</code>) que solo usa nuestro equipo para
          moderar reseñas y ver el reparto de contactos; no afecta a los visitantes.
        </li>
      </ul>
      <p>
        No usamos otras herramientas de analítica ni cookies de seguimiento. Las tipografías del sitio se sirven desde
        nuestro propio servidor, sin llamadas a terceros.
      </p>

      <h2>7. Seguridad y conservación</h2>
      <p>
        Protegemos tus datos con medidas técnicas y organizativas razonables: conexiones cifradas (HTTPS), acceso
        restringido a la información y proveedores con estándares de seguridad reconocidos. Conservamos los datos de tu
        trámite mientras el caso lo requiera y durante el tiempo que la ley nos obligue; después los eliminamos o los
        anonimizamos. Las reseñas se conservan mientras estén publicadas o hasta que pidas retirarlas.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos, eliminarlos o retirar una reseña.
        Escríbenos a <a href="mailto:henryorellana@usalatinoprime.com">henryorellana@usalatinoprime.com</a> o por WhatsApp al {WHATSAPP_DISPLAY} y te
        responderemos en un plazo razonable. Podemos pedirte que verifiques tu identidad antes de atender la solicitud.
      </p>

      <h2>9. Menores de edad</h2>
      <p>
        El sitio y la plataforma están dirigidos a personas adultas. Algunos trámites (como la Visa Juvenil) implican
        información de menores: en esos casos, los datos los aporta y gestiona el padre, madre o tutor responsable.
        No recogemos a sabiendas datos de menores sin la participación de un adulto responsable.
      </p>

      <h2>10. Cambios a esta política</h2>
      <p>
        Si cambiamos la forma en que tratamos tus datos, actualizaremos esta página y su fecha. Si el cambio es
        importante, te lo avisaremos por los canales que tengamos contigo.
      </p>

      <h2>11. Contacto</h2>
      <p>
        <strong>USA LATINO PRIME LLC</strong> · 10951 N. Town Center Drive, Highland, Utah 84003 ·{" "}
        <a href="mailto:henryorellana@usalatinoprime.com">henryorellana@usalatinoprime.com</a> · WhatsApp {WHATSAPP_DISPLAY}.
      </p>
    </LegalPage>
  );
}
