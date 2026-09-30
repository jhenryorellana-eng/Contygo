import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public/contygo-produccion/visa-tres-estilos');
fs.mkdirSync(root, { recursive: true });
fs.mkdirSync(path.join(root, 'art'), { recursive: true });
fs.mkdirSync(path.join(root, 'boards'), { recursive: true });
const base = '/contygo-produccion/visa-tres-estilos';
const ui = '/contygo/rebuild-v4/ui';
const serviceCues = [
 'Visa Juvenil: una opción para ciertos menores.',
 'Ante abandono, abuso o negligencia parental.',
 'Requiere una orden estatal y una petición I-360.',
 'ContyGo te acompaña en la preparación.',
 'Organizamos tus documentos de custodia y la petición,',
 'con pasos claros desde tu celular.'
];
const closingCues = [
 'Tu proceso, en un solo lugar. Así funciona ContyGo.',
 'Elige Visa Juvenil Básico y conoce lo que incluye.',
 'Crea tu cuenta para comenzar desde tu celular.',
 'Revisa el alcance y las condiciones antes de firmar.',
 'La firma y el pago inicial confirmado activan tu caso.',
 'Sube tus documentos y completa la información de cada etapa.',
 'La tecnología organiza la preparación; tú puedes consultar qué sigue.',
 'Recibes los documentos preparados de tu servicio, con acompañamiento del equipo.',
 'Revisa tu contrato en ContyGo o habla con un agente.'
];
const service = serviceCues.join(' ');
const closing = closingCues.join(' ');
const direction = `Misma voz en los dos vídeos y en los tres tratamientos: español latino neutro, adulta, cercana, segura y serena. Locución en off; los personajes no hablan ni mueven los labios siguiendo al narrador. Pronunciar ContyGo «contigo» e I-360 «i tres sesenta». El primer guion tiene ${service.split(/\s+/).length} palabras; el segundo, ${closing.split(/\s+/).length}. Duraciones objetivo de 20 y 45 s: ajustar pausas al audio real, sin acelerar artificialmente. Los tramos de cada viñeta son una guía de edición; falta medir la locución grabada. Exportar cada voz por separado, preferiblemente WAV, sin música ni efectos. Mantener la grabación original en el montaje; usarla como referencia en Grok no garantiza una copia idéntica.`;
const source = 'https://www.uscis.gov/sites/default/files/document/brochures/OPS_Special_Immigrant_Juvenile_Classification_V7_508%20Compliant.pdf';
const F = (time,title,motion,kind,extra={}) => ({time,title,motion,kind,...extra});
const art = (sheet,cell,headline,subline='') => ({asset:`${base}/art/${sheet}.png`,cell,headline,subline});
const screen = (file,headline,extra={}) => ({screen:`${ui}/${file}.png`,headline,...extra});
const note = 'Storyboard de tratamiento completo para comparar. Las duraciones son de montaje; no enviar los 20 o 45 segundos como una sola generación. Si eliges esta dirección, las referencias de producción se preparan por bloque: 2×10 s y 3×15 s. Las capturas mantienen la interfaz real. Firma, pago y acompañamiento se representan como conceptos cuando no existe una captura pública adecuada; no se simula una operación realizada.';

