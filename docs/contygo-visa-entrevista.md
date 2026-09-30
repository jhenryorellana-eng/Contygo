# Visa Juvenil: vídeo → entrevista → ContyGo

Implementación local del 17 de septiembre de 2026. Dirección actual: vídeo inmersivo sin controles, pausa de marca y transformación hacia un asistente claro con voz y texto. Identidad original de `06_Branding`: marino #061B3D, verde #25D366, verde profundo #087F46 y blanco frío #F6F8F7; Nunito y Nunito Sans. Los PNG originales se conservan en `public/contygo/brand`. Solo afecta a Visa Juvenil en V5 y al modal de conversión de la landing principal.

## Recorrido

1. Vídeo introductorio existente, a velocidad original, sin controles de pausa, avance ni ampliación. Pantalla completa del modal en móvil; el encuadre conserva su proporción. Cierre siempre disponible. Un botón permite comenzar si el navegador bloquea el autoplay o continuar si el sistema interrumpe la reproducción.
2. El vídeo se desvanece hacia el logo original sin cápsula. La pausa de marca dura unos dos segundos; el logo sube y la interfaz se reconstruye con una máscara de arriba abajo, seguida del texto y los controles. La transición dura aproximadamente cuatro segundos y tiene alternativa para movimiento reducido.
3. Residencia del joven, fecha completa de nacimiento, estado, pruebas del abandono y, solo si faltan pruebas, posibilidad de conseguir testigos.
4. Gemini interpreta respuestas libres o audio grabado bajo acción expresa. Los botones, fechas exactas y estados se validan directamente en servidor, sin esperar interpretación del modelo. La voz usa Gemini 3.8 Live con Laomedeia; el texto avanza según el reloj de reproducción y la nube de luz inferior reacciona al volumen real (RMS), con ataque y caída suavizados. La locución final termina antes de transformar el chat en el botón.
5. Completar todas las respuestas comprime y desvanece el chat desde el compositor hasta el símbolo de marca y el CTA; aparece «Ya diste el primer paso». Cinco cohetes escalonados, con estela, halo y partículas verdes y blancas, repiten ciclos de 6,2 s hasta pulsar «Conocer la propuesta». El botón se contrae en el símbolo, asciende y se abre hasta el encuadre 16:9; revela el primer fotograma del segundo vídeo antes de iniciar su reproducción, con las mismas zonas de luz superior e inferior. La celebración reconoce completar preguntas, no una elegibilidad. La orientación y sus fuentes permanecen en un desplegable cerrado. Las respuestas negativas también desbloquean el avance.
6. El segundo vídeo se transforma en una hoja y muestra una invitación al contrato. El CTA «Revisar mi contrato» conserva el enlace real a ContyGo. Se eliminó la sección local de precios, planes y pago de este recorrido. La ilustración documental no es un contrato firmado; el documento real se revisa dentro de ContyGo.

Vídeo 2 temporal autorizado por el usuario: `/contygo/hero-video-v2/01-elige-desktop.mp4`. Sustituir en `lib/contygo-rebuild-media.ts` cuando exista el cierre final.

Ambos vídeos conservan 16:9 sin tarjeta, borde ni sombra; en móvil vertical ocupan todo el ancho. Dos zonas de luz difusa se sitúan arriba y abajo, sobre azul marino. La vista local `/contygo-motion/visa-transicion` permite probar el recorrido con un clip de seis segundos o abrir el vídeo completo de 125 segundos con subtítulos; devuelve 404 en producción.

### Material líquido — corrección del 17 de septiembre

**Revisión vigente: reacción dentro del chat.** El historial permanece nítido. Al enviar, una luz verde/blanca recorre el cristal del compositor y aparece «Preparando tu siguiente paso…» junto al campo. La respuesta se presenta al llegar de Gemini, sin sumar una espera visual de salida. La entrada del mensaje dura 280 ms; las palabras conservan la sincronización con la voz. `ThinkingOverlay.tsx` mantiene su API reutilizable, pero el chat ya no usa el overlay completo. `LiquidGlow` conserva las zonas difuminadas del vídeo y la respuesta RMS a la voz. No se afirma reproducción a 60 fps medida en dispositivos físicos.

