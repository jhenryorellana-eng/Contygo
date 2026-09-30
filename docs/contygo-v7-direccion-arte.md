# ContyGo · V7 «El hilo verde» · Dirección de arte

Propuesta del 27 de septiembre de 2026. Se ve en **`/contygo-app/v7`**. La V6 sigue intacta en `/` y en `/contygo-app/v5`. Código: `components/contygo/v7/` (`ContygoLanding.tsx`, `GreenThread.tsx`, `ContygoLanding.module.css`).

## La idea en una frase

El símbolo de ContyGo ya cuenta la historia: una **curva marina** que desemboca en un **check verde**. El titular «Tu historia sigue. El siguiente paso, ContyGo.» dice lo mismo con palabras. La V7 convierte esa lectura en el sistema de toda la página: la cinta de papel del hero sale de su imagen y se convierte en un hilo. Ese hilo acompaña la lectura, enciende los cuatro pasos del recorrido y termina convertido en el trazo largo del check. «Siempre contigo. Paso a paso» deja de ser un eslogan y se ve en la página.

> **APUESTA:** «la curva es tu historia, el check es tu siguiente paso» es una interpretación nuestra, no el significado oficial del logotipo. Si el usuario la adopta, pasa a ser la narrativa de marca. Hoy aparece como frase bajo el símbolo del cierre.

## Tres materiales, tres significados

Regla de uso del color. Los storyboards de `material-de-diseno/storyboards-digitales/` ya la cumplen: base marina, hoja verde que asciende y papel crema.

| Material | Color | Significa | Se usa en |
|---|---|---|---|
| Tinta marina | `#061B3D` | Tu historia: base, suelo, confianza | Texto principal, bases de las esculturas, lámina del registro |
| Hilo verde | `#25D366` · texto `#087F46` | El siguiente paso: lo que avanza o se puede pulsar | Hilo, botones, pasos alcanzados, números de paso |
| Papel | `#FFFFFF` · `#F6F8F7` | Tu información | Tarjetas, documentos, pantallas |

El verde **nunca es decoración**. Si algo es verde, avanza o se puede pulsar. En modo oscuro el fondo es el marino de marca, nunca negro.

## Vocabulario de movimiento

Sale directamente del mecanismo de los storyboards: pieza compacta → se abre → ordena → se guarda.

| Verbo | En la web | Estado |
|---|---|---|
| **Desplegar** | Las piezas entran girando desde su línea de pliegue (`rotateX 22° → 0`, 0,95 s, ligera amortiguación). Sustituye al *fade-up* genérico. | Implementado |
| **Enhebrar** | El hilo se dibuja con el scroll. Por delante se ve un camino punteado y detrás queda verde lo recorrido. | Implementado |
| **Ordenar** | Al filtrar el catálogo, las filas se colocan como fichas en separadores. | Pendiente |
| **Guardar** | El diálogo del servicio se abre desde su tarjeta y vuelve a ella (`ServiceCinemaDialog`). | Ya existía |

Reglas:

- Un solo protagonista en movimiento por pantalla, y el movimiento explica algo.
- Con `prefers-reduced-motion` el hilo aparece completo y quieto, el símbolo visible y sin entradas animadas.
- Sin JavaScript la página se lee entera: los pasos aparecen encendidos y el símbolo visible.

## Cómo funciona el hilo

`GreenThread.tsx` lee anclas `data-thread` del DOM y traza una curva Bézier que pasa por estos puntos:

1. Salida de la cinta de la imagen del hero (23 % del ancho de la imagen).
2. El margen izquierdo durante los servicios.
3. Los cuatro puntos del recorrido. En escritorio el hilo los cruza en horizontal y ese tramo se dibuja mientras la sección pasa por la pantalla. En móvil se convierte en una línea de tiempo vertical.
4. El margen derecho en escritorio, o el izquierdo en móvil, junto a la plataforma, el registro y las preguntas.
5. La punta del trazo largo del check (73,7 %, 23,4 % de `symbol-*.png`). Al llegar, el símbolo se revela desde esa punta hasta la curva.

La cabeza del hilo sigue una línea situada al 62 % de la altura de la pantalla. Las posiciones se miden con `offsetTop`, así que no las alteran las animaciones de despliegue. El trazado se recalcula cuando la página cambia de tamaño, por ejemplo al filtrar el catálogo. Si la persona salta con un ancla, el hilo aterriza cerca del destino sin repetir el recorrido.

## Tipografía y legibilidad

La V6 tenía etiquetas de 6–9 px en móvil y textos de lectura de 11–12 px. La V7 fija este suelo: **12 px** para etiquetas en mayúsculas, **14 px** para texto secundario y **16–18 px** para lectura. Se mantienen Nunito 800 para títulos, por su parentesco con el logotipo redondeado, y Nunito Sans para el cuerpo.

