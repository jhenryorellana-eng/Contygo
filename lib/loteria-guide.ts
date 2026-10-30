/* ============================================================
   Guía gratuita de la Lotería de Visas DV-2027 (26-10-2026): el contenido de /guia-loteria-de-visas.
   Fuentes y fechas: docs/loteria-dv-2027.md. Todo se confirma con el anuncio oficial del Departamento de Estado, que
   el 30-10-2026 aún no salía (la orden que lo exigía está suspendida); la lista de países es la de la DV-2026 hasta entonces.
   ============================================================ */
export const LOTTERY_GUIDE_UPDATED = "30 de octubre de 2026";
/** 29-10-2026: la Corte de Apelaciones del Noveno Circuito suspendió la orden que obligaba a abrir la inscripción el 1 de
 *  noviembre (docs/loteria-dv-2027.md). Mientras sea true la página no promete fechas ni cuenta atrás. */
export const LOTTERY_PAUSED = true;
export const LOTTERY_PAUSE_NOTE = "El 29 de octubre de 2026 una corte de apelaciones suspendió la orden que obligaba a abrir la inscripción el 1 de noviembre. Hoy no se aceptan inscripciones y no hay fecha nueva.";
/** Over the lottery's films, which were recorded before the suspension and still mention the dates. */
export const LOTTERY_FILM_NOTICE = "Aviso: la inscripción está en pausa y no tiene fecha. Las fechas que se mencionan en este vídeo ya no aplican.";
/** The opening the court ordered (at the latest) and the results deadline, as dates (yyyy-mm-dd). */
export const LOTTERY_OPENS = "2026-11-01";
export const LOTTERY_RESULTS = "2026-12-03";

export const LOTTERY_COUNTRIES = {
  yes: ["Perú", "Argentina", "Bolivia", "Chile", "Ecuador", "Guatemala", "Nicaragua", "Costa Rica", "Panamá", "Paraguay", "Uruguay", "Belice"],
  no: ["México", "Colombia", "Venezuela", "El Salvador", "Honduras", "Cuba", "República Dominicana", "Brasil", "Haití"],
};

export const LOTTERY_NEEDS = [
  { title: "Pasaporte vigente", text: "Sus datos y una copia escaneada de la página con tu foto y tu firma. Es obligatorio desde abril de 2026." },
  { title: "Una foto de cada persona", text: "Tuya, de tu cónyuge y de cada hijo soltero menor de 21. Fotos separadas, nunca de grupo." },
  { title: "Tus datos", text: "Nombre tal como en tu pasaporte, fecha, ciudad y país de nacimiento, dirección, correo y nivel de estudios." },
  { title: "Los datos de tu familia", text: "Nombre, fecha, ciudad y país de nacimiento de tu cónyuge y de todos tus hijos solteros menores de 21." },
];

export const LOTTERY_PHOTO_RULES = [
  "A color, en formato JPEG.",
  "Cuadrada: 600 por 600 píxeles.",
  "De máximo 240 KB.",
  "Tomada en los últimos seis meses (no sirve la de un año anterior).",
  "De frente, con expresión neutra y los ojos abiertos.",
  "Fondo blanco o casi blanco.",
  "Sin lentes de ningún tipo; gorros solo por motivos religiosos y sin tapar la cara.",
  "La cabeza ocupa entre la mitad y dos tercios de la foto.",
];

/** The official form (E-DV), in its order (DV-2026 instructions + the passport, required since 2026). `official` is the
 *  field's name on the form, which is in English; `example` shows how it is filled in. */
export type LotteryFormStep = { title: string; text: string; official?: string; example?: string };
export const LOTTERY_FORM_STEPS: LotteryFormStep[] = [
  { title: "Tu nombre completo", text: "Apellidos, nombre y segundo nombre, exactamente como en tu pasaporte.", official: "Entrant Name", example: "PÉREZ GÓMEZ · ANA · LUCÍA" },
  { title: "Sexo y fecha de nacimiento", text: "Día, mes y año.", official: "Gender · Birth Date", example: "Female · 14 / 03 / 1994" },
  { title: "Ciudad y país de nacimiento", text: "El país con su nombre actual.", official: "City / Country Where You Were Born", example: "Arequipa · Peru" },
  { title: "País de elegibilidad", text: "Casi siempre es tu país de nacimiento. Si no participa, puedes usar el de tu cónyuge (o el de uno de tus padres, en casos especiales).", official: "Country of Eligibility", example: "Peru" },
  { title: "Tu foto", text: "Súbela y revisa que el sitio la acepte. Usa el validador de fotos del sitio oficial.", official: "Entrant Photograph", example: "foto-600x600.jpg" },
  { title: "Tu pasaporte", text: "Número, fechas y la copia escaneada de la página con tu foto y tu firma.", official: "Passport", example: "Número y vencimiento" },
  { title: "Dirección postal y país donde vives hoy", text: "Puede ser en Estados Unidos o en otro país.", official: "Mailing Address · Country Where You Live Today", example: "Av. Ejército 123, Arequipa" },
  { title: "Teléfono y correo", text: "El teléfono es opcional; el correo, no.", official: "Phone Number · E-mail Address", example: "ana.perez@gmail.com" },
  { title: "Tu nivel de estudios", text: "El más alto que terminaste: secundaria, técnica, universidad…", official: "Highest Level of Education", example: "High School Diploma" },
  { title: "Tu estado civil", text: "Si estás casado o casada, incluye a tu cónyuge con su foto, aunque no vaya a viajar.", official: "Current Marital Status", example: "Married" },
  { title: "Tus hijos", text: "Todos los solteros menores de 21: naturales, adoptados e hijastros, cada uno con su foto, aunque no vivan contigo.", official: "Number of Children", example: "2" },
  { title: "Revisa y envía", text: "Revisa cada dato antes de enviar. Solo se permite una inscripción por persona.", official: "Submit", example: "Revisa · Envía" },
  { title: "Guarda tu número de confirmación", text: "Aparece al final. Haz captura o imprímelo: sin él no puedes ver tu resultado.", official: "Confirmation Number", example: "2027AB1C2D3E4F5G" },
];

export const LOTTERY_AFTER = [
  "El resultado solo se consulta en dvprogram.state.gov, en Entrant Status Check, con tu número de confirmación. No avisan por correo ni por email.",
  "Si sales seleccionado, todavía no es la visa: sigue el formulario DS-260, los documentos y una entrevista, y un pago oficial de 330 dólares por persona, todo antes del fin del año fiscal 2027.",
  "Si estás en Estados Unidos sin estatus o te quedaste más tiempo del permitido, ser seleccionado puede no bastar para la residencia: revisa tu caso con un asesor antes de dar pasos.",
];

export const LOTTERY_SCAMS = [
  "Hoy nadie puede inscribirte: la inscripción está en pausa. Si te cobran por hacerlo ahora, desconfía.",
  "La inscripción oficial solo se hace en dvprogram.state.gov y cuesta 1 dólar.",
  "Nadie puede garantizarte que salgas seleccionado ni «aumentar tus posibilidades».",
  "Desconfía de correos o mensajes que digan «ganaste»: el gobierno no avisa así.",
  "Dos inscripciones de la misma persona la descalifican.",
];
