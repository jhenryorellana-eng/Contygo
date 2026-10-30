/* ============================================================
   Lo que el bot puede afirmar además de la ficha de cada servicio (21-10-2026)
   Solo hechos que la landing ya publica o que están comprobados en su código y documentos
   (cada uno dice de dónde sale). Lo que no está aquí, el bot no lo afirma: dice que un asesor
   lo confirma por WhatsApp y la duda queda registrada para que el equipo la responda.
   Las respuestas que el equipo apruebe en el panel se suman a estas (mejora continua).
   ============================================================ */

export interface Faq { question: string; answer: string }

/** Válido para todos los servicios. */
export const GENERAL_FACTS: readonly string[] = [
  // lib/legal/*.ts, docs/contygo-contratacion-api.md («ContyGo, marca de USA LATINO PRIME LLC»).
  "ContyGo es una plataforma de trámites migratorios, marca de USA LATINO PRIME LLC. No es un bufete de abogados: prepara los documentos y acompaña el proceso; no da representación legal ni garantiza el resultado del caso.",
  // ServiceCinemaDialog + ContractModeChooser (20-10-2026).
  "Para contratar, al final de la guía se toca «Revisar mi contrato» y se elige: crear el contrato por uno mismo o con un asesor por WhatsApp.",
  // ContractCheckout: pasos de la ficha, código de 6 dígitos, firma y app.
  "Por uno mismo, el contrato pide nombre, contacto (correo y teléfono de EE. UU.), dirección, las personas del expediente y el paquete. Llega un código de 6 dígitos al correo, vale 15 minutos, y después se firma en línea. El enlace para firmar vale 14 días y también llega por correo.",
  "Después de firmar, el caso se sigue en la app de ContyGo, entrando con el correo.",
  "Para lo que no esté aquí, un asesor responde por WhatsApp.",
];