const a1 = [
 F('00–03','Una historia, no un trámite más','Acercamiento de 5 % hacia los dos personajes. La carpeta entra en atención antes que el teléfono. Corte por mirada al joven.','art',art('a1',0,'Visa Juvenil','Una historia que merece claridad.')),
 F('03–06','Para quién puede ser una opción','Primer plano sereno. Mantener la dignidad del joven; nada de recrear abuso o sufrimiento. El texto se añade como capa editorial.','art',art('a1',1,'Una posibilidad, según tu caso.','Abandono · abuso · negligencia parental')),
 F('06–10','Dos etapas distintas','Corte cenital. La cámara recorre primero la carpeta de casa y luego la de documentos. Las etiquetas aclaran orden estatal y petición; no son aprobaciones.','art',art('a1',2,'Orden estatal → I-360','Cada etapa tiene sus requisitos.')),
 F('10–13','La solución tiene nombre','Match cut del rectángulo de la carpeta a la ficha real de Visa Juvenil Básico. El teléfono ocupa el centro, sin girar el texto.','ui',screen('servicio','Preparación con ContyGo',{eyebrow:'CAPTURA REAL',zoom:1,position:'top'})),
 F('13–17','Qué hacemos contigo','Detalle de manos organizando hojas. Pequeño desplazamiento lateral. El movimiento comunica preparación, sin hojas que se multipliquen.','art',art('a1',3,'Documentos. Orden. Acompañamiento.')),
 F('17–20','Puente al recorrido de la app','Corte al botón de la ficha real, acercamiento suave y salida estable. El siguiente vídeo comienza con la misma posición del teléfono.','ui',screen('servicio','Ahora, mira cómo funciona.',{zoom:1.45,position:'bottom',dark:true}))
];
const a2 = [
 F('00–04','La plataforma entra en la historia','Retomar el teléfono del cierre anterior; abrir encuadre hacia tutora y joven. Cámara estable y gesto humano sencillo.','art',art('a2',0,'Tu proceso, en un solo lugar.')),
 F('04–08','Elige tu servicio','Corte frontal a la ficha real. Push-in de 8 % al nombre del servicio y el paquete; detener para permitir lectura.','ui',screen('servicio','Elige tu servicio',{eyebrow:'CAPTURA REAL',zoom:1,position:'top'})),
 F('08–13','Crea tu cuenta','El teléfono se desliza de izquierda a centro y muestra el registro real vacío. Acercamiento a los campos; ningún dato personal se inventa.','ui',screen('registro','Crea tu cuenta',{eyebrow:'CAPTURA REAL',zoom:1.12,position:'top'})),
 F('13–18','Revisa antes de firmar','Corte al documento y bolígrafo. El bolígrafo permanece sobre el papel, sin simular una firma real. Es un insert conceptual, no la pantalla de firma.','art',art('a2',1,'Revisa. Entiende. Firma.','El alcance, antes de decidir.')),
 F('18–23','Activa tu caso','Detalle breve de tarjeta y teléfono. Dos palabras editoriales se unen: firma + pago inicial confirmado. Sin importes de otros casos.','art',art('a2',2,'Activa tu caso','Firma + pago inicial confirmado')),
 F('23–28','Tus documentos, organizados','Match cut de la tarjeta a la sección Mis documentos. Plano limpio con pantalla real completa.','ui',screen('documentos','Comparte tus documentos',{eyebrow:'CAPTURA REAL',zoom:1,position:'top'})),
 F('28–34','Se entiende dónde actuar','Acercamiento a las tarjetas y «Subir documento». Un aro editorial señala la acción, sin fingir que se subió un archivo.','ui',screen('documentos','Un paso a la vez',{zoom:1.65,position:'top',dark:true})),
 F('34–40','Tecnología con acompañamiento','Corte a personajes y expediente organizado. La línea editorial indica preparación y seguimiento, sin declarar aprobación migratoria.','art',art('a2',3,'El equipo te acompaña.','Preparación · avances · soporte')),
 F('40–45','Dos salidas, una decisión clara','El teléfono se reduce suavemente. Aparecen check y dos acciones de la landing; mantener el cierre legible hasta el final.','type',{eyebrow:'CONTYGO',headline:'Da tu siguiente paso.',subline:'Ir a mi contrato · Hablar con un agente',dark:true,screen:`${ui}/servicio.png`})
];
const b1 = [
 F('00–03','Empezamos por la persona','Travelling corto a altura de mesa. Tutor y joven miran su carpeta; luz de ventana, piel natural, sin mirar al espectador.','art',art('b1',0,'Visa Juvenil','Tu historia merece claridad.')),
 F('03–06','Una posibilidad que debe revisarse','Corte por mirada al rostro del joven. Retrato tranquilo y digno; nada de imágenes traumáticas ni interpretación de elegibilidad.','art',art('b1',1,'Puede ser una opción.','Abandono · abuso · negligencia parental')),
 F('06–10','El proceso se vuelve comprensible','Corte cenital a dos carpetas. Rack focus suave de una a otra; etiquetas editoriales separan orden estatal y petición I-360.','art',art('b1',2,'Orden estatal → I-360','Dos etapas. Requisitos propios.')),
 F('10–13','La app se muestra de verdad','Match cut de carpeta a rectángulo de teléfono. Insert frontal de la ficha real, sin reconstruir sus letras con IA.','ui',screen('servicio','Así te acompaña ContyGo',{eyebrow:'CAPTURA REAL',zoom:1,position:'top'})),
 F('13–17','Preparación con participación','Detalle de manos ordenando tres hojas; corte motivado por la hoja que entra en la carpeta. Tutor y joven siguen en el mismo espacio.','art',art('b1',3,'Tú aportas. Nosotros preparamos.')),
 F('17–20','Del interés a entender cómo','Corte a la ficha real con zoom al siguiente paso. El último encuadre conecta con el arranque del vídeo de cierre.','ui',screen('servicio','Mira el recorrido desde tu celular.',{zoom:1.4,position:'bottom',dark:true}))
];
const b2 = [
 F('00–04','El celular en la vida real','Plano sobre el hombro del tutor, teléfono de espaldas a cámara. No generar una pantalla dentro de sus manos; la UI aparecerá en insert separado.','art',art('b2',0,'Tu proceso cabe en tu día.')),
 F('04–08','Servicio y alcance','Corte limpio al teléfono frontal con ficha real. Pequeño dolly digital hacia el nombre; pausa suficiente para leer.','ui',screen('servicio','Elige Visa Juvenil Básico',{eyebrow:'CAPTURA REAL',zoom:1,position:'top'})),
 F('08–13','El acceso es personal','Cut-in a registro real vacío. Zoom contenido sobre nombre, correo y teléfono, sin llenar los campos ni crear una cuenta.','ui',screen('registro','Crea tu cuenta',{eyebrow:'CAPTURA REAL',zoom:1.12,position:'top'})),
 F('13–18','La decisión se toma con claridad','Volver a las manos del tutor revisando un documento; bolígrafo inmóvil. Insert conceptual sobre la lectura antes de firmar.','art',art('b2',1,'Tu contrato, antes de firmar.','Revisa el alcance y las condiciones.')),
 F('18–23','Inicio del servicio','Plano detalle de tarjeta sin datos y teléfono. Texto editorial explica firma + pago inicial confirmado; ningún cobro se representa como realizado.','art',art('b2',2,'Pon en marcha tu caso.','Firma + pago inicial confirmado')),
 F('23–28','Menos papeles dispersos','Match cut de la tarjeta a Mis documentos real. La cámara se mantiene frontal para que el contenido se lea.','ui',screen('documentos','Tus documentos, en un lugar',{eyebrow:'CAPTURA REAL',zoom:1,position:'top'})),
 F('28–34','El siguiente paso tiene una acción','Insert ampliado de la sección documental. Resaltar «Subir documento» con una marca editorial; no mostrar cargas o resultados inexistentes.','ui',screen('documentos','Comparte. Completa. Avanza.',{zoom:1.65,position:'top',dark:true})),
 F('34–40','El acompañamiento se siente humano','Plano de cierre del tutor y el joven. Respiración y mirada natural, expediente ordenado. Sin festejar un resultado de inmigración.','art',art('b2',3,'Tecnología con personas a tu lado.')),
 F('40–45','La siguiente decisión','Corte a fondo navy y app real centrada. Título breve; entran las dos decisiones del modal con movimiento corto y limpio.','type',{eyebrow:'CONTYGO',headline:'Empieza con todo claro.',subline:'Ir a mi contrato · Hablar con un agente',dark:true,screen:`${ui}/servicio.png`})
];
const c1 = [
 F('00–03','Una pregunta que engancha','Título grande aparece por máscara vertical. Teléfono con ficha real entra de abajo y se detiene frontal. Sin giro continuo que dificulte leer.','ui',screen('servicio','¿Qué es la Visa Juvenil?',{eyebrow:'CONTYGO / SIJS',zoom:1,position:'top',dark:true})),
 F('03–06','Contexto sin dramatización','Corte tipográfico: tres palabras entran una a una con 120 ms de separación. El vídeo explica condiciones, no atribuye una historia al visitante.','type',{eyebrow:'PARA CIERTOS MENORES',headline:'Abandono. Abuso. Negligencia.',subline:'Una posibilidad según los requisitos de cada caso.'}),
 F('06–10','Dos etapas, no una promesa','Diagrama editorial de dos tarjetas: orden estatal y petición I-360. La cámara se acerca al segundo nodo; no usar checks de aprobado.','type',{eyebrow:'EL RECORRIDO',headline:'Orden estatal → I-360',subline:'La clasificación SIJS tiene requisitos específicos.',dark:true}),
 F('10–13','La solución aparece en pantalla','Match cut del segundo nodo a la ficha real del servicio. Deslizar el plano de la app hasta quedar frontal y nítido.','ui',screen('servicio','Preparación con ContyGo',{eyebrow:'CAPTURA REAL',zoom:1.18,position:'top'})),
 F('13–17','Organización que puedes ver','Corte a Mis documentos. Acercar primero la tarjeta de identidad y luego la de domicilio. No mostrar datos ni archivos reales de clientes.','ui',screen('documentos','Orden para avanzar.',{zoom:1.4,position:'top'})),
 F('17–20','El segundo vídeo es el siguiente paso','La pantalla vuelve a la ficha del servicio; detener el movimiento y dejar el título de puente legible. Match cut al cierre.','ui',screen('servicio','Ahora, conoce la app.',{zoom:1.45,position:'bottom',dark:true}))
];
const c2 = [
 F('00–04','La app toma el protagonismo','Comenzar con la ficha real del final anterior; zoom inverso que descubre un teléfono completo. Título en dos líneas, nada de UI minúscula.','ui',screen('servicio','Todo empieza aquí.',{eyebrow:'CONTYGO',zoom:1,position:'top',dark:true})),
 F('04–08','Conoce el servicio','Corte a primer plano del paquete en la ficha. Cámara digital se desplaza hacia «Crear contrato» y frena antes del corte.','ui',screen('servicio','Servicio y alcance, claros.',{zoom:1.55,position:'bottom'})),
 F('08–13','Crea tu cuenta','Match cut entre botones y registro real. Zoom desde 1× hasta 1,12×, manteniendo el texto recto. Campos vacíos.','ui',screen('registro','Tu cuenta. Tu proceso.',{eyebrow:'CAPTURA REAL',zoom:1.12,position:'top'})),
 F('13–18','Antes de firmar','Interludio editorial: el título se separa en tres bloques «Revisa / Entiende / Firma». La ficha real queda como contexto; no simular pantalla de firma.','type',{eyebrow:'ANTES DE DECIDIR',headline:'Revisa. Entiende. Firma.',subline:'Alcance y condiciones por escrito.',screen:`${ui}/servicio.png`,dark:true}),
 F('18–23','Qué activa el caso','Corte gráfico a firma + pago inicial confirmado. Dos tarjetas editoriales se alinean y forman un único bloque; no es una pantalla de pago real.','type',{eyebrow:'ACTIVACIÓN DEL SERVICIO',headline:'Firma + pago inicial confirmado',subline:'Así comienza la preparación.'}),
 F('23–28','Documentos en un solo lugar','Corte al teléfono con la pantalla real de Mis documentos. Escala grande, leve inclinación sólo durante entrada; al leer queda frontal.','ui',screen('documentos','Comparte tus documentos',{eyebrow:'CAPTURA REAL',zoom:1,position:'top'})),
 F('28–34','Zoom a la acción','Acercamiento al botón «Subir documento». El foco editorial se mueve de identidad a domicilio. Ningún estado de archivo se transforma en completado.','ui',screen('documentos','La app te muestra dónde.',{zoom:1.75,position:'top',dark:true})),
 F('34–40','Orden y acompañamiento','Pull-back y corte a una línea editorial con tres ideas. El vínculo al equipo se explica con texto; no inventar mensajes ni estados del portal.','type',{eyebrow:'TU INFORMACIÓN + NUESTRO EQUIPO',headline:'Preparación. Avances. Soporte.',subline:'Sabes qué te corresponde y qué sigue.',screen:`${ui}/documentos.png`}),
 F('40–45','Cierre de conversión','La app baja suavemente, el check queda centrado y aparecen dos acciones. Mantener tres segundos de lectura estable, sin fundido que corte la decisión.','type',{eyebrow:'CONTYGO',headline:'Tu siguiente paso, desde el celular.',subline:'Ir a mi contrato · Hablar con un agente',dark:true,screen:`${ui}/servicio.png`})
];