`VisaStatePicker` reemplaza el panel blanco por una hoja azul translúcida, con desenfoque de 24 px, buscador de vidrio y filas abiertas. Conserva las 51 ubicaciones, búsqueda sin acentos, navegación con teclado, Escape y retorno del foco. `VisaJourneyReveal` contiene la escena de finalización y su celebración, con alternativa de movimiento reducido.

El campo de respuesta se elevó para dejar aire por debajo. El vídeo termina comprimiéndose en una franja luminosa; la luz revela el logo, que se desplaza al encabezado mientras se despliega el chat. El fondo de voz reutiliza `LiquidGlow` con RMS real. Se conservan los subtítulos externos y la velocidad del MP4.

Demo local independiente: «Probar efecto de respuesta» en `/contygo-motion/visa-transicion`; espera simulada de 1,2 s, mensajes de muestra y sin petición a Gemini. Componentes `ThinkingOverlayDemo.tsx/.module.css`. «Ver transición del chat al botón» muestra primero el chat de ejemplo durante 2,4 s y luego reproduce su transformación, celebración y acceso al vídeo 2. También se abre con `?demo=final`; utiliza respuestas ficticias sólo en desarrollo. El recorrido «Probar vídeo y chat» sí utiliza la integración real.

Las notas siguientes conservan la procedencia de las iteraciones anteriores; la revisión vigente descrita arriba prevalece.

