/* ============================================================
   /privacidad — Política de Privacidad
   ContyGo, marca de USA LATINO PRIME LLC (la entidad legal es la LLC).
   Declara SOLO lo que el sitio hace de verdad (revisado en el código):
   preguntas de elegibilidad, formulario de contratación (envío a contygo.app),
   asistente de texto y voz (Google Gemini), Cloudflare Turnstile, Vercel,
   Meta Pixel + Conversions API (con consentimiento), reseñas (Supabase).
   PENDIENTE DE APROBACIÓN LEGAL DEL DUEÑO. Un abogado con licencia debe
   revisar el texto antes de darlo por definitivo.
   ============================================================ */
import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { WHATSAPP_DISPLAY } from "@/lib/config";

const UPDATED = "2 de octubre de 2026";

export const metadata: Metadata = {
  title: "Política de Privacidad — ContyGo",
  description:
    "Qué datos recoge ContyGo (marca de USA LATINO PRIME LLC), para qué los usa y con quién los comparte. No vendemos datos personales; solo los usamos para revisar tu situación, crear tu cuenta, tu caso y tu contrato, y operar el servicio.",
  alternates: { canonical: "/privacidad" },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Política de Privacidad"
      intro="Qué datos recogemos, para qué los usamos y con quién los compartimos, dicho sin rodeos. Tu información es tuya: la usamos solo para revisar tu situación, preparar tu contratación y operar el servicio."
      updated={UPDATED}
      sibling={{ href: "/terminos", label: "Términos y Condiciones" }}
    >
      <h2>1. Quién trata tus datos</h2>
      <p>
        <strong>ContyGo es una marca de USA LATINO PRIME LLC</strong>, con domicilio en 10951 N. Town Center Drive,
        Highland, Utah 84003. USA LATINO PRIME LLC es la empresa responsable del tratamiento de tus datos
        (&quot;ContyGo&quot;, &quot;nosotros&quot;). Somos una empresa de tecnología y servicios administrativos: no somos un
        despacho de abogados ni damos asesoría legal. Esta política aplica a este sitio y al envío de tus datos a la
        plataforma ContyGo (<strong>contygo.app</strong>).
      </p>

      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li>
          <strong>Preguntas de revisión (elegibilidad):</strong> tus respuestas, incluidas fechas (por ejemplo, de
          nacimiento o de un hecho de tu caso) y el estado de EE. UU. que indicas, para decirte cómo seguir.
        </li>
        <li>
          <strong>Datos de contratación:</strong> nombre, correo, teléfono, dirección y, si el servicio lo requiere,
          los datos de otras personas del caso, <strong>incluidos menores de edad</strong> (por ejemplo, su fecha de
          nacimiento). Quien los aporta declara tener la facultad de hacerlo.
        </li>
        <li>
          <strong>Asistente automático (texto y voz):</strong> si le escribes o le hablas, tratamos el texto de tus
          mensajes o el audio de tu voz para responderte (ver sección 5).
        </li>
        <li>
          <strong>Contacto por WhatsApp:</strong> si dejas tu teléfono, o nos escribes por WhatsApp, usamos ese
          número para responderte sobre tu trámite.
        </li>
        <li>
          <strong>Reseñas:</strong> si dejas una opinión en &quot;Califica nuestro servicio&quot;, guardamos el nombre
          que escribas, tu comentario y la calificación. Se revisan antes de publicarse.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador y páginas visitadas, que se
          generan al navegar (registros del servidor, protección contra abuso y medición de campañas).
        </li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Revisar tu situación con las preguntas de elegibilidad y mostrarte los servicios que podrían corresponderte.</li>
        <li>Crear tu cuenta, abrir tu caso y preparar el contrato del servicio en la plataforma ContyGo.</li>
        <li>Operar el servicio: atenderte, responder tus dudas y notificarte avances.</li>
        <li>Proteger el sitio frente a spam y usos indebidos, y cumplir obligaciones legales.</li>
        <li>Medir el rendimiento de nuestros anuncios y mejorar el sitio (ver sección 6).</li>
      </ul>
      <div className="legal__box">
        <p>
          <strong>No vendemos tus datos personales</strong> ni los compartimos con terceros para que te hagan
          marketing.
        </p>
      </div>

      <h2>4. Envío de tus datos a la plataforma ContyGo</h2>
      <p>
        Cuando contratas, el sitio envía tus datos a la plataforma ContyGo (<strong>contygo.app</strong>) para crear
        tu cuenta, tu caso y tu contrato. Es ContyGo quien te envía a tu correo el <strong>código de verificación</strong>{" "}
        y el <strong>enlace para firmar</strong> el contrato. A partir de ahí, ContyGo conserva esa información dentro
        de tu cuenta y de tu caso mientras la relación continúe y durante el tiempo que la ley nos obligue; después la
        elimina o la anonimiza. Este sitio no guarda tu formulario de contratación en una base de datos propia.
      </p>

      <h2>5. Tratamiento con herramientas automatizadas</h2>
      <p>
        Usamos tecnología automatizada, incluida inteligencia artificial, para organizar la información y orientarte.
        Estas herramientas no toman decisiones por ti ni generan contenido nuevo sobre tu caso; tú revisas y apruebas el
        resultado.
      </p>
      <p>
        Los asistentes del sitio funcionan con el modelo de lenguaje <strong>Gemini, de Google</strong>. Cuando
        escribes, el texto de la conversación (y las respuestas de la revisión de tu situación) se envía a los
        servidores de Google para generar la respuesta; cuando usas la voz, tu audio se transmite con el mismo fin. No
        guardamos las conversaciones en nuestros servidores y la voz no se graba. No compartas con el asistente datos
        sensibles (como tu número de seguro social o de extranjero); no los necesita.
      </p>

      <h2>6. Con quién compartimos datos y qué herramientas usamos</h2>
      <p>
        Solo con proveedores necesarios para operar, que tratan los datos bajo nuestras instrucciones y obligaciones de
        confidencialidad:
      </p>
      <ul>
        <li>
          <strong>Plataforma ContyGo (contygo.app):</strong> recibe los datos de tu contratación (sección 4).
        </li>
        <li>
          <strong>Vercel:</strong> aloja el sitio y guarda registros técnicos del servidor (por ejemplo, IP y
          errores).
        </li>
        <li>
          <strong>Cloudflare Turnstile:</strong> comprobación anti-spam en el formulario de contratación; puede analizar
          señales de tu navegador para distinguir a una persona de un robot.
        </li>
        <li>
          <strong>Google (Gemini):</strong> asistente de texto y voz, como se explica en la sección 5.
        </li>
        <li>
          <strong>Meta Pixel y Conversions API:</strong> solo con tu consentimiento donde se pide. Sirven para saber si
          nuestros anuncios funcionan. El Pixel puede colocar las cookies <code>_fbp</code> y <code>_fbc</code>, y
          nosotros creamos una cookie propia, <code>ulp_vid</code>, con un identificador aleatorio de tu visita. Enviamos
          a Meta ese identificador (cifrado de forma irreversible), tu IP y el tipo de navegador, junto con la acción
          realizada (por ejemplo, &quot;vio un servicio&quot;). Meta lo trata según su propia política. Tu elección se
          guarda en tu navegador (<code>meta_consent</code>).
        </li>
        <li>
          <strong>Supabase:</strong> base de datos de las reseñas y del panel interno.
        </li>
        <li>
          <strong>WhatsApp:</strong> cuando eliges escribirnos por ese canal (aplica su propia política).
        </li>
      </ul>
      <p>También podríamos compartir datos si una ley o una autoridad nos lo exige.</p>

      <h2>7. Seguridad y conservación</h2>
      <p>
        Protegemos tus datos con medidas técnicas y organizativas razonables: conexiones cifradas (HTTPS), acceso
        restringido y proveedores con estándares de seguridad reconocidos. Los datos de tu caso se conservan en la
        plataforma ContyGo mientras el caso lo requiera y durante el tiempo que la ley nos obligue. Las reseñas se
        conservan mientras estén publicadas o hasta que pidas retirarlas.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos o eliminarlos, o retirar una reseña.
        Escríbenos por WhatsApp al {WHATSAPP_DISPLAY} o desde <a href="https://contygo.app">contygo.app</a> y te
        responderemos en un plazo razonable. Podemos pedirte que verifiques tu identidad antes de atender la solicitud.
      </p>

      <h2>9. Menores de edad</h2>
      <p>
        El sitio está dirigido a personas adultas. Algunos trámites (como la Visa Juvenil) implican información de
        menores: en esos casos, los datos los aporta y gestiona el padre, madre o tutor responsable. No recogemos a
        sabiendas datos de menores sin la participación de un adulto responsable.
      </p>

      <h2>10. Cambios a esta política</h2>
      <p>
        Si cambiamos la forma en que tratamos tus datos, actualizaremos esta página y su fecha. Si el cambio es
        importante, te lo avisaremos por los canales que tengamos contigo.
      </p>

      <h2>11. Contacto</h2>
      {/* TODO (dueño): si ContyGo tiene un correo de privacidad propio, añadirlo aquí; no se inventa ninguno. */}
      <p>
        <strong>USA LATINO PRIME LLC</strong> (ContyGo) · 10951 N. Town Center Drive, Highland, Utah 84003 · WhatsApp{" "}
        {WHATSAPP_DISPLAY} · <a href="https://contygo.app">contygo.app</a>.
      </p>
    </LegalPage>
  );
}
