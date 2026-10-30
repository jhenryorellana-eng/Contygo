/* ============================================================
   El guion de cada servicio (21-10-2026): la conversación completa del asistente.
   Además de las preguntas que exige contygo (y de las entrevistas propias de Visa Juvenil, Ajuste,
   Reforzamiento de Asilo y Preparación de audiencia), cada servicio tiene las preguntas que el equipo
   necesita para entender el caso y las dudas habituales con su respuesta comprobada.
   · Las preguntas del guion llevan claves «<servicio>.…»: viven en el navegador y nunca viajan a contygo
     (ni a la elegibilidad ni al lead). Las de contygo siguen decidiendo si se puede contratar en línea.
   · start: antes de las preguntas de contygo; end: después.
   · Las dudas habituales se suman a lo que sabe el bot y las ofrece al final («Mucha gente pregunta…»).
   ============================================================ */
import type { IntakeQuestion, ServiceAnswers } from "./service-intake";
import type { Faq } from "./service-faq";
import { SKIPPED } from "./answer-summary";

export interface ScriptQuestion extends IntakeQuestion { position: "start" | "end" }
export interface ServiceScript {
  questions: ScriptQuestion[];
  /** The usual doubts, answered from the sources (they join the bot's knowledge). */
  doubts: Faq[];
  /** How the bot names the usual doubts when it offers them at the end («cuánto tarda», «qué documentos necesitas»…). */
  topics: string[];
}

const yesno = (id: string, text: string, position: ScriptQuestion["position"] = "end"): ScriptQuestion => ({ id, kind: "yesno", text, position });
const free = (id: string, text: string, position: ScriptQuestion["position"] = "end"): ScriptQuestion => ({ id, kind: "text", text, position });
const choice = (id: string, text: string, labels: string[], position: ScriptQuestion["position"] = "end"): ScriptQuestion =>
  ({ id, kind: "choice", text, position, options: labels.map((label, index) => ({ code: `op${index + 1}`, label })) });
const date = (id: string, text: string, dateMode: "past" | "birthdate", position: ScriptQuestion["position"] = "end"): ScriptQuestion => ({ id, kind: "date", dateMode, text, position });

/*
 * Fuentes (21-10-2026, investigación sobre las guías de la plataforma): x-legal/docs/guides/*.md (eoir-26, escrito de apelación,
 * eoir-26a, eoir-33, moción de cambio de sede, moción de reapertura, memorándum de miedo creíble, i-360, i-485, visa juvenil,
 * preparación de audiencia, i-765), x-legal/docs/_evidence/reapertura, x-legal-guias-app/docs/guias/familias/documentos.md,
 * lib/contygo-catalog.ts, lib/contygo-deliverables.ts, lib/agent/service-faq.ts y los vídeos de cada servicio. Lo que no tenía
 * fuente no está: el bot dice que no lo sabe y ofrece WhatsApp. De dinero no se habla (25-10-2026): el precio y las formas de pago están en el vídeo del proceso.
 */