/** Por servicio (id de lib/contygo-catalog). */
export const SERVICE_FACTS: Readonly<Record<string, readonly string[]>> = {
  "visa-juvenil": [
    // ContyGo: pregunta de elegibilidad del servicio.
    "Es para menores de 21 años que no están casados.",
    // lib/contygo-catalog.ts: solo Premium desde el 26-10-2026 (contygo ocultó Básico).
    "El servicio es Visa Juvenil Premium: incluye la custodia en la corte estatal, la petición I-360 y el ajuste de estatus I-485, todo en un mismo proceso.",
  ],
  "i-485": [
    // ContyGo: preguntas de elegibilidad del servicio (catálogo vivo).
    "Para presentar el ajuste de estatus del menor, el I-360 debe estar aprobado, la fecha de prioridad debe estar vigente en el boletín de visas (EB-4), el menor debe seguir soltero y no debe tener un proceso o una orden de deportación.",
    // lib/agent/adjustment-intake.ts: contrato previo cuando la fecha aún no llega.
    "Si la fecha de prioridad todavía no está vigente, se puede asegurar el lugar con el contrato previo.",
  ],
  "reforzar-asilo": [
    // lib/agent/asylum-intake.ts (manual de las cortes 2.1(b)(2); USCIS desde el 21-08-2026).
    "En la corte, las pruebas se entregan al menos 30 días antes de la audiencia individual (la de mérito). Ante USCIS, todas las pruebas se entregan 14 días antes de la entrevista.",
    // ContyGo: minNotice de la pregunta de fecha.
    "Para contratar en línea, la próxima audiencia debe estar al menos a 5 días hábiles.",
  ],
  apelacion: [
    // 8 CFR 1003.38 (lib/agent/asylum-intake.ts, BIA_APPEAL_URL).
    "La apelación ante la BIA se presenta dentro de los 30 días siguientes a la decisión del juez.",
    // ContyGo (comprobado el 13-10-2026): contrato en línea hasta 27 días desde la decisión.
    "En línea se puede contratar hasta 27 días después de la decisión del juez; después, un asesor revisa el plazo por WhatsApp.",
  ],
  "cambio-corte": [
    // ContyGo: minNotice de la pregunta de fecha.
    "Para contratar en línea, la próxima audiencia debe estar al menos a 7 días.",
  ],
  reapertura: [
    // ContyGo: preguntas de elegibilidad del servicio.
    "Es para una orden de deportación in absentia (cuando la persona faltó a su audiencia). Sirve cuando faltó por una causa justificada: no le llegó la notificación, estaba detenida, asistió y el juez no lo registró, enfermedad grave, embarazo o parto, o la muerte o enfermedad grave de un familiar.",
  ],
  // x-legal/docs/guides/i-765-permiso-de-trabajo-guia.md (19-09-2026) y contygo.app/servicios/permiso-de-trabajo (26-10-2026).
  "permiso-de-trabajo": [
    "Es el permiso de trabajo (I-765) para quien tiene una solicitud de asilo pendiente: categoría (c)(8). ContyGo prepara la solicitud y el paquete para USCIS en más o menos una semana.",
    "Se puede presentar cuando la solicitud de asilo lleva al menos 150 días, contando desde la fecha del recibo; USCIS no lo aprueba antes de los 180 días. Los retrasos que causa la persona detienen esa cuenta.",
    "Desde el 30 de octubre de 2025 la renovación ya no alarga el permiso automáticamente: conviene renovar unos 180 días antes del vencimiento.",
  ],
  // 26-10-2026, al día el 30-10-2026 (docs/loteria-dv-2027.md: orden judicial, apelación, instrucciones DV-2026 y cambios de 2026).
  "loteria-dv-2027": [
    "La Lotería de Visas (Programa de Visas de Diversidad DV-2027) es del Departamento de Estado de Estados Unidos. La inscripción oficial solo se hace en dvprogram.state.gov.",
    "Cuenta el país de nacimiento, no la nacionalidad ni dónde vives. En la edición anterior pudieron participar, entre otros, Perú, Argentina, Bolivia, Chile, Ecuador, Guatemala, Nicaragua, Costa Rica, Panamá, Paraguay, Uruguay y Belice; no pudieron México, Colombia, Venezuela, El Salvador, Honduras, Cuba, República Dominicana, Brasil ni Haití. La lista oficial de la DV-2027 la publica el Departamento de Estado.",
    "Se puede usar el país de nacimiento del cónyuge, o el de uno de los padres si ninguno era nativo ni residente del país donde naciste.",
    "Requisito de estudios o de trabajo: secundaria completa (12 años de estudios), o dos años de experiencia, en los últimos cinco, en un oficio que requiera al menos dos años de formación.",
    "Desde abril de 2026 se piden los datos de un pasaporte vigente y una copia escaneada de la página con la foto y la firma.",
    "La inscripción de la DV-2027 está en pausa y no tiene fecha: el 29 de octubre de 2026 la Corte de Apelaciones del Noveno Circuito suspendió la orden judicial que obligaba a abrirla el 1 de noviembre, mientras se resuelve la apelación. Hoy no se aceptan inscripciones. Si abre, se confirmará en dvprogram.state.gov.",
    "Hay que incluir al cónyuge y a todos los hijos solteros menores de 21 años, aunque no vayan a viajar; omitir a alguien descalifica. Una sola inscripción por persona.",
    "Al final de la guía se elige: inscribirse uno mismo, gratis, en el sitio oficial, con la guía y el vídeo paso a paso; o que ContyGo revise las fotos y los datos y envíe la inscripción.",
  ],
  "preparacion-audiencia": [
    // lib/agent/hearing-intake.ts y docs/preparacion-de-audiencia.md.
    "Es una sesión individual de 45 minutos en español con Henry Orellana, consultor migratorio certificado en el estado de Utah, no abogado: es orientación personal y no incluye representación legal.",
    "La preparación para la segunda audiencia (la preliminar) repasa qué pasa ese día, ordena tus preguntas y practica cómo responder con calma. La de la tercera (la de mérito) recorre tu historia de principio a fin y practica las preguntas más difíciles.",
    // ContyGo: minNotice de la pregunta de fecha.
    "Para reservarla en línea, la audiencia debe estar al menos a 7 días. Después de contratar, el equipo agenda la videollamada.",
  ],
};