function board(id,title,duration,frames) {
 const available = fs.existsSync(path.join(root,'boards',`${id}.png`));
 const cues = id.endsWith('1') ? serviceCues : closingCues;
 frames.forEach((frame,index)=>{frame.voiceLine=cues[index];});
 if(id.endsWith('1')) frames[2].subline = 'I-485 se contrata por separado.';
 if(id.endsWith('2')) {
  frames[7].title = 'Entregables y acompañamiento';
  frames[7].headline = 'Tus documentos preparados.';
  frames[7].subline = 'Según el alcance de tu servicio.';
  frames[7].motion = id === 'c2' ? 'Pull-back de la app y corte a una gráfica editorial de entregables. No mostrar una descarga, pantalla de entrega ni aprobación que no están documentadas.' : 'Corte a la familia junto al expediente organizado. La carpeta representa los documentos preparados del servicio; no un resultado o aprobación migratoria.';
 }
 return {id,title,duration,ratio:'9:16',frames,prompts:[],download:available ? `${base}/boards/${id}.png` : null,available,note};
}
const data = {
 title:'Una historia. Tres formas de contarla.',
 subtitle:'Visa Juvenil + plataforma ContyGo · seis storyboards completos · formato móvil 9:16',
 voice:{service,closing,direction},
 references:[
  {title:'Papel con profundidad',image:`${base}/references/01-papercraft-reference.jpg`,pin:'https://www.pinterest.com/pin/913315999448692992/',note:'Referencia observada de personajes y escena construidos con papel. Aplicación: fibras, bordes y capas en los personajes propios de ContyGo; conservar el verde, navy y blanco.'},
  {title:'Cercanía humana',image:`${base}/references/02-lifestyle-family-phone.jpg`,pin:'https://www.pinterest.com/pin/897201557052561300/',note:'Fotografía fija observada de una familia usando el celular. Tomamos la cercanía y luz suave; el reparto propuesto es un tutor y un adolescente, con vestuario ContyGo.'},
  {title:'La aplicación al centro',image:`${base}/references/03-parallax-ui-video-frame.jpg`,pin:'https://www.pinterest.com/pin/492649950863739/',note:'Fotograma observado de un pin de vídeo: teléfono frontal y tarjetas con profundidad. Los cortes, zooms y su ritmo descritos aquí son dirección propia, no movimientos verificados de ese vídeo.'}
 ],
 styles:[
  {id:'a',name:'01 · Animación ContyGo',description:'Papel con profundidad, personas y objetos cálidos sobre blanco. Las pantallas reales entran como inserts nítidos. Una propuesta cercana y distintiva.',boards:[board('a1','Visa Juvenil · Animación ContyGo','20 s',a1),board('a2','La plataforma · Animación ContyGo','45 s',a2)]},
  {id:'b',name:'02 · Cine con humanos',description:'Un tutor y un joven en un entorno real. Luz de ventana, manos y miradas naturales. Cortes de detalle conectados con la interfaz auténtica.',boards:[board('b1','Visa Juvenil · Cine con humanos','20 s',b1),board('b2','La plataforma · Cine con humanos','45 s',b2)]},
  {id:'c',name:'03 · App en movimiento',description:'La aplicación al centro: inserts, recortes, acercamientos y tipografía. Gráficos editoriales explican las etapas; las capturas se conservan tal como son.',boards:[board('c1','Visa Juvenil · App en movimiento','20 s',c1),board('c2','La plataforma · App en movimiento','45 s',c2)]}
 ]
};
fs.writeFileSync(path.join(root,'data.json'),JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(path.join(root,'voz-servicio-20s.txt'),service+'\n');
fs.writeFileSync(path.join(root,'voz-cierre-45s.txt'),closing+'\n');
fs.writeFileSync(path.join(root,'direccion-de-voz.txt'),direction+'\n');
let script = '# ContyGo · Dos vídeos, tres tratamientos\n\n'+note+'\n\n## Voz en off\n\n### Vídeo 1 · 20 segundos\n\n'+service+'\n\n### Vídeo 2 · 45 segundos\n\n'+closing+'\n\n### Interpretación\n\n'+direction+'\n\n';
for (const style of data.styles) {
 script += '## '+style.name+'\n\n'+style.description+'\n\n';
 for (const film of style.boards) {
  script += '### '+film.title+' · '+film.duration+'\n\n| Tiempo | Plano e intención | Cámara y corte | Voz en off |\n|---|---|---|---|\n';
  for (const frame of film.frames) script += `| ${frame.time} | ${frame.title} | ${frame.motion} | ${frame.voiceLine} |\n`;
  script+='\n';
 }
}
script+='## Producción y exactitud\n\nLas tres rutas comparten la misma voz, mensaje, alcance y duraciones para poder comparar el estilo. El vídeo 1 explica el servicio; el vídeo 2 demuestra el recorrido y termina con dos acciones reales del modal. No son bucles.\n\nPara Grok, el vídeo 1 se divide en 2 bloques de 10 segundos y el cierre en 3 bloques de 15 segundos. Los guiones gráficos aquí son las vistas previas completas solicitadas, no una única referencia para pedir 45 segundos en una llamada. Después de elegir tratamiento se fijan las fichas de identidad y los storyboards por bloque, aprovechando estas imágenes sin regenerar lo válido.\n\nLa animación generada se usa para personajes y objetos. Texto, marca y capturas reales permanecen como capas nítidas en montaje. La voz en off que produzca el usuario se conserva como pista original; pedir sólo foley suave, sin música ni narrador adicional en las generaciones. El usuario opera Grok.\n\nCapturas públicas utilizadas: ficha Visa Juvenil Básico, registro vacío y Mis documentos vacío. No hay datos de clientes, pantallas de administrador o estados inventados. Firma, pago, avance y soporte aparecen en inserts conceptuales o textos editoriales cuando no tenemos una captura pública específica. La pantalla de documentos corresponde a la biblioteca de cuenta; no se presenta como un checklist de requisitos de Visa Juvenil.\n\nPrecio, condiciones de reembolso y decisiones se mantienen en la UI para poder actualizarlos; estos vídeos no incorporan una promoción ficticia o un contador. Visa Juvenil Básico no incluye I-485 ni tasas gubernamentales. No se muestran tarjetas de residencia, aprobaciones, promesas de resultados ni representación legal.\n\n## Fuente de la explicación de SIJS\n\nUSCIS describe la clasificación para ciertos menores sujetos a procedimientos estatales relacionados con abuso, abandono o negligencia parental, con determinaciones judiciales específicas. La explicación del vídeo es introductoria; no sustituye evaluar elegibilidad ni enumera todos los requisitos. [Folleto oficial USCIS]('+source+'). Consultado el 14 de septiembre de 2026. Se conserva sólo el resumen de requisitos, no referencias a acción diferida ni plazos de decisiones.\n';
fs.writeFileSync(path.join(root,'guion-y-direccion.md'),script);
console.log(JSON.stringify({boards:data.styles.flatMap(s=>s.boards).length,serviceWords:service.split(/\s+/).length,closingWords:closing.split(/\s+/).length,folder:root}));
