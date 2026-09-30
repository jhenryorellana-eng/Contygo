/** Documentary export only. Reads local catalog data; never calls the app/API. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedModules = new Set(['contygo-catalog', 'contygo-deliverables', 'contygo-presentation']);
const cache = new Map();
function loadData(name) {
  if (!allowedModules.has(name)) throw new Error(`Unexpected data module: ${name}`);
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(path.join(root, 'lib', `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(module, module.exports, (specifier) => {
    if (specifier !== './contygo-catalog') throw new Error(`Unexpected import: ${specifier}`);
    return loadData('contygo-catalog');
  });
  cache.set(name, module.exports);
  return module.exports;
}

// Editorial proposals, not final scripts, mandatory timing or newly produced media.
// Edit the service-specific ideas here; shared production rules live in the docs.
const ideas = {
  'visa-juvenil': {
    promise: 'Entender y organizar las etapas documentales del menor con participación de su tutor.',
    motif: 'Tutor y menor en el universo de papel; dos expedientes distintos conectados por el símbolo ContyGo.',
    beats: [
      'Tutor y menor reúnen su información junto al celular: reconocer a la familia y su necesidad sin representar una aprobación.',
      'En el espacio digital se distinguen declaraciones y documentos de la etapa de custodia estatal.',
      'Mostrar por separado la preparación de la petición I-360 por menor. El paso entre etapas depende de lo que corresponda al caso.',
      'Cerrar con el paquete Básico, lo que aporta la familia y el acceso a revisión/firma. Indicar en texto que I-485 es una contratación separada.',
    ],
    avoid: 'No presentar custodia, I-360 e I-485 como tres prestaciones incluidas ni mostrar una Green Card como resultado del paquete.',
  },
  'i-360': {
    promise: 'Preparar la petición del menor a partir de una orden estatal que ya existe.',
    motif: 'Orden estatal identificada y carpeta I-360; composición diferente del conjunto familiar de Visa Juvenil.',
    beats: [
      'Abrir con el documento previo: la orden estatal, acompañada por el tutor desde su celular.',
      'Reunir los documentos del menor alrededor de esa orden, con continuidad entre objetos.',
      'Revelar el formulario I-360 y su expediente de respaldo como entregables preparados.',
      'Cerrar con el alcance específico y la continuación al contrato del servicio I-360.',
    ],
    avoid: 'No volver a vender la custodia como parte de este servicio ni saltar visualmente a residencia aprobada.',
  },
  'i-485': {
    promise: 'Organizar el expediente de ajuste correspondiente al menor y a las condiciones de su caso.',
    motif: 'Aviso previo I-797, documentos por menor y carpeta I-485, sin tarjetas de residencia ficticias.',
    beats: [
      'Presentar una familia con I-360 aprobado como contexto previo, no como resultado generado por esta compra.',
      'Mostrar que se revisan las condiciones aplicables antes de contratar; no sugerir acceso universal al ajuste.',
      'La documentación aportada acompaña la preparación del I-485 y un expediente por menor.',
      'Mostrar seguimiento desde la app y el enlace para conocer el paquete y continuar a la contratación.',
    ],
    avoid: 'No afirmar que el I-360 aprobado basta por sí solo ni convertir el envío en una aprobación de residencia.',
  },
  asilo: {
    promise: 'Dar orden a la información, declaración y evidencias que respaldan la historia del cliente.',
    motif: 'Una persona real como contexto; su relato pasa a hojas y evidencias táctiles organizadas en un expediente.',
    beats: [
      'Una persona comparte su historia con calma desde el celular; priorizar dignidad y claridad.',
      'Distinguir su declaración y las evidencias aportadas, sin inventar hechos ni pruebas.',
      'Mostrar preparación del I-589, memorándum de Miedo Creíble y expediente con información del caso.',
      'Cerrar con alcance, participación del cliente y contratación desde ContyGo.',
    ],
    avoid: 'No usar violencia o miedo como presión comercial, ni mostrar representación en audiencia o asilo concedido.',
  },
  'reforzar-asilo': {
    promise: 'Revisar y organizar el respaldo de un caso cuyo I-589 ya fue presentado.',
    motif: 'Expediente existente reconocible al inicio; nuevas capas ordenadas de respaldo sin sustituir la solicitud original.',
    beats: [
      'Mostrar el I-589 ya presentado y los documentos existentes como punto de partida.',
      'Representar la evaluación inicial y la revisión de información: el informe no es una sentencia ni una aprobación.',
      'Organizar declaración, evidencias y memorándum para el reforzamiento del caso.',
      'Cerrar con evaluación y reforzamiento bajo un mismo contrato, y seguimiento de sus etapas en la app.',
    ],
    avoid: 'No representar una nueva I-589 incluida ni exigir visualmente una compra adicional de Evaluación de Asilo.',
  },
  'evaluacion-asilo': {
    promise: 'Acceder a un informe documental generado con IA y consultarlo desde la cuenta.',
    motif: 'Documentos de entrada y un informe PDF como protagonista; escena compacta de producto digital.',
    beats: [
      'Presentar la necesidad de revisar la información documental de un caso existente.',
      'El cliente comparte los documentos indicados por la herramienta; no inventar una lista fija de cargas.',
      'La evaluación automatizada produce un PDF accesible desde la cuenta.',
      'Cerrar con un intento por pago y alcance limitado al informe, antes de continuar al servicio.',
    ],
    avoid: 'No prometer revisión humana en la evaluación independiente, porcentaje de éxito, asesoría legal o preparación completa de asilo.',
  },
  apelacion: {
    promise: 'Comprender y reunir los documentos del paquete de apelación ante la BIA.',
    motif: 'Decisión previa, formulario y razones de apelación: tres objetos claros con etiquetas añadidas en edición.',
    beats: [
      'Partir de la decisión del juez que la persona necesita recurrir; presentarla con sobriedad.',
      'Desde el celular, el cliente aporta la información y los documentos correspondientes.',
      'Separar visualmente EOIR-26, Statement of Reasons y Proof of Service dentro del paquete.',
      'Mostrar alcance de preparación y enlace al contrato de Apelación (BIA), sin resolver ficticiamente el proceso.',
    ],
    avoid: 'No confundirlo con reapertura ante la misma corte ni añadir brief o representación como entregables no confirmados.',
  },
  'cambio-corte': {
    promise: 'Organizar la solicitud de cambio de sede después de una mudanza.',
    motif: 'Hogar y nueva dirección, dos documentos separados y dos envíos; recorrido comprensible sin mapas decorativos complejos.',
    beats: [
      'La persona comparte su nueva dirección y respaldos desde el celular.',
      'Mostrar EOIR-33 y moción de cambio de sede como documentos distintos.',
      'El expediente se prepara e imprime; distinguir envío a la corte y envío al fiscal con seguimiento.',
      'Cerrar con el alcance y la continuación al contrato, sin mostrar el traslado como aprobado.',
    ],
    avoid: 'No sugerir que actualizar la dirección cambia automáticamente la corte o que la app determina la decisión del juez.',
  },
  reapertura: {
    promise: 'Organizar la explicación y los respaldos de una solicitud de reapertura por ausencia.',
    motif: 'Orden previa, explicación del cliente y evidencias que convergen en una moción dirigida a la misma corte.',
    beats: [
      'Situar el caso: existe una orden emitida por ausencia a la audiencia.',
      'El cliente explica el motivo de la ausencia y aporta las evidencias correspondientes.',
      'Mostrar preparación de la moción, Proof of Service y carátula; EOIR-26A solo cuando corresponda.',
      'Cerrar con la identificación de la misma corte y el contrato específico de Apelación (Re-apertura).',
    ],
    avoid: 'Conservar el nombre comercial, pero explicar que es una moción ante la misma corte. No prometer cancelación de la orden ni confundir con BIA.',
  },
  itin: {
    promise: 'Organizar la información necesaria para preparar la solicitud de un ITIN.',
    motif: 'Identificación y solicitud W-7 en un espacio digital limpio; personas con propósito fiscal concreto.',
    beats: [
      'Presentar la necesidad fiscal y el servicio Número ITIN.',
      'Mostrar datos de identidad y respaldo aportados según las indicaciones del paquete, sin fijar una lista universal.',
      'Representar la preparación de W-7 y la organización de documentos acompañantes.',
      'Cerrar con alcance, honorarios en la web y continuación al contrato.',
    ],
    avoid: 'No mostrar un número ya asignado como resultado garantizado ni mezclar esta oferta fiscal con una aprobación migratoria.',
  },
  impuestos: {
    promise: 'Preparar la declaración con la información de ingresos organizada y el paquete adecuado.',
    motif: 'Comprobantes e información de una persona o familia que forman una declaración; sin lluvia de dinero.',
    beats: [
      'Presentar dos contextos legibles: una persona y una familia, según el paquete elegido.',
      'La información de ingresos e identificación se organiza desde la app.',
      'Mostrar preparación de la declaración y los pasos que correspondan al alcance contratado.',
      'Cerrar con Individual o Familiar, precio vigente como texto web y acceso a contratar.',
    ],
    avoid: 'No inventar montos de devolución, ahorro fiscal, formularios universales o servicios adicionales incluidos.',
  },
  llc: {
    promise: 'Organizar la constitución de una LLC en Florida con un alcance de paquete claro.',
    motif: 'Emprendedor en un entorno real y documentos táctiles de su empresa; la marca aparece solo en el paquete ampliado.',
    beats: [
      'Abrir con una persona y su proyecto de negocio, manteniendo la identidad humana de ContyGo.',
      'Mostrar datos de constitución y preparación de los Articles of Organization para Florida.',
      'Representar agente registrado y solicitud de EIN según paquete; diferenciar la opción de Identidad de Marca.',
      'Cerrar con la comparación de paquetes en texto web y el enlace al servicio de constitución.',
    ],
    avoid: 'No prometer ventas, estatus migratorio, constitución en cualquier estado ni identidad de marca dentro del paquete básico.',
  },
};

const { CONTYGO_SERVICES, CONTYGO_CATALOG_VERIFIED_AT } = loadData('contygo-catalog');
const { CONTYGO_DELIVERABLES } = loadData('contygo-deliverables');
const { getServicePresentation } = loadData('contygo-presentation');
const services = CONTYGO_SERVICES.map((service) => {
  const deliverables = CONTYGO_DELIVERABLES[service.id];
  const creative = ideas[service.id];
  if (!deliverables || !creative) throw new Error(`Missing brief for ${service.id}`);
  const previous = getServicePresentation(service.id);
  return {
    ...service,
    currency: 'USD',
    priceStatus: 'honorarios_del_catalogo_observado_no_cotizacion_actual',
    officialServiceUrl: `https://contygo.app/servicios/${service.slug}`,
    landingPreviewUrl: `http://127.0.0.1:3000/contygo-app?servicio=${service.id}#servicios`,
    customerInputs: { examples: deliverables.documents, note: deliverables.documentNote, mandatoryChecklist: false },
    documentedOutputs: deliverables.outputs,
    existingPresentation: previous ? {
      ...previous,
      fileExists: existsSync(path.join(root, 'public', previous.src)),
      usage: ['i-360', 'reforzar-asilo'].includes(service.id) ? 'introduccion_general_reutilizada' : 'presentacion_anterior',
      suitabilityForNewBrief: 'pendiente_de_revision_audiovisual',
    } : null,
    proposedVideo: { status: 'brief_propuesto_no_producido', ...creative, cta: 'Conoce el alcance y continúa a tu contrato en ContyGo.' },
  };
});
if (services.length !== 12 || new Set(services.map(s => s.id)).size !== 12 || Object.keys(ideas).length !== 12) {
  throw new Error('Catalog changed: review service coverage before regenerating.');
}
const mapped = services.filter(s => s.existingPresentation);
const snapshot = {
  title: 'ContyGo: base documental de servicios y futuros vídeos',
  generatedAt: new Date().toISOString(),
  businessReviewDate: '2026-09-14',
  catalogObservedAt: CONTYGO_CATALOG_VERIFIED_AT,
  sources: {
    catalog: 'lib/contygo-catalog.ts',
    inputExamplesAndOutputs: 'lib/contygo-deliverables.ts',
    existingMediaAssignments: 'lib/contygo-presentation.ts',
    currentAppSourceReviewed: 'C:/Users/PepitoLee/Downloads/vvvv/x-legal-main/x-legal-main/',
    earlierDeliverablesSource: 'C:/Users/PepitoLee/Downloads/x-legal-main (1)/x-legal-main/',
    businessAndWorkflow: 'docs/contygo-propuesta-y-mensaje.md',
    master: 'docs/contygo-base-comercial.md',
  },
  boundaries: [
    'Exportación documental de datos locales. No consulta la base de datos ni verifica transacciones en producción.',
    'Disponibilidad, precio total, personas adicionales, cuotas, requisitos y contrato vigentes se confirman en ContyGo.',
    'Los ejemplos de documentos proceden de la investigación previa; no son una lista obligatoria universal.',
    'Los planteamientos audiovisuales son propuestas de trabajo, no guiones cerrados ni medios nuevos ya producidos.',
    'La existencia de un vídeo anterior no demuestra su adecuación a la nueva propuesta comercial.',
  ],
  summary: {
    serviceCount: services.length,
    planCount: services.reduce((sum, s) => sum + s.plans.length, 0),
    mappedPresentations: mapped.length,
    uniquePresentationFiles: new Set(mapped.map(s => s.existingPresentation.src)).size,
    withoutPresentation: services.filter(s => !s.existingPresentation).map(s => s.id),
  },
  services,
};

const bullets = (values) => values.map(value => `- ${value}`).join('\n');
const usd = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const mediaText = (service) => {
  const media = service.existingPresentation;
  if (!media) return 'Sin vídeo asignado en el mapa local de presentaciones. Preparar una pieza propia.';
  return `Archivo anterior: \`public${media.src}\` (${media.fileExists ? 'presencia comprobada' : 'archivo no encontrado'}). ${media.caption} Adecuación al nuevo brief pendiente de revisión; no es una producción nueva.`;
};
const cards = services.map((s, index) => `## ${index + 1}. ${s.name}

**Grupo:** ${s.category}. **Identificador:** \`${s.id}\`.

**Ficha oficial y destino de contratación:** [${s.name}](${s.officialServiceUrl}). Es la entrada al servicio; la app resuelve cuenta, requisitos y contrato.

**Para quién:** ${s.audience}

**Oferta documentada:** ${s.description}

**Paquetes y honorarios de referencia (${CONTYGO_CATALOG_VERIFIED_AT}):** ${s.plans.map(p => `${p.name}: ${usd(p.price)} USD`).join(' · ')}. Confirmar total vigente antes de usarlo en una oferta; no presentar estos importes como tasas gubernamentales incluidas.

**Alcance del catálogo:**

${bullets(s.includes)}

**Lo que aporta el cliente — ejemplos, no checklist obligatorio:**

${s.customerInputs.examples.length ? bullets(s.customerInputs.examples) + '\n\n' : ''}${s.customerInputs.note}

**Entregables/elementos incluidos documentados:**

${bullets(s.documentedOutputs)}

**Límites que deben quedar claros:**

${bullets(s.exclusions)}

**Enfoque comercial propuesto para su vídeo:** ${s.proposedVideo.promise}

**Motivo visual propio:** ${s.proposedVideo.motif}

**Historia a desarrollar en escenas y storyboards:**

${s.proposedVideo.beats.map((beat, i) => `${i + 1}. ${beat}`).join('\n')}

**Evitar al escribir o animar:** ${s.proposedVideo.avoid}

**Cierre orientativo:** «${s.proposedVideo.cta}» El nombre, el precio y el botón de la web corresponden a este servicio.

**Material previo:** ${mediaText(s)}

**Estado del nuevo vídeo:** brief propuesto; no producido. Faltan guion final, planos/storyboards, prompts y el vídeo que generará el usuario.
`).join('\n');

const markdown = `# ContyGo · Fichas comerciales y futuros vídeos por servicio

[Volver a la base comercial](contygo-base-comercial.md) · [Estructura de landing](contygo-estructura-landing.md) · [Datos completos](contygo-servicios.snapshot.json)

Base revisada el 14 de septiembre de 2026. Catálogo observado el **${CONTYGO_CATALOG_VERIFIED_AT}**; esta exportación no vuelve a consultar producción. Contiene **${snapshot.summary.serviceCount} servicios y ${snapshot.summary.planCount} paquetes**. Generar de nuevo con \`node scripts/build-contygo-commercial-brief.mjs\` después de revisar los datos locales; las ideas específicas se editan en ese script, los criterios comunes en los documentos de dirección.

## Cómo utilizar estas fichas

Son briefs de producción y contenido, no nuevos vídeos ni guiones definitivos. Conservan nombres, destinatarios, alcance, documentos de ejemplo, entregables, exclusiones, precios históricos y rutas oficiales. Los enlaces llevan a la ficha pública del servicio; la creación y firma del contrato se completan en la app según el caso.

Los datos se exportan de \`lib/contygo-catalog.ts\`, \`lib/contygo-deliverables.ts\` y \`lib/contygo-presentation.ts\`. Los ejemplos de documentos proceden de la investigación anterior del producto; el funcionamiento comercial general se contrastó con la versión entregada el 14 de septiembre. No se consultó la base de datos vigente ni se firmó/pagó un contrato. La configuración actual del servicio y el contrato aplicable prevalecen.

La comunicación debe distinguir lo que el cliente aporta y lo que ContyGo prepara. La evaluación independiente de asilo es una entrega automatizada de informe, diferente de la revisión incluida en Reforzar Asilo. Algunas listas fiscales/empresariales conservan elementos del paquete junto a entregables; no convertirlas artificialmente en cantidades de documentos garantizadas.

## Reglas comunes de narrativa y producción

- **Función comercial:** reconocer la necesidad → explicar el beneficio → mostrar qué se prepara/recibe y qué aporta el cliente → aclarar alcance → continuar a la contratación. Precio, garantía y condiciones se mantienen como texto de la web para poder actualizarlos.
- **Humanos y producto:** hero y contexto de vida con personas orgánicas y cinematografía natural. Explicación de servicios con papel/3D táctil, profundidad, luz suave, comunidad, documentos y celular. Verde, navy y blanco de ContyGo. No repetir el mismo expediente genérico para todos.
- **Aplicación protagonista:** mostrar aportación de información, seguimiento, documentos y soporte. Cuando una función requiera ver pantalla, usar una captura autorizada y fiel de la interfaz sin datos privados; no inventar una UI con IA. En el hero actual se ve el reverso del celular y su funda brandeada.
- **Formatos distintos:** los cinco bucles ambientales de categoría duran seis segundos, con inicio/final compatibles. Los vídeos específicos explican un servicio; pueden ensamblar los bloques de 6, 10 o 15 segundos que necesite su historia. Los cuatro puntos de cada ficha son contenido narrativo, no cuatro clips obligatorios. Prioridad móvil; encuadres propios y zonas seguras para los textos.
- **Consistencia:** storyboard de momentos útiles para cada escena, identidad separada y continuidad de personas, manos, funda, luz y objetos. El vídeo muestra cada plano a pantalla completa, nunca la cuadrícula. No sustituir todos los storyboards por una sola toma inicial.
- **Operación:** el usuario genera los vídeos en Grok. El asistente dirige, entrega referencias/imágenes/storyboards y prompts detallados, y revisa los vídeos que reciba. No abrir ni operar Grok. Seguir Grok Creator y la delegación de imágenes a Luna al producir; reutilizar la dirección ya investigada. Una nueva dirección exige la búsqueda y presentación de tres referencias Pinterest según las preferencias vigentes.
- **Legibilidad y verdad:** añadir nombres de formularios, importes, captions y CTA con texto real de edición/web; no depender de letras deformadas en vídeo. El check ContyGo significa organización/avance, nunca aprobación gubernamental. No inventar velocidad, precisión, aprobación, disponibilidad ni plazos.
- **Entrega y prueba:** conservar originales, prompt y procedencia; comprobar continuidad y formato al recibir el clip. Bucles sin saltos apreciables, móvil legible, controles/texto equivalente en explicadores y CTA disponible sin obligar a terminar el vídeo.

## Resumen del material anterior

Hay ${snapshot.summary.mappedPresentations} asignaciones a ${snapshot.summary.uniquePresentationFiles} archivos explicativos anteriores. I-360 reutiliza la introducción de Visa Juvenil y Reforzar Asilo reutiliza la de Asilo. Sin asignación: ${services.filter(s => !s.existingPresentation).map(s => s.name).join(', ')}. Se comprobó la presencia de los archivos; no se declara revisada su narrativa para esta nueva dirección.

Los bucles de categoría anteriores y los vídeos del hero son otro tipo de recurso. Su estado de integración está en [la base comercial](contygo-base-comercial.md); no sustituyen estas explicaciones específicas.

${cards}
## Antes de cerrar un guion de producción

Revisar la ficha y el contrato vigentes del servicio elegido, concretar solo las condiciones comerciales aplicables, recuperar sus referencias/identidad y traducir los puntos de historia a escenas realizables. La lista de carga real depende de la configuración por etapa y persona. Honorarios, cuotas, personas adicionales, plazos y reembolso necesitan la validación que corresponda antes de publicarse.

La prueba «más de 500 clientes atendidos» procede del usuario; no representa aprobaciones. No insertar regalos, un aumento de precio no confirmado o un temporizador que reinicia. Los asuntos abiertos están reunidos en la base comercial para resolverlos sin perder la dirección.
`;

mkdirSync(path.join(root, 'docs'), { recursive: true });
writeFileSync(path.join(root, 'docs/contygo-servicios.snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
writeFileSync(path.join(root, 'docs/contygo-videos-servicios.md'), markdown);
console.log(JSON.stringify(snapshot.summary, null, 2));