const SCRIPTS: Readonly<Record<string, ServiceScript>> = {
  apelacion: {
    questions: [
      choice("apelacion.forma_decision", "¿El juez te dio la decisión en la audiencia, o te llegó por correo?", ["En la audiencia, de palabra", "Me llegó por correo", "No sé"]),
      choice("apelacion.tipo_decision", "¿Qué decidió el juez: negó tu asilo u ordenó tu deportación, negó una fianza, o fue otra cosa?", ["Negó mi asilo u ordenó mi deportación", "Negó mi fianza", "Negó una moción de reapertura", "Otra cosa o no sé"]),
      yesno("apelacion.tiene_orden", "¿Tienes la decisión u orden escrita del juez?"),
      yesno("apelacion.familiares", "En tu caso con el juez, ¿hay familiares, como tu pareja o tus hijos, que también quieren apelar?"),
      yesno("apelacion.salio_del_pais", "Desde la decisión del juez, ¿has salido de Estados Unidos?"),
    ],
    topics: ["cuánto tiempo tiene para apelar", "qué le preparamos", "qué documentos necesita"],
    doubts: [
      { question: "¿Cuánto tiempo tengo para apelar?", answer: "El plazo es corto: la BIA debe recibir la apelación dentro de los 30 días siguientes a la decisión, y cuenta el día en que llega, no el de envío. Conviene empezar cuanto antes." },
      { question: "¿Desde cuándo cuenta el plazo?", answer: "Desde la decisión del juez en la audiencia o, si te la mandaron por escrito, desde la fecha de envío de esa decisión." },
      { question: "¿Qué me preparan?", answer: "El formulario de apelación EOIR-26, la hoja con las razones de la apelación y la constancia de que se notificó al gobierno, con el paquete organizado." },
      { question: "¿Qué documentos necesito?", answer: "Por ejemplo, tu identificación, la decisión del juez y tu solicitud de asilo con sus anexos. ContyGo te confirma la lista." },
      { question: "¿Sirve si me negó USCIS y no un juez?", answer: "No, este servicio es solo para decisiones de un juez de inmigración; una negación de USCIS lleva otro trámite." },
      { question: "¿Puedo apelar con mi familia?", answer: "Solo forman parte de la apelación las personas que se incluyen en el formulario; una familia con el mismo caso puede apelar junta, en una sola apelación." },
      { question: "Si salgo del país, ¿pasa algo?", answer: "Salir de Estados Unidos antes de apelar puede hacer perder el derecho a la apelación. Antes de viajar, consúltalo con un asesor." },
    ],
  },
  "cambio-corte": {
    questions: [
      yesno("cambio-corte.se_mudo", "¿Te mudaste lejos de la corte donde está tu caso?", "start"),
      free("cambio-corte.ciudad_estado", "¿A qué ciudad y estado te mudaste? Solo la ciudad y el estado.", "start"),
      yesno("cambio-corte.prueba_direccion", "¿Tienes algún papel con tu nueva dirección, como un contrato de renta, un recibo o una carta de tu trabajo?"),
      yesno("cambio-corte.familiares", "¿Se mudaron contigo familiares que tienen su propio caso en la corte?"),
      yesno("cambio-corte.audiencia_virtual", "Si el juez no decide a tiempo, ¿quieres pedir asistir a tu audiencia por video o por teléfono?"),
    ],
    topics: ["si el cambio es automático", "si debe seguir yendo a su corte actual", "qué documentos necesita"],
    doubts: [
      { question: "¿Con esto ya me cambian de corte?", answer: "No es automático: el juez decide, y presentar la moción no garantiza que lo apruebe." },
      { question: "¿Sigo yendo a la corte de antes?", answer: "Sí. Hasta que el juez apruebe el cambio, sigue yendo a todas tus audiencias en la corte actual; faltar puede terminar en una orden de deportación en tu ausencia." },
      { question: "¿Qué incluye?", answer: "El formulario EOIR-33 de cambio de dirección, la moción de cambio de sede y la impresión y el envío a la corte y al fiscal, con seguimiento." },
      { question: "¿No basta con cambiar mi dirección?", answer: "No. El EOIR-33 cambia tu dirección, pero el caso se queda en la misma corte; para moverlo hace falta la moción." },
      { question: "¿Esto cambia mi dirección con USCIS o ICE?", answer: "No. Con USCIS se cambia aparte con el formulario AR-11, y a ICE se le avisa por su propio canal." },
      { question: "¿Hay un plazo para avisar que me mudé?", answer: "Sí: la nueva dirección se avisa a la corte dentro de los 5 días hábiles siguientes a la mudanza." },
      { question: "¿Qué documentos necesito?", answer: "Una prueba de tu nueva dirección, como un contrato de renta, un recibo o una carta de tu trabajo. Si está a nombre de otra persona, se explica en la moción." },
    ],
  },
  reapertura: {
    // El motivo ya lo preguntan las de contygo.
    questions: [
      date("reapertura.fecha_se_entero", "¿Cuándo te enteraste de que había una orden de deportación?", "past"),
      yesno("reapertura.tiene_pruebas", "¿Tienes algún papel que pruebe el motivo, como un informe médico, un certificado o el sobre que te devolvieron?"),
    ],
    topics: ["si hay un plazo", "qué motivos sirven", "si la deportación se detiene mientras tanto"],
    doubts: [
      { question: "¿Es una apelación?", answer: "No. Es una moción ante la misma corte que dio la orden, no ante la BIA." },
      { question: "¿Hay un plazo para pedir la reapertura?", answer: "Depende del motivo: por circunstancias excepcionales, como una enfermedad grave, hay 180 días desde la orden. Si no te llegó la notificación o estabas detenido, la ley no pone plazo." },
      { question: "¿Qué motivos sirven?", answer: "Por ejemplo: que no te llegó la notificación, que estabas detenido, que asististe y no lo registraron, una enfermedad grave, embarazo o parto, o la muerte o enfermedad grave de un familiar." },
      { question: "¿Me pueden deportar mientras tanto?", answer: "La norma que cita la moción dice que, al presentarla, la deportación queda en pausa mientras el juez decide. Tu situación concreta la revisa un asesor." },
      { question: "¿Qué me preparan?", answer: "Un cuestionario sobre el motivo y tus pruebas, la moción de reapertura, la constancia de notificación y la carátula, y el EOIR-26A cuando corresponda." },
      { question: "¿Qué documentos necesito?", answer: "La orden que dio el juez por tu ausencia y las pruebas del motivo." },
    ],
  },
  "reforzar-asilo": {
    // Su entrevista propia (lib/agent/asylum-intake.ts) ya pregunta lo necesario.
    questions: [],
    topics: ["si todavía está a tiempo", "qué incluye", "qué documentos necesita"],
    doubts: [
      { question: "¿Estoy a tiempo?", answer: "En la corte, las pruebas se entregan al menos 30 días antes de la audiencia de mérito; ante USCIS, 14 días antes de la entrevista." },
      { question: "Mi próxima audiencia es preliminar, ¿sirve?", answer: "Sí: todavía puedes reforzar tu caso antes de la audiencia final. Si estás detenido o el juez fijó otro plazo, vale el del juez." },
      { question: "¿Qué incluye?", answer: "La evaluación inicial, la revisión de tu I-589, tu declaración y tus pruebas, y el cuestionario y el memorándum de miedo creíble." },
      { question: "¿Tengo que comprar aparte la evaluación de asilo?", answer: "No, la evaluación inicial ya está incluida y el equipo la revisa antes del reforzamiento." },
      { question: "¿Me hacen un I-589 nuevo?", answer: "No, el servicio parte del I-589 que ya presentaste. Si todavía no lo presentaste, el servicio que te corresponde es Asilo Político." },
      { question: "¿Qué documentos necesito?", answer: "Una copia de tu I-589 con sus anexos, tu declaración y tus pruebas." },
    ],
  },
  asilo: {
    questions: [
      yesno("asilo.ya_presentado", "Para empezar, ¿ya presentaste antes una solicitud de asilo, el formulario I-589?", "start"),
      choice("asilo.ante_juez", "¿Tienes un caso abierto ante un juez de inmigración, por ejemplo una cita para la corte?", ["Sí, tengo caso en la corte", "No", "No sé"], "start"),
      free("asilo.fecha_llegada", "¿Cuándo llegaste por última vez a Estados Unidos? Si no recuerdas el día, dime el mes y el año.", "start"),
      choice("asilo.familia", "¿La solicitud sería solo para ti, o también para tu pareja o tus hijos?", ["Solo para mí", "Con mi pareja", "Con mis hijos", "Con mi pareja y mis hijos"], "start"),
      yesno("asilo.documentos", "¿Tienes tu pasaporte u otra identificación, y algún papel o prueba de lo que te pasó?", "start"),
    ],
    topics: ["qué incluye", "si puede incluir a su familia", "si le dan permiso de trabajo"],
    doubts: [
      { question: "¿Qué incluye?", answer: "El formulario I-589, la organización de tu declaración y tus pruebas, y el memorándum de miedo creíble con el expediente." },
      { question: "¿Qué documentos necesito?", answer: "Por ejemplo, tu identificación, tu historia, tus pruebas y tus documentos migratorios; la lista se confirma según tu caso." },
      { question: "Llegué hace más de un año, ¿todavía se puede?", answer: "La ley pone un plazo de un año para pedir asilo, con excepciones; el equipo lo revisa en tu caso." },
      { question: "¿Puedo incluir a mi familia?", answer: "Sí, la solicitud I-589 permite incluir a tu pareja y a tus hijos." },
      { question: "¿Me dan permiso de trabajo?", answer: "No está incluido en este servicio. Como regla, el permiso de trabajo se pide cuando pasaron al menos 150 días desde que recibieron tu I-589." },
      { question: "¿Me acompañan durante el proceso?", answer: "Sí: en la plataforma hay citas por video con el equipo para avanzar tu solicitud y tu memorándum." },
    ],
  },
  "evaluacion-asilo": {
    questions: [
      choice("evaluacion-asilo.estado_i589", "¿Ya presentaste tu solicitud de asilo, el I-589, o todavía no?", ["Ya la presenté", "Todavía no"], "start"),
      yesno("evaluacion-asilo.tiene_documentos", "¿Tienes los documentos de tu caso en el celular o en la computadora, para subirlos?", "start"),
      yesno("evaluacion-asilo.alcance", "Te cuento cómo es: un informe en PDF hecho con inteligencia artificial a partir de tus documentos, con un intento incluido, y no prepara tu solicitud. ¿Te sirve así?", "start"),
    ],
    topics: ["qué recibe", "si lo revisa una persona", "si puede repetirla"],
    doubts: [
      { question: "¿Qué recibo?", answer: "Un informe en PDF hecho con inteligencia artificial a partir de tus documentos, que ves desde tu cuenta." },
      { question: "¿Puedo repetirla?", answer: "Incluye un intento; el equipo puede darte uno extra, consúltalo con un asesor." },
      { question: "¿Lo revisa una persona?", answer: "No, el informe se entrega de forma automática. En el servicio Reforzar Asilo, en cambio, sí lo revisa el equipo." },
      { question: "¿Me dice si voy a ganar?", answer: "No; el informe no sustituye la asesoría legal ni garantiza un resultado." },
      { question: "¿Prepara mi solicitud de asilo?", answer: "No; para preparar tu solicitud está el servicio Asilo Político." },
      { question: "¿Qué tengo que subir?", answer: "La herramienta te indica qué documentos compartir." },
    ],
  },
  "preparacion-audiencia": {
    questions: [
      yesno("preparacion-audiencia.tiene_i589", "¿Tienes a mano tu solicitud de asilo, el I-589? Te la pediremos para preparar la sesión."),
    ],
    topics: ["si Henry es abogado", "qué sesión le corresponde", "si Henry va a la corte"],
    doubts: [
      { question: "¿Henry es abogado?", answer: "No. Henry es consultor migratorio certificado en Utah; la sesión es orientación personal, sin representación legal." },
      { question: "¿Cuál sesión me toca?", answer: "Si tu próxima audiencia es preliminar, la de la segunda audiencia; si es la de mérito, la de la tercera. Si no estás seguro, escríbele a Henry antes de reservar." },
      { question: "¿Qué hacemos en la sesión?", answer: "Son 45 minutos por videollamada en español: en la segunda repasan qué pasa ese día, ordenas tus preguntas y practicas; en la de mérito recorren tu historia y practicas las preguntas más difíciles." },
      { question: "¿Henry va a la corte conmigo?", answer: "No. Henry no representa ni comparece ante ningún tribunal, y no prepara documentos ni mociones." },
      { question: "¿Necesito abogado?", answer: "La sesión incluye orientación sobre cuándo conviene acudir a un abogado." },
    ],
  },
  "visa-juvenil": {
    questions: [
      choice("visa-juvenil.cuantos", "¿El trámite es para un menor, o para varios?", ["Para un menor", "Para dos", "Para tres o más"]),
    ],
    topics: ["qué incluye el servicio", "si sin papeles se puede", "si tiene que ir a la corte"],
    doubts: [
      { question: "¿Qué incluye el servicio?", answer: "Es un solo servicio, Premium: preparamos la custodia en la corte estatal, la petición I-360 y el ajuste de estatus I-485, todo en un mismo proceso." },
      { question: "¿Quién puede aplicar?", answer: "Entre los requisitos están vivir en Estados Unidos, estar soltero y presentar la petición antes de cumplir 21 años. La edad que acepta la corte depende del estado." },
      { question: "No tengo papeles, ¿igual se puede?", answer: "La falta de estatus del menor o del tutor no descarta por sí sola esta vía." },
      { question: "¿Necesito testigos?", answer: "No es obligatorio: el caso puede avanzar sin testigos. Si los hay, se prepara una declaración por cada uno." },
      { question: "¿Tengo que ir a la corte?", answer: "Primero se pide una orden a la corte estatal de tu localidad, normalmente de familia o de menores, y la audiencia puede ser breve. ContyGo prepara los documentos, pero no te representa." },
      { question: "¿Con el I-360 ya puede trabajar?", answer: "Para peticiones presentadas desde el 10 de mayo de 2026, USCIS ya no considera automáticamente la acción diferida, así que la aprobación del I-360 sola no da el permiso de trabajo." },
      { question: "¿Puedo incluir a varios hijos?", answer: "Sí, el caso admite uno o más menores, con una declaración por cada uno. Lo confirmas en tu contrato." },
      { question: "¿Cuánto tarda?", answer: "El tiempo de USCIS puede variar y nadie puede prometerte una fecha." },
    ],
  },
  "i-360": {
    questions: [
      yesno("i-360.orden_hallazgos", "Para empezar, ¿ya tienes la orden de la corte estatal con los hallazgos de visa juvenil? Una custodia común no basta.", "start"),
      choice("i-360.cuantos_menores", "¿Para cuántos menores es la petición?", ["Uno", "Dos", "Tres o más"], "start"),
      date("i-360.fecha_nacimiento", "¿Cuál es la fecha de nacimiento del menor? Si son varios, dime la del mayor.", "birthdate", "start"),
      yesno("i-360.soltero", "¿El menor sigue soltero?", "start"),
      yesno("i-360.corte_inmigracion", "¿El menor tiene un caso abierto en la corte de inmigración?", "start"),
      yesno("i-360.custodia_orr", "Cuando llegó, ¿el menor estuvo en un albergue del gobierno antes de vivir contigo?", "start"),
    ],
    topics: ["si su custodia le sirve", "si incluye la residencia", "hasta qué edad se puede presentar"],
    doubts: [
      { question: "Tengo la custodia del niño, ¿me sirve?", answer: "Una custodia común no basta. Se necesita la orden estatal que diga que no es viable reunirse con uno o ambos padres por abandono, maltrato o negligencia, y que regresar a su país no le conviene." },
      { question: "¿Incluye la residencia?", answer: "No. La custodia y el ajuste I-485 son etapas distintas de esta petición." },
      { question: "¿Hasta qué edad se puede presentar?", answer: "Antes de que el menor cumpla 21 años." },
      { question: "¿Qué documentos necesito?", answer: "Por ejemplo, la orden estatal certificada, el acta de nacimiento, fotos tipo pasaporte y un comprobante de domicilio. ContyGo confirma la lista de cada menor." },
      { question: "¿Con el I-360 puede trabajar?", answer: "Desde el 10 de mayo de 2026, USCIS ya no considera automáticamente la acción diferida, así que la aprobación del I-360 sola no da ese permiso." },
      { question: "Tiene caso en la corte de inmigración, ¿se puede?", answer: "Estar en proceso de deportación no descalifica para la petición, pero hay que declararlo." },
      { question: "¿Cuánto tarda USCIS?", answer: "El plazo puede variar; nadie puede prometerte una fecha." },
    ],
  },
  "i-485": {
    questions: [
      choice("i-485.cuantos_menores", "¿Para cuántos menores es el ajuste de estatus?", ["Uno", "Dos", "Tres o más", "Es para mí: presenté el I-360 antes de los 21"]),
    ],
    topics: ["qué es la fecha de prioridad", "qué pasa si su fecha aún no está vigente", "si puede viajar mientras espera"],
    doubts: [
      { question: "¿Qué es la fecha de prioridad?", answer: "Es el día en que USCIS recibió el I-360 del menor. Aparece como «Priority Date» en su aviso I-797." },
      { question: "Mi fecha aún no está vigente, ¿qué hago?", answer: "Puedes asegurar tu lugar con el contrato previo y tener todo listo para presentar en cuanto llegue. El boletín de visas se publica cada mes y puede avanzar, detenerse o retroceder." },
      { question: "¿Con el I-360 aprobado ya tengo la residencia?", answer: "Todavía no: hace falta que haya visa disponible y cumplir los requisitos del ajuste." },
      { question: "¿Puede pedir permiso de trabajo?", answer: "Junto al ajuste pueden pedirse el permiso de trabajo y el de viaje. Hoy ese permiso de trabajo dura como máximo 18 meses." },
      { question: "¿Puede viajar mientras espera?", answer: "No: salir de Estados Unidos con el I-485 pendiente y sin permiso de viaje hace que USCIS niegue el caso." },
      { question: "¿Qué documentos piden?", answer: "Por ejemplo, el aviso I-797 de aprobación del I-360, el acta de nacimiento, una identificación con foto, fotos tipo pasaporte y el examen médico I-693. ContyGo confirma la lista de cada menor." },
      { question: "¿El examen médico es obligatorio?", answer: "Sí: el I-693 va junto con el I-485, en el sobre sellado del médico." },
      { question: "¿Y si el menor se casa?", answer: "Casarse antes de la residencia hace perder la visa juvenil." },
    ],
  },
  // Fuentes: x-legal/docs/guides/i-765-permiso-de-trabajo-guia.md (19-09-2026) y contygo.app/servicios/permiso-de-trabajo.
  "permiso-de-trabajo": {
    questions: [
      yesno("permiso-de-trabajo.i589", "Para empezar, ¿ya presentaste tu solicitud de asilo, el formulario I-589?", "start"),
      yesno("permiso-de-trabajo.recibo", "¿Tienes el recibo que confirma que recibieron tu solicitud de asilo?", "start"),
      choice("permiso-de-trabajo.tiempo", "¿Cuánto tiempo lleva tu solicitud de asilo presentada?", ["Menos de 150 días, unos cinco meses", "150 días o más", "No sé"], "start"),
      choice("permiso-de-trabajo.tipo", "¿Es tu primer permiso de trabajo por asilo, o vas a renovar uno?", ["Es el primero", "Voy a renovar", "No sé"], "start"),
    ],
    topics: ["cuándo puedes pedirlo", "qué documentos necesitas", "cuánto tarda"],
    doubts: [
      { question: "¿Cuándo puedo pedir el permiso de trabajo?", answer: "Cuando tu solicitud de asilo lleva al menos 150 días presentada, contando desde la fecha del recibo. USCIS no puede aprobarlo antes de los 180 días. Si lo envías antes de tiempo, te lo niegan." },
      { question: "¿Qué documentos necesito?", answer: "El recibo de tu I-589, dos fotos tipo pasaporte y tu identificación; si los tienes, también tu I-94 o tu pasaporte. La app te dice qué subir." },
      { question: "¿Qué cosas detienen la cuenta de los 150 días?", answer: "Los retrasos que causa la propia persona, por ejemplo no ir a la cita de huellas del asilo o pedir que cambien la fecha de la entrevista o de la audiencia." },
      { question: "¿Cuánto tarda?", answer: "La preparación con ContyGo toma más o menos una semana. Lo que tarda USCIS en aprobarlo puede variar y nadie puede prometerte una fecha." },
      { question: "Si renuevo, ¿puedo seguir trabajando mientras espero?", answer: "Desde el 30 de octubre de 2025 renovar ya no alarga el permiso automáticamente: si la tarjeta vence, dejas de estar autorizado a trabajar. Conviene renovar unos 180 días antes del vencimiento." },
      { question: "¿Me sirve para sacar el Seguro Social?", answer: "Ya no se pide en el mismo formulario: cuando recibas tu permiso, vas en persona a una oficina del Seguro Social para solicitarlo." },
      { question: "¿Me garantizan que me lo aprueben?", answer: "No: la decisión es de USCIS. ContyGo prepara tu solicitud con cuidado, pero no puede prometer el resultado." },
      { question: "¿Tengo que ir a alguna cita?", answer: "USCIS puede citarte para tomarte las huellas y la foto. Esa foto es la que usan para la tarjeta." },
    ],
  },
  itin: {
    questions: [
      choice("itin.personas", "Para empezar, ¿para cuántas personas necesitas el ITIN?", ["Una", "Dos o más"], "start"),
      yesno("itin.tiene_ssn", "¿La persona que lo necesita ya tiene número de Seguro Social?", "start"),
      yesno("itin.identidad", "¿Tiene pasaporte o acta de nacimiento?", "start"),
      yesno("itin.con_declaracion", "¿Lo necesitas para presentar tu declaración de impuestos?", "start"),
    ],
    topics: ["qué es el ITIN", "cuánto tarda", "si sirve para trabajar"],
    doubts: [
      { question: "¿Qué es el ITIN?", answer: "Es tu número de identificación fiscal individual ante el IRS, para tus trámites de impuestos. ContyGo prepara tu solicitud W-7 y organiza tus documentos." },
      { question: "¿Cuánto tarda?", answer: "La asignación depende del IRS; según las condiciones del contrato, el IRS tarda de 7 a 13 semanas en emitirlo." },
      { question: "¿Me garantizan el número?", answer: "No: la asignación depende del IRS." },
      { question: "¿Con el ITIN puedo trabajar o arreglar papeles?", answer: "Es un servicio fiscal: ContyGo no promete que te dé permiso de trabajo ni estatus migratorio." },
      { question: "¿Qué documentos necesito?", answer: "Documentos de identidad y de respaldo para la W-7; ContyGo te confirma cuáles." },
      { question: "¿Me hacen también los impuestos?", answer: "Sí, es otro servicio de ContyGo: Declaración de impuestos, individual o familiar." },
    ],
  },
  impuestos: {
    questions: [
      choice("impuestos.paquete", "Para empezar, ¿la declaración es solo tuya, o también de tu familia?", ["Solo mía", "Mía y de mi familia"], "start"),
      choice("impuestos.anio", "¿Qué año quieres declarar: el año pasado, o también años atrasados?", ["El año pasado", "También años atrasados", "No sé"], "start"),
      choice("impuestos.ingresos", "¿Cómo recibiste tus ingresos: con W-2, como empleado, o con 1099, por tu cuenta?", ["W-2, como empleado", "1099, por mi cuenta", "Los dos", "No sé"], "start"),
      yesno("impuestos.ssn_itin", "¿Cada persona de la declaración tiene Seguro Social o ITIN?", "start"),
      yesno("impuestos.seguro_mercado", "¿Tuviste seguro médico del Mercado ese año?", "start"),
    ],
    topics: ["qué documentos necesita", "si le garantizan un reembolso", "qué pasa si no tiene Seguro Social"],
    doubts: [
      { question: "¿Me garantizan un reembolso?", answer: "No. El servicio no garantiza un reembolso; eso lo decide el IRS." },
      { question: "¿Qué documentos necesito?", answer: "Tu identificación, tus formularios W-2 o 1099 y el Seguro Social o ITIN de cada persona. Si tuviste seguro del Mercado, el formulario 1095-A. ContyGo confirma la lista según tu paquete." },
      { question: "No tengo Seguro Social, ¿puedo declarar?", answer: "Se pide el Seguro Social o el ITIN de cada persona. Si no tienes ninguno, ContyGo tiene el servicio de Número ITIN." },
      { question: "¿Qué incluye el paquete familiar?", answer: "A quien declara y a sus beneficiarios, con los documentos de cada persona." },
      { question: "¿Tengo que ir a una oficina?", answer: "No: después de firmar, tu caso se sigue en la app de ContyGo." },
    ],
  },
  llc: {
    questions: [
      yesno("llc.florida", "Para empezar, ¿la empresa la quieres abrir en Florida?", "start"),
      yesno("llc.nombres", "¿Ya tienes tres nombres para tu empresa, en orden de preferencia?", "start"),
      choice("llc.socios", "¿Vas a tener la empresa tú solo, o con socios?", ["Solo yo", "Con socios"], "start"),
      yesno("llc.pasaporte", "¿Tú y tus socios tienen pasaporte vigente?", "start"),
      choice("llc.paquete", "¿Te interesa solo constituir la empresa, o también la identidad de marca?", ["Solo la constitución", "También la identidad de marca", "Aún no sé"], "start"),
    ],
    topics: ["qué incluye", "si puede abrirla en otro estado", "qué documentos necesita"],
    doubts: [
      { question: "¿Qué incluye?", answer: "Los Articles of Organization y, según el paquete, el agente registrado y el EIN." },
      { question: "¿Puedo abrirla en otro estado?", answer: "El servicio publicado es para Florida." },
      { question: "¿Qué es el EIN?", answer: "Es el número de identificación de tu empresa ante el IRS; según el paquete, el servicio lo tramita." },
      { question: "¿Qué documentos piden?", answer: "Tres nombres para tu empresa, el pasaporte vigente de cada persona y un comprobante de domicilio de quien será el gerente. ContyGo confirma la lista." },
      { question: "¿Me ayuda con mi estatus migratorio?", answer: "No: este servicio constituye tu empresa y no promete estatus migratorio ni ventas." },
    ],
  },
  // 26-10-2026 (docs/loteria-dv-2027.md): las preguntas son las del flujo propio (lib/agent/lottery-intake.ts).
  "loteria-dv-2027": {
    questions: [],
    topics: ["quién puede participar", "qué foto se necesita", "cómo saber si salió seleccionado"],
    doubts: [
      { question: "¿Cuándo abre la inscripción?", answer: "Por ahora no tiene fecha. El 29 de octubre una corte de apelaciones suspendió la orden que obligaba a abrirla el 1 de noviembre, así que hoy no se aceptan inscripciones. Puedes dejar tus documentos listos y, si abre, se confirmará en dvprogram.state.gov." },
      { question: "¿Puedo participar si nací en Perú?", answer: "Sí: Perú pudo participar en la edición anterior. Cuenta el país donde naciste, y la lista oficial de la DV-2027 la confirma el Departamento de Estado." },
      { question: "¿Qué foto necesito?", answer: "Una foto reciente de cada persona: a color, cuadrada de 600 por 600 píxeles, de máximo 240 KB, de los últimos seis meses, de frente, con fondo blanco y sin lentes." },
      { question: "¿Tengo que incluir a mis hijos aunque no vayan a viajar?", answer: "Sí. Hay que incluir a tu cónyuge y a todos tus hijos solteros menores de 21, también adoptados e hijastros, aunque no vayan a viajar. Omitir a alguien descalifica." },
      { question: "¿Cómo sé si salí seleccionado?", answer: "Con tu número de confirmación, en dvprogram.state.gov, en la opción Entrant Status Check. No avisan por correo: guarda bien ese número." },
      { question: "¿Me pueden garantizar que voy a ganar?", answer: "No. Es un sorteo del gobierno de Estados Unidos y nadie puede garantizar que salgas seleccionado." },
      { question: "¿Salir seleccionado ya es tener la visa?", answer: "No. Después viene el trámite de la visa: el formulario DS-260, los documentos y una entrevista." },
      { question: "¿Puedo inscribirme dos veces para tener más suerte?", answer: "No: solo se permite una inscripción por persona y dos te descalifican. Si tu cónyuge también cumple los requisitos, puede hacer la suya, incluyéndote." },
      { question: "¿Necesito pasaporte?", answer: "Sí. Desde 2026 se piden los datos de un pasaporte vigente y una copia escaneada de la página con tu foto y tu firma." },
      { question: "¿Puedo inscribirme si vivo en Estados Unidos?", answer: "Sí, lo que cuenta es tu país de nacimiento, no dónde vives. Si sales seleccionado, tu situación migratoria cuenta en el trámite que sigue: revísalo con un asesor." },
    ],
  },
};