- Referencia: Apple HIG usa 17 pt como tamaño de cuerpo por defecto y fija 11 pt como mínimo ([HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)). La página oficial no se pudo leer sin JavaScript. El dato está verificado a través de un resumen secundario ([learnui.design](https://www.learnui.design/blog/ios-font-size-guidelines.html)), nivel **B**.
- **APUESTA:** entre los visitantes hay padres y tutores que leen en el celular y agradecen texto grande. No hay analítica en esta carpeta que lo confirme.

## Confianza: por qué el registro va arriba y en tinta marina

USCIS advierte que un *notario público* no está autorizado a prestar servicios legales de inmigración. En muchos países hispanohablantes, en cambio, el «notario» sí es abogado ([USCIS · Common Scams](https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/common-scams), nivel **A**). El visitante puede llegar con una desconfianza aprendida. Consecuencias en el diseño:

- La prueba verificable se ve desde el hero. «Consultor de inmigración registrado en Utah» enlaza al registro.
- El registro vive en una lámina marina con grano de papel, en los dos temas: es el momento más serio de la página.
- El aviso «no es abogado» se mantiene visible. Nunca se usan sellos, escudos oficiales ni lenguaje de aprobación. El check significa *paso dado*, no *caso aprobado*.

## De V6 a V7, sección por sección

| Sección | Cambio |
|---|---|
| Cabecera | Fija y translúcida al bajar. Cuando el botón del hero sale de pantalla aparece «Mi servicio». Se añade «Preguntas». |
| Hero | Mismo titular. El subrayado de «ContyGo.» se dibuja como hilo. Tres pruebas legibles sustituyen a la barra de micro-textos. La imagen se apoya en su borde inferior para que la cinta salga del marco y continúe como hilo. |
| Servicios destacados | Tarjetas como hojas de papel con sombra de contacto y esquina doblada, que se despliega al pasar el cursor. La insignia dice «Guía en vídeo · 2:05». |
| Catálogo | Iconos por categoría (familia, asilo, corte, impuestos, empresa), etiqueta de categoría en cada fila y filtros desplazables en móvil. |
| Recorrido | El hilo cruza los cuatro pasos. Cada número se enciende cuando el hilo llega a él. |
| Plataforma | El teléfono con la UI real se apoya en una base marina, como las esculturas de los storyboards, en lugar de flotar entre elipses. |
| Registro | Lámina marina con grano, en claro y en oscuro. El componente `CertificateShowcase` no se modificó. |
| Cierre | El hilo llega y el símbolo se revela. Debajo: «La curva es tu historia. El check, tu siguiente paso.» |

Los textos comerciales y legales son los de la V6, salvo las tres pruebas del hero y la frase del símbolo.

## Pendiente para culminar (requiere decisión del usuario)

1. **Clips de Grok.** Recomendación: el hero se queda con la cinta, porque es el origen del hilo. El storyboard `01-HERO` (el símbolo que se abre, ordena y se guarda) va al **cierre**, como bucle que sustituye al barrido estático cuando el hilo llega. Los storyboards `02–04` se integran en sus tarjetas: el póster es el estado compacto y el vídeo se reproduce sólo mientras la tarjeta está en pantalla.
2. **Prueba social.** El 14 de septiembre el usuario confirmó «más de 500 clientes atendidos» (no son casos aprobados). La V6 pidió respaldo antes de publicarlo. No se muestra hasta que se decida.
3. **Precio «desde» en los destacados.** La estructura comercial lo pide cerca de la acción. El catálogo tiene precios verificados el 10 de septiembre. No se muestra hasta que se decida.
4. **Presencia humana.** La marca dice «Personas + tecnología» y la página no muestra ninguna persona real. Opciones: foto del consultor junto al registro, o testimonios de `public/testimonios/`, con el consentimiento confirmado.
5. **Ordenar.** Falta la animación del catálogo al filtrar.
6. **Micro-textos del registro.** `CertificateShowcase` conserva etiquetas de 9–10 px. Se comparte con la V6, así que sólo se ajusta si se aprueba.
7. **Bono del primer permiso de trabajo.** Sus condiciones siguen pendientes. No se muestra.

## Modo día del recorrido de servicio · 27 sep 2026

**Diagnóstico.** El usuario observó que el modo claro del recorrido parecía «configurado para la noche» y que las animaciones no contrastaban. Es correcto. `scripts/contygo-light-theme.cjs` generó el modo claro cambiando sólo tres colores: blanco → marino en textos, marino → blanco en fondos y `#25D366` → `#087F46` en textos. No tocó los efectos, que están pensados como *luz sobre marino*:

- **Resplandor líquido** (`ThinkingOverlay` · `LiquidGlow`). Se compone de cuatro nubes: marino, bosque, marfil y verde. El script convirtió en blanco el marino de las nubes, así que en claro sólo quedaban capas claras: un lavado menta plano, sin volumen.
- **Bandas alrededor del vídeo.** Recortadas en rectángulo. En marino el borde se funde; sobre blanco se ve.
- **Final del vídeo.** El último fotograma, oscuro e incrustado en el MP4, se cerraba como una cápsula negra.
- **Vidrio del campo de respuesta.** Fijado en `tone="dark"`: relleno marino y borde blanco. Sobre blanco parecía metal gris.
- **Contraste del verde de marca.** `#25D366` da 8,60:1 sobre marino, pero 1,98:1 sobre blanco. Queda por debajo de 3:1 para gráficos y de 4,5:1 para texto ([WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), nivel **A**). `#087F46` da 5,08:1 y el marino 17,05:1.

**Principio.** *De noche la marca emite luz; de día, la marca es tinta sobre papel.* En claro:

- Los resplandores se pintan con pigmento verde en modo *multiply*.
- La profundidad la da el verde bosque. El marino a baja opacidad sobre blanco se vuelve gris y sólo tiñe el núcleo.
- Los controles son papel blanco con sombra de contacto marina.
- Los brillos blancos pasan a ser verde o marino.
- `#25D366` sólo se usa como relleno con texto marino. El texto y los trazos verdes usan `#087F46`.

El blanco puro sigue siendo la base; `#F6F8F7` crea capas.

**Implementación.** Cada módulo lleva un bloque `/* CONTYGO DÍA: hand-tuned light appearance */` después del bloque generado. El script se actualizó para conservarlo si se vuelve a ejecutar. Módulos: `ThinkingOverlay`, `VisaJuvenilExperience` y `LiquidGlassPlate`. Todas las reglas dependen de `[data-contygo-theme=light]`, así que el modo oscuro no cambia. Como el diálogo es compartido, la V6 recibe la misma mejora.

Verificado con capturas a 390×844 del recorrido Visa Juvenil: vídeo, transición de marca y conversación.

**Segunda pasada, tras la revisión del usuario.** La primera corrección no se notaba: seguía pareciendo blanco con neblina menta. El lavado venía también de los desenfoques de 55–80 px, que diluyen el color. Ahora hay tres opciones para elegir, comparadas en `material-de-diseno/revisiones/recorrido-modo-claro-opciones.png`:

- **A · Tinta intensa.** Es el modo claro actual de la V7. Nubes con la mitad de desenfoque y saturadas, y el vídeo enmarcado como una fotografía con sombra.
- **B · Papel verde.** Igual que A, pero el escenario es `#EAF2ED` (`data-contygo-dia="papel"`). Ojo: `#087F46` sobre ese papel da unos 4,5:1, así que el texto verde pequeño queda al límite.
- **C · Cine.** El recorrido siempre en marino, aunque la landing esté en claro. Recomendación del asistente: todos los efectos, el WebGL del contrato y los finales de los MP4 están hechos para marino, y «apagar las luces» al entrar al servicio centra la atención. Implica cambiar la decisión de la V6, según la cual el selector de tema controla también el diálogo; decide el usuario.

Para verlo en movimiento: `/contygo-motion/visa-transicion`. El botón «Aspecto del recorrido» alterna entre A, B y C, y «Probar vídeo y chat» llega a la conversación en 6 segundos.

**Tercera pasada: humo en los vídeos y cierre del avión.** Correcciones del usuario:
- Las bandas verdes alrededor del primer vídeo «no tienen sentido». La intención era una sombra que enmarca el reproductor y se mueve como humo.
- En el cierre, el avión blanco y los cohetes verdes no se veían sobre blanco.

Cambios, sin alterar tiempos ni la secuencia:

- **`SmokeFrame.tsx`, nuevo** (sustituido después por `BrandFluid`; ver la cuarta pasada). Shader WebGL con ruido fbm deformado que dibuja una sombra densa pegada al borde del reproductor. La sombra se disuelve hacia fuera en volutas que suben lentamente. En claro es tinta marina; en oscuro, sombra casi negra con volutas marfil. Se dibuja a media resolución y a unos 30 fps, con un cuadro fijo si el usuario prefiere movimiento reducido y una sombra CSS si no hay WebGL. Sustituye las bandas `filmGlowTop/Bottom` del primer vídeo y rodea también el segundo vídeo del cierre, cuyo resplandor verde de suelo espera ahora a que aparezca el avión. Se aplica en ambos temas.
- **El avión dibuja el hilo verde de la landing** mientras vuela, y ese hilo termina en el botón del contrato. Se aplica en ambos temas.
- **Cierre en claro:**
  - El avión lleva sombra proyectada, bordes marinos y un ala inferior más oscura.
  - La costura en la que se convierte el avión es marina, y su brillo pasa a ser sombra verde.
  - Los rayos del impacto y los cohetes (`VisaJourneyReveal`) son de tinta: cabezas marinas, estelas y chispas verde profundo.
  - El botón de invitación es una píldora marina: la blanca desaparecía sobre blanco.

La lámina de esa pasada se retiró al sustituir el humo; los cambios del avión, los rayos, los cohetes y el botón siguen vigentes. Las 64 pruebas se aprobaron.

**Cuarta pasada: fluido de marca en todas las tarjetas.** El usuario rechazó el humo porque el efecto debía llevar los colores de la marca. Aclaró además que el fondo de todas las tarjetas, chat incluido, pretendía ser un fluido como su referencia: pintura líquida marmoleada con borde orgánico, vetas que siguen la corriente, filo irisado, brillo satinado y polvo en el vacío. Lo quería «no tan intenso», en movimiento y con versión clara y oscura. Con nubes CSS desenfocadas no se había podido conseguir.

- **`BrandFluid.tsx`, WebGL.** Doble deformación de dominio con ruido fbm, a baja frecuencia para que salgan formas grandes vertidas, con vetas finas dentro de la masa, filo verde vivo en el borde, brillo y destellos.
  - Paleta de noche: azul profundo, verde azulado, bosque, verde de marca, menta y marfil suave, sobre marino.
  - Paleta de día: menta pálida, menta, verde de marca, bosque y una veta azul verdosa. Sin marino a baja opacidad, porque sobre blanco se vuelve gris.
  - Dos modos: `field`, en el que el fluido sube desde abajo, y `frame`, en el que rodea el reproductor y deja libre el centro.
  - Rendimiento: media resolución y unos 30 fps. El contexto WebGL se crea la primera vez que la superficie está visible, y sólo se dibuja mientras se ve y no es transparente. Con movimiento reducido muestra un cuadro fijo.
- **Integración sin romper.** `LiquidGlow` monta `BrandFluid` dentro de su envolvente. Así cambian a la vez el chat, la transición, el portal, el cierre, el estado de «pensando» y las luces del diálogo, y todos siguen reaccionando a la voz. Las nubes CSS quedan como respaldo sin WebGL: se ocultan con `data-fluid="webgl"`. El marco de ambos vídeos usa `mode="frame"`, y se eliminó `SmokeFrame`.

Rechazado después (ver la quinta pasada); su lámina se retiró.

**Quinta pasada · «Hilos» con la «y» (vigente).** El usuario rechazó el fluido por varias razones:
- reaccionaba a la voz sin que lo hubiera pedido;
- se veía tosco y con mal contraste;
- al pulsar «Conocer la propuesta» quedaba parte del efecto anterior y luego cambiaba de golpe, porque cada etapa montaba su propio efecto.

Pidió un solo flujo, elegante y no invasivo, con patrones, pensado para móvil y con un gesto creativo propio en cada etapa. Después pidió que las líneas formaran la «y» del logo en cada escena.

- **`JourneyBackdrop.tsx`, WebGL.** Se monta **una sola vez** en `ServiceCinemaDialog`, detrás de todo el contenido (`z-index:-1`). Nunca se desmonta, así que entre etapas no hay cortes: los parámetros se interpolan en unos 0,6 s y los hilos se transforman. Lee la etapa de los atributos existentes (`data-visa-phase` del diálogo y `data-phase` del cierre) y del vídeo visible, sin tocar la lógica de las etapas. No usa la voz.
- **Dibujo.** Campo de hilos de un píxel, isolíneas de un campo de ruido lento separadas 17 px. Cada quinto hilo es un acento verde por el que viaja una luz. Noche: menta y verde sobre marino. Día: tinta marina y bosque sobre papel. El fondo lleva una luz suave en el foco de cada escena.
- **Gestos por escena:**
  - Vídeo: los hilos se abren alrededor del reproductor, como agua alrededor de una piedra.
  - Marca: ondas concéntricas alrededor del logotipo.
  - Chat: marea calma en la parte baja.
  - Paso al segundo vídeo: la marea sube y rodea el nuevo reproductor en cuanto aparece.
  - Vuelo: los hilos se inclinan como viento.
  - Invitación: ondas alrededor del botón del contrato.
  - Contrato: los hilos se desvanecen, porque esa página tiene su propio arte.
- **La «y» como marca de agua.** Distancia firmada del símbolo medida en `symbol-*.png` (caja de 1024; check desde (313, 421) por el vértice (473, 583) hasta (755, 241); cola bezier desde (460, 605) hasta (288, 780); trazos de 99). Dentro de la silueta los hilos se desplazan en relieve, duplican su densidad y toman los colores del logo: check verde; cola marina de día y marfil de noche. La «y» viaja entre escenas:
  - grande detrás del vídeo;
  - eco al 55 % detrás del logotipo;
  - firma asomando en la esquina bajo el chat;
  - centrada donde el avión forma el logo;
  - al 70 % alrededor del botón.
- **Sin romper.** Con el fondo activo (`dialog[data-journey-backdrop=on]`), las etapas vuelven transparentes sus fondos y ocultan sus capas de luz: `LiquidGlow`, bandas, portal y brillo de salida. Si no hay WebGL o falta `OES_standard_derivatives`, no se activa y cada etapa conserva su fondo anterior. `BrandFluid` y `SmokeFrame` se eliminaron.

Lámina: `material-de-diseno/revisiones/recorrido-hilos.png`: seis escenas en oscuro y claro, a 390×844. Las 64 pruebas se aprobaron.

**Sexta pasada · la «y» protagonista y el paso a los cohetes.** Correcciones del usuario:
- En el primer vídeo, la «y» detrás del reproductor no se lucía: la quería arriba, en movimiento, acompañando la animación al terminar el vídeo.
- En el chat, la «y» salía cortada.
- Los dos vídeos deben llevar subtítulos.
- En el cierre claro sobraba la línea que seguía al avión: sólo debe moverse el papel.
- Al terminar el vuelo, los hilos debían hacer un efecto previo a los cohetes, «como si el logo se convirtiera en los cohetes».

Cambios:

- **Vídeos.** La «y» flota en el espacio libre sobre el reproductor, con una respiración lenta de ±5 px y una luz diagonal que la cruza. Al terminar el vídeo viaja con la animación hasta la marca. Los hilos se retiran detrás de los subtítulos (`data-film-captions`) para que se lean limpios.
- **Chat.** La «y» se coloca completa en el hueco libre bajo las respuestas; lo mide a partir del control más bajo. Si no hay sitio, no aparece.
- **Del logo a los cohetes.** Al pasar a la invitación, la «y» que formó el avión se carga de luz durante 0,5 s. Después se estira hacia arriba como una estela y se disuelve mientras sube el primer cohete. Una «y» oculta ya no cruza la pantalla: reaparece donde la quiere la escena siguiente.
- **Avión.** Se eliminó la línea que dejaba al volar.
- **Subtítulos del segundo vídeo.** `PaperPlaneClosing` ahora admite `film.captions`, igual que el primero. Aún no existe ningún archivo `.vtt` para ese vídeo, que es provisional. Tampoco lo tienen los primeros vídeos de Apelación ni de Reforzamiento de Asilo: sólo Visa Juvenil tiene `visa-juvenil-v1.es.vtt`.

Su lámina se retiró al llegar la séptima pasada. Las 64 pruebas se aprobaron.

**Séptima pasada · la «y» se convierte en los cohetes.** Correcciones del usuario:
- La transformación de la «y» en cohetes debía ser definida y notoria, tanto en la pantalla del nombre como en el cierre.
- En el chat, la «y» no debía ir en medio, porque el logotipo ya está arriba: la quería abajo a la derecha, con movimiento.
- El círculo del botón final se veía poco refinado. Eran las ondas concéntricas de los hilos, que formaban una diana.

Cambios:

- **Ignición (`ignite` en `JourneyBackdrop`).** Al empezar una celebración (`data-celebration`, que ahora exponen ambas `Celebration`), la «y» de hilos se sustituye por el logotipo sólido en SVG, en su misma posición y tamaño. Secuencia:
  - los trazos se dibujan en 0,4 s;
  - el logotipo sube un 8 % y se contrae como antes de un salto;
  - los trazos se recogen hacia sus puntas;
  - salen cinco cohetes desde la punta larga, la punta corta, el vértice, el final de la cola y el centro del brazo largo. Cada uno lleva cabeza y estela y sigue una curva hasta su punto de estallido;
  - cada estallido es una corona de 16 chispas con un brillo y un anillo pequeños.

  Colores del logotipo: check verde, cola marfil de noche y marina de día. Las ráfagas habituales de `Celebration` esperan 2,5 s para que la primera sea la de la «y», y sus brillos y anillos se redujeron para que dominen las chispas. Con movimiento reducido no hay ignición.
- **La «y» en reposo.** En el chat y en la pantalla del nombre (y en el cierre tras la ignición) va completa abajo a la derecha, bajo el control más bajo. Si no cabe, no aparece. Se balancea despacio sobre su vértice y los hilos fluyen dentro de ella.
- **Pantalla del nombre.** Su fondo y su `.ambient` se vuelven transparentes con el fondo activo, así que ahora se ven los hilos y la ignición.
- **Botón final.** Sin ondas: los hilos lo rodean como a una piedra, igual que a los vídeos.

Lámina: `material-de-diseno/revisiones/recorrido-y-a-cohetes.png`. Las 64 pruebas se aprobaron.

**Octava pasada · prueba en iPhone real (27 sep).** Primera prueba en el teléfono del usuario, por la red local.

- **Campo de fecha en iOS.** Safari pintaba el control nativo como una píldora oscura, vacía hasta elegir fecha. Ahora el campo se reinicia (`appearance:none`) y dibuja su propio icono de calendario y el texto guía «Elige día, mes y año». La fecha se alinea a la izquierda y todo el campo abre el selector del sistema.
- **Zoom al escribir.** iOS amplía cualquier campo de menos de 16 px; el del nombre tenía 13 px. En pantallas táctiles (`hover:none` y `pointer:coarse`), todos los campos del diálogo miden 16 px. No se bloquea el zoom del usuario (`maximum-scale`), porque eso impediría ampliar en Android.
- **Salto del reproductor al entrar al segundo vídeo.** El portal calculaba su marco con `(alto − alto_vídeo) / 2,45`; el cierre centra el vídeo en su escena. Con la barra de Safari (≈ 664 px visibles) aterrizaba unos 41 px más arriba, y en 844 px, 57 px. Ahora el portal deja su marco final en `dialog[data-portal-from]` y `PaperPlaneClosing` arranca el vídeo exactamente ahí y lo desliza a su sitio en 0,6 s. El atributo se consume al terminar, así que sobrevive al doble montaje de React en desarrollo.
- **El diálogo del chat (respuesta al usuario).** Las preguntas y su orden son fijos, y los dicta el servidor. Gemini sólo interpreta las respuestas libres, escritas o grabadas por voz: extrae el dato, elige uno de tres reconocimientos fijos, decide si añade la explicación fija de esa pregunta y repite la pregunta si no entiende. Los botones, la fecha y el selector de estado no pasan por el modelo. Es así por diseño, para que no invente conclusiones legales. «Con mi voz» graba la respuesta; no es una llamada en vivo.

Verificado a 390×664 con táctil emulado: campos a 16 px; fecha en claro y en oscuro; posiciones del vídeo 182→401 (portal), 181→400 y 222→442 (cierre). Lo que no se puede emular es el pintado nativo de iOS: queda pendiente de la prueba del usuario.

**Novena pasada · menos marca en el recorrido (27 sep).** El propietario prefirió su estilo a la V8 (que queda en `/contygo-app/v8` como referencia) y pidió reducir la presencia de la marca. En `JourneyBackdrop`:

- La «y» de hilos se queda **sólo sobre el primer vídeo**, que es donde el propietario la pidió. Al terminar el vídeo viaja hacia la marca y se disuelve en ella en 0,6 s.
- Se quitó la «y» de hilos del chat, de la pantalla del nombre, del segundo vídeo, del vuelo y de la invitación final.
- Los cohetes ya no salen de una «y» añadida, sino **del logo real que ya está en pantalla**:
  - en el nombre, del símbolo sobre «Primer paso completado»;
  - en el cierre, de la «y» del logotipo que forma el avión. El símbolo ocupa, dentro de `logo-*.png`, el centro (59,56 %, 57,99 %) con un 28,19 % del ancho, medido sobre su check verde.
- Si el logo está cerca del borde superior, los cinco cohetes se abren hacia los lados.

Lámina: `material-de-diseno/revisiones/recorrido-menos-marca.png`. Las 64 pruebas se aprobaron.

**Décima pasada · landing V7 más completa (27 sep).** Con el estilo V7 intacto (titular, escultura de papel, hilo verde) se añade lo que ayuda a decidir:

- **Franja de cifras** bajo el hero: 12 servicios con precio publicado, honorarios desde $50, +500 clientes atendidos y 100 % en español. El «+500» sale de `lib/contygo-claims.ts`, que sólo publica afirmaciones con verificación registrada; el propietario lo confirmó el 14 sep y no son casos aprobados. El hilo recorre el borde superior de la franja y baja por el margen, sin cruzar las cifras.
- **Precio «desde»** en las tres tarjetas destacadas y en cada fila del catálogo, con la nota de que las tasas del gobierno van aparte.
- **«No tienes que entenderlo todo hoy» con personas**: las tres escenas de la misma mujer (elige, decide, aporta), tomadas de los pósteres del hero de septiembre. El hilo enciende cada escena. Se conserva el mensaje de voz o escrito del agente.
- **Nueva sección «Todo por escrito»**: precio publicado, contrato antes de pagar y la garantía de `CONTYGO_COMMERCIAL_OFFER`, más «Somos consultores, no abogados».
- **Dos preguntas nuevas**: «¿Cuánto cuesta?», con cifras del catálogo, y «¿Qué es un consultor de inmigración registrado?».

Lámina: `material-de-diseno/revisiones/landing-v7-mejoras.png`. Verificado a 1440×900 y 390×664, en claro y en oscuro: sin desbordamiento, el hilo llega al símbolo y enciende las tres escenas, y al tocar «Apelación» se abre su recorrido. Las 64 pruebas se aprobaron.

**Undécima pasada · diseño y experiencia en celular (27 sep).** El propietario pidió mejorar más el diseño, sobre todo en móvil, y crear imágenes propias con su sistema.

- **Imágenes nuevas** con el plugin `codex-image`: cinco esculturas de categoría (Familia, Asilo, Corte, Impuestos, Empresa) y un contrato de papel, en el estilo de los creativos V6 y con fondo transparente. Prompts y originales en `material-de-diseno/imagenes-v7/`; WebP (22–75 KB) en `public/contygo/v7/`.
- **Categorías como fichas con escultura** que filtran el catálogo. En celular se desplazan de lado. Las filas del catálogo usan las mismas esculturas en miniatura.
- **Celular:**
  - Hero con la imagen arriba. El hilo gira al margen justo en el borde inferior de la imagen y baja junto al texto.
  - Botón principal visible en la primera pantalla a 664 px de alto.
  - Destacados en carrusel con desplazamiento magnético y puntos.
  - Catálogo que arranca con 5 servicios y un botón «Ver los N servicios».
  - Escenas más bajas (16:10).
  - Barra inferior «Encontrar mi servicio · Precios desde $50», visible siempre que el botón del hero no esté a la vista. Se oculta en Servicios, en el cierre y con el recorrido abierto. En celular sustituye al botón de la cabecera.
- **«Todo por escrito»**: el contrato de papel junto al titular (en celular, encima).
- **Tableta**: el catálogo pasa a una columna por debajo de 1000 px y las seis fichas se mantienen en una fila.

Láminas: `material-de-diseno/revisiones/landing-v7-movil.png` (antes y ahora) y `landing-v7-escritorio.png`. Verificado a 390×664, 390×560, 390×844, 820×1100 y 1440×900, en claro y en oscuro:
- sin desbordamiento horizontal;
- 5 → 12 filas al pulsar «Ver»;
- el filtro Impuestos funciona;
- la barra aparece y se oculta donde corresponde;
- al tocar Apelación se abre su recorrido.

Las 64 pruebas y ESLint pasaron sin errores.

**Pendiente:**
- Crear los subtítulos `.vtt` del segundo vídeo y de los vídeos de Apelación y Reforzamiento de Asilo, a partir de su guion o de una transcripción revisada.
- Revisar en un teléfono real el rendimiento del fondo de hilos (dibuja a 1,5× y unos 30 fps), sobre todo en gama baja.
- La invitación al contrato conserva su panel WebGL marino: el shader tiene el marino fijado en el código. Hay que decidir si se mantiene como «lámina de tinta», coherente con el registro, o si se crea una variante de día del shader.
- El cierre de la marca incrustado en los MP4 necesita una versión clara producida.
- Revisar el segundo vídeo y el cierre con avión.

## Comprobaciones

- TypeScript sin errores. `npm test`: 64 de 64 pruebas aprobadas. No se tocó código compartido.
- Navegador controlado por CDP (Edge headless) a 1440×900 y en móvil emulado a 390×844, en claro y oscuro. Los cuatro pasos se encienden en orden, el hilo llega al símbolo, no hay desbordamiento horizontal y el retroceso apaga los pasos.
- Al pulsar «Apelación» en móvil se abre su diálogo con el vídeo en 16:9 y `?servicio=apelacion`.
- **No comprobado:** Safari iOS real, rendimiento en gama baja, lector de pantalla y flujo completo del diálogo más allá de su apertura (no se modificó).

## 28 sep 2026 · Hero «Personas + tecnología», fotos del recorrido y entrada de marca

**Hero.** El usuario eligió el concepto C entre tres opciones montadas en la página (`material-de-diseno/revisiones/hero-opciones-*-2026-09-28.png`). Es la misma mujer del recorrido: de su celular sale la cinta verde, que forma el check y baja por la izquierda. La imagen la generó Codex y está hecha para la página:

- **Punto de salida medido.** La cinta sale por el borde inferior convertida en una línea fina. Su posición se midió sobre cada archivo: 17,46 % del ancho en `public/contygo/v7/hero-claro.webp` y 17,48 % en `hero-oscuro.webp`. Se declara en `data-exit` y `GreenThread` lo lee, junto con `data-exit-dir="down"`. Ahí nace el hilo: en escritorio baja, recorre la línea de cifras y sigue por el margen; en celular baja al margen antes del primer texto.
- **Versión oscura.** Se hizo con una edición de Codex de la clara (mismo encuadre al píxel). El fondo se llevó al marino exacto #061B3D y el de la clara a blanco puro, para que se fundan sin borde.
- **Composición.** La imagen es cuadrada y se apoya en la línea de cifras. Arriba y a los lados se funde con la página; abajo solo se funde a la derecha, en celular, y nunca donde sale la cinta. La nota flotante se retiró.

**Fotos del recorrido.** Son tres escenas nuevas de Codex con la misma protagonista, una acción por paso: entiende con la guía en vídeo, revisa su contrato en la tableta y aporta un documento con el celular. Los prompts están en `material-de-diseno/v7-fotos/prompts/`.

**Diagnóstico corregido** (`revisiones/landing-v7-diagnostico-2026-09-28.png`):

- números de paso legibles antes de que llegue el hilo;
- nota de la plataforma al pie de la base, sin tapar la pantalla;
- «Todo por escrito» en dos columnas equilibradas y sin hueco en móvil.

**Entrada de marca en lugar de loading.** Según [web.dev](https://web.dev/articles/lcp), un LCP bueno es de 2,5 s o menos, y los elementos con opacidad 0 no cuentan como candidatos hasta que se ven (nivel A: documentación de Google). Un telón de 2 s retrasaría el contenido principal. Por eso hay una entrada de 0,85 s que no oculta el titular: la imagen «aterriza», el aura verde se abre y el hilo arranca cuando la cinta ya está en su sitio. Se ve solo en la primera visita de la sesión (`INTRO` marca `data-cg-intro` antes de pintar) y nunca con «reducir movimiento».

### 28 sep · El símbolo oficial en el hero y el hilo que activa la página

**Símbolo oficial.** El usuario pidió que se viera la marca en lugar del check genérico de la cinta:

- Probé primero a pedirle a Codex el símbolo en 3D. Lo deformó (la curva marina se torcía hacia arriba), así que se descartó.
- Codex quitó el check de la foto en las dos versiones y la cinta termina en un rizo.
- Encima va el PNG oficial: `public/contygo/v7/simbolo-claro.png` y `simbolo-oscuro.png`, recortados de `06_Branding/Logos`. Es fiel al píxel y su cola toca la punta del rizo en los dos temas.
- El hero tiene un 10 % de aire arriba para el símbolo.
- En la primera visita el símbolo se dibuja desde la curva hasta el check y luego flota suavemente.

**El hilo activa lo que toca** (`GreenThread`, atributo `data-react`):

| Qué | Efecto al pasar el hilo |
|---|---|
| Cabeza del hilo | Cometa con halo y estela corta |
| Lo cercano | Se aparta al paso de la cabeza y vuelve (`--near`, `--side`) |
| Cifras | Cuentan desde 0 y la celda se enciende por arriba |
| Palabra verde de cada título | Se subraya |
| Tarjetas | Se elevan con un destello verde en el borde |
| Filas del catálogo | El icono salta |
| Fotos del recorrido | Revelan su color |
| Teléfono de la plataforma | Sube de su base |
| Lista de la plataforma | Se marca |
| Lámina del registro | Se ilumina |

- Las animaciones se suman a las entradas existentes gracias a la Web Animations API en modo aditivo.
- Con «reducir movimiento» nada se mueve, y sin JavaScript nada espera al hilo.
- Comprobado en celular: sin scroll lateral durante todo el recorrido (`.page` usa `overflow: clip`).
- GIF: `material-de-diseno/revisiones/recorrido-hilo-*-2026-09-28.gif`.

### 28 sep · La app en código, «Conoce quién te acompaña» y el botón de tono con gota

**La app (`components/contygo/v7/AppPhone.tsx`).** Sustituye a la captura borrosa y a la base marina:

- El teléfono y la app están dibujados en código, con medidas en `cqw`. Se ve nítido a cualquier tamaño, lleva el logo de la marca y sigue el tono de la página.
- Es una ilustración con datos de ejemplo (Ana, Visa Juvenil, paso 3 de 5) y el rótulo lo dice. Muestra solo lo que promete la sección: documentos, qué sigue y Soporte.
- Cuando llega el hilo, el anillo avanza, la prueba de domicilio termina de subir (4 → 5 de 6) y llega un aviso de Soporte.

**Registro (`components/contygo/v7/RegistryStage.tsx`).** Sustituye a `CertificateShowcase` en la V7 y reutiliza su visor, que ahora se exporta:

- La credencial muestra los datos que ya se publicaban (titular, clasificación, número, vigencia y consulta pública) y el enlace al registro público.
- El certificado va bajo un visor, como cuando la app fotografía un documento. Cuando llega el hilo se endereza, una línea verde lo escanea y las esquinas se encienden.
- El aviso legal se mantiene. Sin sellos ni lenguaje de aprobación.

**Botón de tono (`components/contygo/v7/themeDrop.ts`).**

- Se forma una gota con los colores del tema al que se cambia (marina con borde verde hacia oscuro, blanca hacia claro).
- Cae con aceleración constante y se estira con la velocidad. Al tocar el borde inferior se aplasta y salpica, y desde ese punto entra el nuevo tono en círculo (View Transitions; si no existen, una inundación de color).
- El icono gira de luna a sol. Con «reducir movimiento», el cambio es directo.
- Antes y ahora: `revisiones/app-antes-ahora-*`, `revisiones/registro-antes-ahora-*` y `revisiones/boton-tono-gota-*.gif`.

### 28 sep · Lupa del registro, filas deslizables y catálogo que se ilumina

- **Registro: lupa en lugar de escáner.** El usuario rechazó el escáner. Cuando llega el hilo, una lupa entra desde el lado del hilo y compara el certificado con la credencial en tres paradas: nombre, vigencia y número. Cada parada tiene su aumento para que el dato se lea entero, y la fila de la credencial se ilumina a la vez. Pasar el cursor por una fila o tocarla lleva la lupa a ese dato. El rótulo inferior dice qué coincide («Mismo número de registro»).
- **Filas deslizables en celular** (tarjetas destacadas y categorías): empiezan después del hilo, nunca lo tapan, y se desvanecen a la derecha. Cuando llega el hilo, una ola las recorre, se asoman 78 px y aparece «Desliza para ver más» con una manita, que desaparece en cuanto la persona desliza. En escritorio solo hay ola.
- **Catálogo:** cada fila se ilumina con una franja verde al pasar el hilo, queda marcada en el margen y su precio pasa a verde.
- **La guía en vídeo es la puerta principal:** el sello «Guía en vídeo» se vuelve verde y su botón late al llegar el hilo, y el botón de la tarjeta dice «Ver la guía».
- GIF: `revisiones/registro-lupa-2026-09-28.gif` y `revisiones/deslizar-y-catalogo-movil-2026-09-28.gif`.

### 28 sep (tarde) · Celular fluido, recorrido en zigzag, dos secciones nuevas, cierre que lleva al flujo y gota con física

Copia de seguridad de la versión anterior: `versiones/v7-2026-09-28-antes-de-movil-y-final.tar.gz`.

**Por qué iba lento en el celular (medido, no supuesto).** Medición en un celular emulado (390×844, CPU a ¼, `scratchpad/perf.mjs`):

- Servicios iba a 18 cuadros/s con picos de 632 ms y el recorrido a 9 cuadros/s. El 47 % del tiempo se iba en `getPointAtLength`: el hilo pedía al navegador unos 2.300 puntos de su trazado cada vez que la página cambiaba de alto.
- El aviso «Desliza para ver más» animaba su altura. Eso cambiaba el alto de la página en cada cuadro, así que el hilo se recalculaba entero en cada cuadro.

**Arreglo (GreenThread).**

- La geometría se calcula con las mismas curvas que se dibujan (Bézier muestreadas cada ~4 px) y `pathLength` ata los trazos a esa medida. El hilo solo se recalcula cuando cambia de verdad el tamaño, una vez por ráfaga.
- Nada que se anime al paso del hilo cambia el alto de la página. Brillos con opacidad (no sombras animadas), sin máscaras ni desenfoques sobre lo que se desliza, y la estela física solo en textos e iconos.
- Resultado en desarrollo: servicios pasó de 18 a 75 cuadros/s y el recorrido de 9 a 85. El cuadro más lento en el 95 % de los casos ronda los 21 ms en todas las secciones; la de la app, la más pesada, llega a 48–62 ms en producción.

**Filas deslizables: el hilo es el indicador (`ThreadRail.tsx`).** El usuario no quería la ola, el asomo ni la manita:

- Bajo cada fila, el hilo se abre en un riel desde el margen.
- La cuenta del riel avanza mientras deslizas (verde lo recorrido, punteado lo que falta) y cada nudo lleva a su tarjeta.
- Cuando llega el hilo, el riel crece y la cuenta se adelanta y vuelve: «hay más por aquí».

**Recorrido en celular: zigzag.**

- Cada paso cuelga del hilo en lados alternos. Su número es un medallón sobre el hilo que se llena al llegar y suelta un anillo.
- El hilo cruza al siguiente paso por el hueco entre ellos, y la foto llega desde el lado del hilo.
- Después pasa por detrás del teléfono de la app («entra en la app») y cruza de lado antes de las preguntas.

**«Claro desde el principio»: el contrato a la vista.**

- Una hoja de contrato (ilustración, y lo dice) con las tres cláusulas que la página ya prometía: precio publicado, contrato antes de pagar y la garantía de `contygo-commercial-offer`.
- Cuando llega el hilo, la hoja se endereza, las frases clave se marcan en verde por orden y el cursor de la firma espera.
- El botón abre la guía en vídeo de Visa Juvenil, es decir, el flujo.

**«Preguntar también es avanzar»: una conversación.**

- Cada pregunta es un mensaje tuyo. Al tocarla se envía, ContyGo escribe y llega la respuesta.
- Sigue siendo `<details>`, así que funciona sin JavaScript.
- Otra pregunta va por WhatsApp; «Prefiero verlo en vídeo» baja al cierre.

**Cierre (`Finale.tsx`): épico y siempre hacia el flujo.**

- Escenario marino. El hilo se vuelve el check con un destello y la luz se abre.
- Se reparten las tres guías en vídeo, con fotogramas de las propias guías (ffmpeg). Cada una abre su flujo: vídeo, conversación y contrato. El botón que solo subía a servicios ya no existe.

**Gota del tono, con física (`themeDrop.ts`, canvas).**

- La gota se forma colgando: el bulbo crece y el cuello solo aparece al final y adelgaza rápido.
- Se rompe: el resto vuelve al botón, que rebota, y queda una gotita satélite.
- Cae con aceleración constante (3.400 px/s²), vibra al soltarse y su sombra se concentra al acercarse al piso.
- El piso es la barra «Encontrar mi servicio» si está visible. Ahí se aplasta en una lámina y salta una corona de gotitas que vuelven a caer.
- El tono nuevo se extiende con borde líquido y un filo verde que sigue exactamente al recorte (View Transitions; el canvas es su propio grupo vivo).
- GIF: `revisiones/gota-claro-a-oscuro.gif`, `revisiones/gota-oscuro-a-claro.gif` y `revisiones/gota-formacion-camara-lenta.png`.

**Probar en el celular.** El modo desarrollo es bastante más lento que lo publicado. Hay una vista previa de producción:

- Carpeta `.next-movil` (`NEXT_DIST_DIR`) en el puerto 3002, con la contratación contra el simulador (puerto 3999), sesiones en memoria, Turnstile de prueba y el píxel apagado.
- `next build` añade `.next-movil/types` a `tsconfig.json`: hay que restaurarlo después.

### 28 sep (noche) · Más ligera sin quitar efectos: el tramo app → certificado

El usuario notó tirones en el celular entre la sección de la app y el certificado. Medición: celular emulado (390×844, dsf 3, CPU a ¼), desplazamiento del compositor y traza del navegador (`scratchpad/gesto.mjs`, `perf.mjs`, `peso.mjs`).

**Causas encontradas (confirmadas por Chrome):**

- **Animaciones infinitas que repintaban la página en cada cuadro, aunque estuviera quieta.** El pulso de sombra de la app, el pulso SVG de la cabeza del hilo, el latido de los sellos de vídeo, los anillos del cierre y el símbolo flotante del hero.
- **La lupa del certificado se movía con `left`/`top`/`width`.** Eso obligaba a maquetar y repintar una imagen grande en cada cuadro de sus tres paradas.
- **Desenfoques de fondo.** `backdrop-filter` en la credencial y en el aviso de la app.
- **Fusión sin aislar.** El grano de la lámina marina usaba `mix-blend-mode` sin aislar.
- **Estela del hilo en el hilo principal.** Movía bloques de texto enteros cambiando una variable CSS en cada cuadro.
- **Peso de la página:** un ícono de pestaña de 935 KB (`/logo.png`), el logo del encabezado servido a 3.840 px y el flujo de vídeo completo (gsap, voz, contrato) dentro de la carga inicial.

**Arreglos, con el mismo aspecto:**

- **Pulsos y anillos:** son transform/opacidad, van en la GPU y se detienen fuera de pantalla (`data-anim` / `data-inview` / `data-loop`, solo en el elemento que se anima).
- **Cabeza del hilo:** es una capa propia que se traslada.
- **Estela:** es una animación de una vez en la GPU sobre el titular.
- **Lupa:** se mueve con transformaciones, con unidades de contenedor (`cqw`) y capas fijas.
- **Credencial y aviso de la app:** sin desenfoque de fondo; debajo hay un fondo liso y no se nota.
- **Lámina marina:** tiene `isolation`.
- **Hilo:** lee el scroll una vez por cuadro dentro de su propio cuadro.
- **Flujo de vídeo:** se carga aparte (`next/dynamic`) cuando el celular está libre.
- **Imágenes del otro tono:** se piden al acercarse al botón de tono.
- **Ícono de pestaña:** 64 px (6 KB); el de Apple, 180 px.
- **Probado y descartado:** partir el hilo en un tramo por curva pintaba más en el hilo principal (73 ms frente a 43).

**Resultado (producción, antes → ahora):**

| Medida | Antes | Ahora |
|---|---|---|
| Descarga recorriendo toda la página | 1.976 KB | 888 KB |
| Primera carga | 808 KB | 670 KB |
| JS inicial de la página | 195 KB | 122 KB |
| App, 5 % de cuadros más lentos | 62,5 ms | 20,9 ms |
| Registro, 5 % de cuadros más lentos | 34,8 ms | 14 ms |
| Peor tirón (gesto app → certificado) | 292 ms | ~174 ms |
| 99 % de los cuadros | por debajo de 153 ms | por debajo de 83–90 ms |

Lo que queda de cuadros lentos en el emulador viene de su GPU por software. Hay que confirmarlo en el celular.

**Vista previa:** para que no mande datos al píxel real, se compila con `NEXT_PUBLIC_FACEBOOK_PIXEL_ID=0` (en Windows una variable vacía no existe y el código cae en el ID real).

### 28 sep (noche) · Sistema de ilustraciones V8: una por servicio, válida en los dos tonos

El usuario pidió ilustraciones propias por servicio, porque el catálogo repetía la de la categoría. También señaló que en modo oscuro las imágenes perdían color y contraste, y que la foto del paso 1 tenía el teléfono mal hecho.

**Decisión: una sola imagen para los dos tonos, no dos versiones.** El usuario ya había descartado los vídeos porque cada versión salía distinta, y con imágenes pasaría lo mismo. La paleta de marfil, cobalto y verde, más la luz de contorno, se lee sobre blanco y sobre marino. En oscuro, el CSS añade una luz suave detrás. Queda prohibido el marino oscuro en superficies grandes, que era lo que desaparecía.

**Qué se hizo:**

- 18 esculturas de papel: 6 categorías (incluida «Todos», que sustituye a los iconos de línea) y 12 servicios, cada uno con su porqué (`material-de-diseno/ilustraciones-v8/LEEME.md`).
- Las tarjetas destacadas y la lista del catálogo usan la ilustración de cada servicio. En la lista, el recuadro crece a 66 px.
- Fotos de los pasos 1 y 3 rehechas: por encima del hombro, con el teléfono físicamente correcto.
- Peso: de 21 a 43 KB por ilustración (antes, 104–134 KB cada imagen destacada).
- Lámina de revisión: `revisiones/ilustraciones-v8-sistema-claro-oscuro.png`.

**Vocabulario para pedir este trabajo:**

- **Sistema de ilustraciones:** las reglas comunes de material, paleta, luz y cámara.
- **Ilustraciones spot:** una por servicio o categoría.
- **Iconos:** los trazos de línea pequeños de la interfaz.
- **Isotipo:** solo el símbolo de la marca, el check de ContyGo.
- **Assets theme-aware:** pensados para modo claro y oscuro.

### 29 sep · El segundo vídeo sigue el modelo del primero

El fondo desenfocado del segundo vídeo (su propio fotograma) se descartó: el dueño dijo que no tenía concordancia ni estilo con el primero, que era «un bajón de creatividad».

Ahora el segundo vídeo usa el mismo modelo que el primero:

- los hilos del recorrido de fondo, con la «y» de ContyGo arriba (JourneyBackdrop, `stream(film, true)`);
- el vídeo al centro;
- el texto debajo, con la misma tipografía que los subtítulos del primero: `public/contygo/hero-video-v2/01-elige.es.vtt`.

El clip no tiene narración (audio de −52 dB de media), así que no se presenta como subtítulos: no lleva el botón «Subtítulos activados».

Desde el avión de papel, los hilos se retiran y entra la luz de escenario de la invitación.

## 30 sep 2026 · «Los más solicitados» y los servicios, directos

**Por qué.** Al publicar, le dijeron al dueño dos cosas:
- La fila de los tres servicios estrella parecía un catálogo más, cuando son los más vendidos y los más pedidos (lo dice el dueño).
- Las categorías (Todos, Familia, Asilo…) no gustaron: prefieren ver los servicios directamente.

**Qué cambió** (solo esa sección; el resto de la página queda igual):

- **Encabezado:** «01 · Los más solicitados» y el título «Los que más familias *nos confían.*». Debajo: «Nuestros servicios insignia: guía en vídeo, precio publicado y un acompañamiento que ya conoce cada paso del camino.»
- **Cada tarjeta estrella tiene su propia luz:**
  - un anillo verde y azul que gira alrededor del borde. Es una sola capa del compositor, pausada fuera de pantalla y quieta con «reducir movimiento»;
  - la cinta «★ Más solicitado», montada sobre el borde superior;
  - un destello que cruza la ilustración cuando llega el hilo o al pasar el ratón.
- **Textos de las tarjetas estrella**, cuidados y sin prometer resultados:
  - Visa Juvenil: «Para el futuro de tus hijos»;
  - Apelación: «Cuando cada día cuenta» (el texto dice «atentos a tus plazos», no «a tiempo»);
  - Reforzamiento de Asilo: «Tu historia, con más respaldo».
- **Servicios directos:** los 9 restantes se muestran sin filtros ni «Ver más», bajo «Más servicios, *el mismo acompañamiento.*».
  - Cada uno es una tarjeta con su ilustración V8, su nombre, su precio y, en escritorio, su descripción.
  - Hasta que llega el hilo, los dibujos esperan un poco más abajo y tenues; al pasar, cada fila sube a su sitio y se ilumina.
  - Escritorio: 3 columnas. Celular: 2 columnas; el último servicio, si queda solo, ocupa la fila entera.
- **Qué se retiró:** la fila de categorías y su riel del hilo, el filtro por `?servicio=` y las reglas CSS del catálogo anterior (68). Las ilustraciones `categoria-*` quedan sin uso en `public/contygo/v8/`.

**Afirmación.** «Más solicitado» y «los que más familias nos confían» se basan en la palabra del dueño (30-09-2026): son sus servicios más vendidos y pedidos. No se publica ninguna cifra.

**Rendimiento.** Medido con `gesto.mjs`: deslizamiento táctil real a 390×844, CPU 4× más lenta, de «Servicios» hasta el final de la lista. Se comparó la misma compilación con el anillo y sin él (p95 del hilo principal):

| Ronda | Con anillo | Sin anillo |
|---|---|---|
| 1 | 34,9 ms | 41,6 ms |
| 2 | 41,6 ms | 48,6 ms |

La diferencia es ruido: el anillo no añade trabajo al hilo principal.