- Corrección basada en las cuatro capturas del usuario: conversación abierta, sin tarjeta exterior, encabezados promocionales ni cápsula del logo. Cristal únicamente en el campo de escritura. Se retiró el texto inferior solicitado.
- `placement="basin"`: nube focal difuminada anclada en la parte inferior, sin líneas, horizonte ni olas. La voz real modula luz y expansión sin desplazar el centro. `placement="halo"`: nube para los espacios encima y debajo del vídeo, sin dibujar un marco. Tres masas gaussianas rotan y se deforman suavemente; mantienen pausa al ocultar y alternativa estática para movimiento reducido.
- Paleta de `BrandLiquidSurface`: sólo #061B3D, #25D366, #087F46 y #F6F8F7; las transparencias y mezclas son del material. Se eliminaron las luces celestes y turquesas de la primera prueba.
- `LiquidGlassPlate` desplaza el fondo mediante un mapa de refracción en SVG dentro de Chromium; mantiene una alternativa con desenfoque CSS. Texto e iconos son capas HTML independientes, sin distorsión. La integración es una adaptación web, no el material nativo de Apple. Safari/iPhone no tienen verificada la refracción SVG y reciben la alternativa CSS.
- Referencias observadas: [Pinterest / azul](https://www.pinterest.com/pin/844493676125232/), [Pinterest / cristal](https://www.pinterest.com/pin/246994360809226530/), [Pinterest / composición centrada](https://www.pinterest.com/pin/248472104438799573/), [Fluid Gradient](https://codepen.io/sabosugi/full/gbMzzLp) y [Fluid Glass](https://chiuhans111.github.io/fluidglass/). Se reutilizaron como inspiración, sin copiar su código ni sus medios.
- Los cuatro MP4 aportados se inspeccionaron mediante muestras temporizadas en `output/contygo-liquid/references`: logo estable sobre masas cambiantes, iluminación de borde, ambiente azul/verde y refracción de cápsula. El texto y logo conservan su forma.

## Voz Live y respuesta de botones — revisión vigente

`lib/agent/visa-live-config.ts` fija `gemini-3.8-live` y la voz `Laomedeia`, en reemplazo de Aoede. La dirección vigente pide una anfitriona expresiva, carismática y enérgica, con presencia a volumen conversacional, contrastes de entonación y humor cómplice. El saludo incluye «Esto no es un examen; vamos paso a paso»; las preguntas sobre abandono mantienen sensibilidad y respeto. La lectura sigue siendo literal. `/api/agent/visa-live-speech` transmite todos los fragmentos PCM16 mono de 24 kHz mediante NDJSON; la clave permanece en el servidor. El reproductor agenda fragmentos consecutivos con el reloj de Web Audio, sin esperar el archivo completo. El SDK se excluye del empaquetado de servidor de Next 14 para evitar el error real `bufferUtil.mask is not a function`.

El relay de una sola locución finaliza al recibir `generationComplete` (o `turnComplete`), después de procesar las últimas partes del mensaje. Se corrigió un fallo observado: Gemini ya había generado el saludo, pero difería `turnComplete` mientras esperaba su reproducción supuesta y se activaba un timeout de inactividad. La reproducción real continúa en Web Audio hasta terminar; no depende de mantener el socket abierto. El endpoint TTS antiguo conserva una coincidencia literal con su saludo original para no devolver ese WAV al solicitar el nuevo texto.

Las siete locuciones públicas (saludo, cinco preguntas y cierre) se generaron con ese mismo modelo y voz en `public/contygo/audio/live/`. `scripts/prepare-visa-live-voice.cjs` verifica cada una mediante una transcripción independiente antes de guardarla. El nombre depende del hash de modelo, voz, instrucciones de interpretación y texto, mediante `visaLiveSpeechIdentity`: cambiar el tono o el guion selecciona una grabación nueva, conservando los originales. Una conversación ya abierta conserva sus audios en memoria hasta cerrar el modal. Ninguna respuesta personal se guarda en estos archivos. Se precargan con dos solicitudes concurrentes durante el vídeo; hasta ocho audios decodificados permanecen sólo en memoria y se eliminan al cerrar.

Las preguntas de botones ya no pasan por una consulta de texto antes de hablar. Las respuestas libres conservan la interpretación de Gemini y sus validaciones; su locución usa Live. Al responder, se detienen todas las fuentes anteriores; los resultados cancelados no pueden volver a sonar. La lectura tolera paquetes divididos y rechaza audio incompleto. Silenciar detiene la voz; reactivarla reproduce la frase actual. Si el navegador bloquea audio, se conserva el botón para activarlo. Los WAV y endpoint TTS anteriores se conservan como recursos previos, pero este recorrido utiliza el endpoint Live.

Mediciones locales de esta revisión: validación canónica caliente 16–23 ms; carga de la locución preparada 13–14 ms antes de la precarga. Una locución Live nueva empezó en 2,8 s y terminó de recibirse en 6,3 s. No son garantías de latencia para otros dispositivos o redes. El texto de los WAV sigue su duración exacta; las respuestas Live usan una estimación monótona hasta recibir su duración completa, no alineación fonética palabra por palabra.

Referencia de implementación: [Live API de Gemini](https://ai.google.dev/gemini-api/docs/live-api/capabilities) y [dependencias externas en Next 14](https://nextjs.org/docs/14/app/api-reference/next-config-js/serverComponentsExternalPackages).

## Subtítulos externos del vídeo 1

`public/contygo/films/visa-juvenil-v1.es.vtt` contiene 38 bloques de una o dos líneas. Proceden de la alineación por palabra del audio original, con +4,000 s por la intro. La correlación de cuatro tramos con el MP4 servido confirmó el mismo desplazamiento sin cambio de velocidad; evidencia y generador en `output/contygo-video1-captions`.

`ExternalVideoCaptions` usa los eventos `cuechange` del track nativo en modo `hidden`: el reloj del vídeo decide el texto, que se presenta en HTML debajo de la imagen. El usuario puede ocultarlo o mostrarlo sin alterar reproducción. No se modificó el MP4 ni se añadieron subtítulos sobre su imagen. La comprobación móvil de 390 × 844 confirmó ancho completo y 16:9; la de escritorio 1280 × 720 confirmó que el texto y su control caben en pantalla. No hay comprobación en un iPhone físico.

## Referencias de movimiento

- [Codrops Fullscreen Clip Effect](https://tympanus.net/Development/FullscreenClipEffect/): contracción de imagen a cápsula y conservación de continuidad espacial.
- [Logo load screen, Vitaly Pavlenko](https://codepen.io/vital-pavlenko/pen/EbBBRV): barrido de relleno observado en escritorio y preview móvil. La duración de dos segundos es una adaptación propia.
- [Codrops Morphing Buttons, Video Player](https://tympanus.net/Development/ButtonComponentMorph/index6.html): transformación del botón a panel de vídeo observada en escritorio.

La composición, despliegue vertical, fondos y adaptación responsive pertenecen a esta implementación. Las nuevas capturas del usuario prevalecen sobre las propuestas anteriores de tarjetas.

## Límites y continuidad

- Selector: 50 estados y Washington D. C., más «Por confirmar».
- Fecha real, cumpleaños exacto y límite federal se calculan; no se inventa una fecha a partir de una edad.
- Reglas documentadas para CA, NY, MD, MA, CO, WA, NJ y NC. Otros estados requieren revisión individual. Las fuentes y condiciones están en `lib/agent/visa-state-rules.ts`. No constituye un dictamen ni un estudio completo de las 51 jurisdicciones.
- Respuestas solo en memoria del modal, sin guardarlas en CRM, almacenamiento del navegador ni registros. Se envían a Gemini para la conversación.
- Si Gemini falla, se usa el guion guiado de respaldo; los botones permiten continuar. Si falla la voz, se muestra el texto y un botón para reintentar.
- Micrófono opcional: grabaciones de hasta 25 segundos. Se cancela al repetir/cerrar; no se escucha continuamente.

## Experiencia compartida por servicio · septiembre 2026

Los 12 servicios del catálogo utilizan el mismo reproductor inmersivo, transición de marca, chat con voz y texto, celebración y acceso a la propuesta. `VisaJuvenilExperience` recibe el identificador y nombre del servicio; conserva la entrevista específica de Visa Juvenil. `lib/agent/service-intake.ts` reutiliza literalmente los ocho cuestionarios restantes de `lib/services.ts`, incluidos opciones y documentos de Impuestos. Evaluación de asilo, Reapertura y LLC no tenían cuestionario allí: tienen dos preguntas de orientación propias, identificadas como complementarias en el código.

`/api/agent/service-intake` valida botones sin consultar al modelo; Gemini interpreta únicamente texto libre o audio para la pregunta actual. No usa las antiguas reglas de elegibilidad ni emite conclusiones jurídicas o fiscales. Todas las respuestas válidas, también negativas o listas vacías confirmadas, permiten completar el recorrido. Respuestas y conversación permanecen en memoria del modal. Se precargan las locuciones públicas del servicio durante el vídeo.

Cada servicio conserva su vídeo asignado. Donde no existe presentación se muestra una entrada de marca con «Comenzar»; un fallo de vídeo ofrece reintentar o continuar a las preguntas. Los segundos vídeos comerciales de los demás servicios siguen pendientes: la etapa de propuesta reutiliza la vista existente de plataforma y contenido del servicio, seguida de su acceso al contrato o evaluación. No se asigna el vídeo juvenil indiscriminadamente.

`tests/service-intake.test.cjs` cubre procedencia de preguntas, los 12 servicios, orden, respuestas negativas, checklist, aislamiento de campos, interpretación y fallo de Gemini, y validación del endpoint. Las pruebas previas de Visa Juvenil y reproducción de voz se conservan.

Comprobación local de esta extensión: TypeScript y 51 pruebas aprobadas. En navegador se verificó reproducción real sin controles de Impuestos, selección y envío de ID/W-2 ficticios, acceso a su propuesta y enlace de contrato `/servicios/taxes`; también entrada de LLC sin vídeo y avance con dos respuestas negativas. Se corrigieron el contraste de los pies de la vista previa y el desbordamiento horizontal causado por el resplandor en móvil.

## Configuración

Reutiliza el cliente y la clave Gemini del proyecto. Variables opcionales: `GEMINI_VISA_INTAKE_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`. La clave permanece en servidor. En desarrollo, Next necesita acceso de red a Gemini; con la red del sandbox bloqueada se obtiene `EACCES` y modo guiado.

## Comprobación

- TypeScript y pruebas en `tests/visa-intake.test.cjs`, `tests/contygo-flow.test.cjs`, `tests/visa-voice.test.cjs` y `tests/visa-live-stream.test.cjs`: incluyen reproducción antes del fin del stream, interrupción de varias fuentes, silencio, desmontaje, paquetes divididos, aborto durante lectura pendiente y acceso a los audios públicos preparados.
- Navegador: autoplay inicial, transición, texto durante voz real, respuestas por botones y fecha escrita, búsqueda de estado, pregunta condicional de testigos, bloqueo y posterior desbloqueo, vídeo 2 reproduciéndose, conservación al volver.
- HTTP real: Gemini interpreta texto libre y audio sintético, TTS devuelve WAV y un recorrido con respuestas negativas finaliza correctamente.
- Revisión visual en móvil y escritorio. Sin prueba de grabación con el micrófono físico del usuario; su ciclo de permisos y cancelación se comprobó con simulaciones del navegador.