// Own keys only: «constructor» is not a service.
export const serviceScript = (serviceId: string): ServiceScript | null => Object.prototype.hasOwnProperty.call(SCRIPTS, serviceId) ? SCRIPTS[serviceId] : null;
export const scriptQuestions = (serviceId: string, position: ScriptQuestion["position"]): IntakeQuestion[] =>
  (serviceScript(serviceId)?.questions ?? []).filter(question => question.position === position).map(({ position: _position, ...question }) => question);
export const isScriptKey = (serviceId: string, key: string) => (serviceScript(serviceId)?.questions ?? []).some(question => question.id === key);

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** A question of the script the bot let go (it did not understand twice, or the call ran out of time for it). */
export { SKIPPED };

/** The script's answers the browser brings back, each checked again (they are only kept, never sent). */
export function sanitizeScriptAnswers(serviceId: string, input: unknown, normalize: (question: IntakeQuestion, value: unknown) => ServiceAnswers[string] | null): ServiceAnswers {
  const answers: ServiceAnswers = {};
  if (!isRecord(input)) return answers;
  for (const question of serviceScript(serviceId)?.questions ?? []) {
    if (!Object.prototype.hasOwnProperty.call(input, question.id)) continue;
    const value = input[question.id] === SKIPPED ? SKIPPED : normalize(question, input[question.id]);
    if (value !== null) answers[question.id] = value;
  }
  return answers;
}

/** At «¿Te queda alguna duda?», the usual doubts the bot offers to explain. */
export const doubtTopics = (serviceId: string) => (serviceScript(serviceId)?.topics ?? []).slice(0, 3);
/** The usual doubt the bot tells unasked when the questions end early (lib/agent/call-time.ts). */
export const doubtTip = (serviceId: string) => serviceScript(serviceId)?.doubts[0] ?? null;
