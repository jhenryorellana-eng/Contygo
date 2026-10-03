/* ============================================================
   /terminos — Términos y Condiciones (texto versionado)
   ContyGo, marca de USA LATINO PRIME LLC (la entidad legal es la LLC;
   ContyGo es la marca del producto).
   APROBADO POR EL DUEÑO el 2026-10-03 (versión terminos-web-2026-10-03): cualquier cambio de texto pide nueva aprobación y nueva versión.
   REGLA: si cambia una sola palabra de este archivo (o de privacidad.ts, o del texto de la casilla
   en lib/contygo-api/terms.ts), sube CONTRACT_TERMS.version en el mismo cambio y actualiza la huella
   de tests/contygo-api.test.cjs: lo que la persona aceptó debe poder probarse después.
   Contacto: solo el WhatsApp único de la empresa y contygo.app (decisión del dueño, 02-10-2026).
   ============================================================ */
import { WHATSAPP_DISPLAY } from "@/lib/config";
import type { LegalDoc } from "./types";

export const TERMINOS: LegalDoc = {
  metaTitle: "Términos y Condiciones — ContyGo",
  description: "Condiciones de uso de ContyGo, marca de USA LATINO PRIME LLC: una plataforma de tecnología y servicios administrativos que te ayuda a llevar tu propio trámite migratorio. No somos un despacho de abogados ni damos asesoría legal.",
  canonical: "/terminos",
  title: "Términos y Condiciones",
  intro: "Lo que puedes esperar de ContyGo, lo que no hacemos, y lo que necesitamos de ti para que tu trámite salga ordenado. Lee esto antes de usar el sitio o contratar un servicio.",
  updated: "2 de octubre de 2026",
  blocks: [
  { h: "1. Quiénes somos y qué es este sitio" },
  { box: "**ContyGo no es un despacho de abogados y no ofrece asesoría legal.** No somos abogados y usar el sitio o la plataforma **no crea una relación abogado-cliente**." },
  { p: "**ContyGo es una marca de USA LATINO PRIME LLC**, con domicilio en 10951 N. Town Center Drive, Highland, Utah 84003. USA LATINO PRIME LLC es la empresa que responde legalmente por el servicio; ContyGo es el nombre con el que lo ofrecemos (en adelante, \"ContyGo\", \"nosotros\")." },
  { p: "Este sitio es la puerta de entrada: te presenta los servicios, te ayuda a revisar tu situación con unas preguntas sencillas y te permite iniciar tu contratación. **Tu cuenta, tu caso y tu contrato se crean y se firman en la plataforma ContyGo (contygo.app)**. Al usar el sitio o contratar un servicio aceptas estos Términos; si no estás de acuerdo, no lo uses." },
  { h: "2. Alcance de los servicios" },
  { p: "Ofrecemos dos cosas que se complementan:" },
  { ul: [
    "**Una plataforma tecnológica de autogestión:** te guía paso a paso para reunir tu información y tus documentos, valida que no falten datos y te muestra en qué punto va tu trámite.",
    "**Servicios administrativos de apoyo:** organización de documentos, traducciones y orientación sobre cómo usar la plataforma.",
  ] },
  { p: "Los servicios disponibles, su alcance y sus condiciones son los que se muestran en el catálogo de ContyGo en el momento de contratar. En todos los casos **el trámite lo gestionas tú**; nosotros aportamos la herramienta y el apoyo administrativo. Podemos añadir, modificar o retirar servicios en cualquier momento." },
  { h: "3. No damos asesoría legal" },
  { p: "Nada de lo que encuentres en el sitio, en la plataforma, en nuestros mensajes o en las respuestas de nuestro asistente automático constituye asesoría legal. Explicamos en qué consiste un trámite, qué requisitos generales tiene y cómo organizar tus documentos; **no evaluamos la estrategia legal de tu caso** ni te decimos qué te conviene legalmente. Las preguntas de revisión del sitio son una orientación general y no sustituyen la opinión de un abogado. Si necesitas una opinión legal, consulta a un abogado con licencia: es tu derecho y te lo recomendamos siempre que tengas dudas sobre tu situación." },
  { h: "4. Cómo se contrata" },
  { ul: [
    "**Tus datos:** para contratar nos das tu nombre, correo, teléfono (de Estados Unidos), dirección y, si el servicio lo requiere, los datos de otras personas del caso. Debes tener permiso para compartir los datos de esas personas.",
    "**Verificación:** ContyGo te envía a tu correo un código de verificación para confirmar que el correo es tuyo.",
    "**Contrato:** ContyGo prepara el contrato de tu servicio y te envía a tu correo un enlace para firmarlo. El contrato se firma en ContyGo y es el que rige tu servicio.",
    "**Precios:** el precio que ves en el sitio sale del catálogo vigente de ContyGo. El precio y las condiciones que valen son los del contrato que firmas.",
  ] },
  { h: "5. Tus responsabilidades" },
  { ul: [
    "**Información verdadera:** eres responsable de que todos los datos y documentos que aportas sean ciertos, completos y estén actualizados.",
    "**Revisión antes de firmar o presentar:** debes leer y revisar cada documento antes de firmarlo o presentarlo ante cualquier autoridad. Lo que se presenta lo presentas tú.",
    "**Tus credenciales y códigos:** guarda con cuidado tu acceso, tus códigos de verificación y tus enlaces de firma, y no los compartas. Eres responsable de lo que se haga con ellos.",
    "**Uso correcto:** no uses el sitio para fines ilegales, para suplantar a otra persona ni para interferir con su funcionamiento.",
  ] },
  { h: "6. Herramientas automatizadas" },
  { p: "Nuestra tecnología, incluidas las herramientas automatizadas y de inteligencia artificial, **no inventa ni genera información nueva sobre tu caso**. Organiza, estructura y da formato a la información que tú proporcionas. Los asistentes automáticos del sitio (de texto y de voz) orientan sobre el uso del sitio y de los servicios; no son abogados y sus respuestas no son asesoría legal." },
  { h: "7. Pagos y tarifas del gobierno" },
  { p: "Los precios, formas de pago y condiciones de cada servicio se rigen por el contrato de ese servicio. Las **tarifas oficiales del gobierno** (por ejemplo, las que cobran USCIS, las cortes o el IRS) son independientes de nuestros honorarios y **no son reembolsables una vez presentadas**. Las condiciones de reembolso de nuestros honorarios, cuando existan, se indican en el contrato." },
  { h: "8. Decisiones y plazos de las autoridades" },
  { p: "Las decisiones sobre cada trámite y sus tiempos dependen únicamente de las autoridades del gobierno (USCIS, las cortes de inmigración, el IRS y otras), nunca de nosotros. **No garantizamos resultados ni plazos**. Que un trámite se prepare de forma ordenada mejora la experiencia, pero no asegura una decisión favorable." },
  { h: "9. Limitación de responsabilidad" },
  { p: "En la medida en que la ley aplicable lo permita, ContyGo y USA LATINO PRIME LLC no serán responsables de daños indirectos, pérdida de oportunidades ni consecuencias derivadas de decisiones de las autoridades, de información inexacta o incompleta aportada por el usuario, de documentos presentados sin revisar, o de fallos ajenos a nuestro control (por ejemplo, interrupciones de internet o de proveedores). Nuestra responsabilidad total frente a un usuario no excederá el importe que ese usuario haya pagado por el servicio en cuestión." },
  { h: "10. Propiedad intelectual" },
  { p: "El sitio, la plataforma, su diseño, textos, marcas, logotipos, videos y software son propiedad de USA LATINO PRIME LLC o de sus licenciantes y están protegidos por las leyes de propiedad intelectual. Puedes usarlos para gestionar tu propio trámite; no puedes copiarlos, redistribuirlos ni usarlos con fines comerciales sin nuestro permiso por escrito. Los documentos e información que aportas siguen siendo tuyos." },
  { h: "11. Cambios a estos Términos" },
  { p: "Podemos actualizar estos Términos cuando cambie el servicio o la normativa. Publicaremos la versión vigente en esta página con su fecha de actualización. Seguir usando el sitio después de un cambio significa que lo aceptas." },
  { h: "12. Ley aplicable y contacto" },
  { p: "Estos Términos se rigen por las leyes del estado de Utah, Estados Unidos, sin perjuicio de los derechos que te correspondan como consumidor en tu lugar de residencia. Cualquier controversia intentaremos resolverla primero de buena fe; si no es posible, se someterá a los tribunales competentes de Highland, Utah." },
  { p: "Contacto: WhatsApp " + WHATSAPP_DISPLAY + " · [contygo.app](https://contygo.app) · USA LATINO PRIME LLC, 10951 N. Town Center Drive, Highland, Utah 84003." },
  ],
};
