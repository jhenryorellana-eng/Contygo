# ContyGo · V9 «Escena»

Propuesta del 27 de septiembre de 2026, en **`/contygo-app/v9`** (`components/contygo/v9/`). No cambia la V6, la V7, la V8 ni el recorrido del servicio.

## Encargo
El propietario pidió un diseño de landing nuevo:
- mejor que la V7 en diseño y en movimiento;
- que aproveche los vídeos hechos con After Effects y Grok;
- con una intro de carga de hasta 2 segundos;
- usando *frontend-design* y el generador de imágenes, con libertad creativa.

Mantiene el recorrido del servicio que ya aprobó.

## Plan de diseño (frontend-design)
- **Tema:** trámites migratorios, fiscales y de empresa para la comunidad latina en EE. UU., desde el celular. Público llegado de anuncios en Meta y TikTok, sobre todo en móvil y acostumbrado a vídeo vertical. Tarea principal: elegir su trámite y entrar a su recorrido.
- **Color:**
  - Noche `#061B3D` para escenas y confianza.
  - Papel `#FFFFFF` y bruma `#F6F8F7` para leer.
  - Verde `#25D366`, sólo en el check y en la acción principal.
  - Verde firma `#087F46` para enlaces sobre papel.
  - Tinta `#061B3D` para el texto.
- **Tipografía:** Cabinet Grotesk 800, ya en el proyecto, para titulares. Nunito Sans, la de la marca, para texto, con base de 17 px, escala de ≈1,333 y líneas de menos de 80 caracteres.
- **Composición:** portada a pantalla completa con la escena del trámite, texto alineado a la izquierda (abajo en móvil) y selector de trámites dentro de la escena. Después, la demostración de la app, un índice de servicios, el registro, «Antes de pagar, lo lees todo», las preguntas y el cierre.
- **Principios:** la audacia se gasta en un solo lugar, la escena. Alrededor, orden y calma. Un único momento orquestado, la intro; todo lo demás responde a una acción de la persona.

### Revisión del plan frente a los clichés que evita
- Sin etiqueta en mayúsculas espaciadas sobre cada título (las V6 y V7 la usaban en todas las secciones).
- Sin numeración decorativa: sólo se numeran los pasos de la app, que sí son una secuencia.
- Sin palabra resaltada en otro color dentro del titular.
- Sin fundido y subida en cada sección, ni hilo animado.
- Sin cuadrícula de tarjetas iguales: el catálogo es un índice con filas y precios.
- Sin flecha añadida al texto de los botones.
- Sin interpuntos en las cifras: se escriben como frases.

## Qué la hace distinta
- **La portada es la escena del trámite de la persona.** Son las seis escenas cinematográficas grabadas con personas reales: Visa Juvenil, Residencia, Asilo, Corte, Impuestos y Empresa. Al elegir un trámite en el selector cambian la escena, el titular y el botón, que nombra el servicio exacto y su precio real. En móvil se usa el vídeo vertical 9:16, el mismo formato de los anuncios de los que llega la gente.
- **Empresa no tenía escena.** Se generó con el plugin `codex-image`, con los fotogramas originales como referencia de estilo: dueña de una panadería con una asistente, preparando su LLC. Originales en `material-de-diseno/imagenes-v9/`.
- **La app real en vídeo.** Es el recorrido de After Effects `contygo-mobile-v6-18s.mp4`, recortado y comprimido de 33 MB a 0,67 MB (`public/contygo/v9/app-recorrido.mp4`). Una lista de cinco pasos lo acompaña: el paso activo sigue al vídeo, y tocar un paso salta a esa escena. Sólo se reproduce cuando está en pantalla.
- **Intro de 2 s (`Intro.tsx`):**
  - se dibuja la curva y después el check verde del símbolo;
  - aparece el logotipo;
  - una cortina marina se levanta sobre la escena, que ya se está reproduciendo.

  Sólo se muestra en la primera visita de la sesión, se puede saltar con un toque y no aparece con movimiento reducido. La marca se guarda al terminar, para que funcione aunque React monte el componente dos veces en desarrollo.
- **Índice de servicios:** cada área con su escultura de papel de la V7 y cada servicio con su «desde $…».
- **Móvil:** barra inferior «Elegir mi trámite · Honorarios desde $50», oculta en la portada, en Servicios y en el cierre. Campos a 16 px, sin desbordes.
- **Recorrido del servicio:** es el `ServiceCinemaDialog` aprobado, siempre en marino. La página no lleva atributo de tema, para no pasarle el claro.

## Comprobado
- Intro a 390×664 y 1440×900, fotograma a fotograma.
- Seis escenas: cada una reproduce su vídeo (Empresa usa imagen), con el nombre y el precio correctos.
- El botón abre el servicio correcto (`?servicio=llc`) en marino.
- La demostración de la app salta al paso 4 (t = 10,8 s).
- Sin desbordamiento horizontal. Las 64 pruebas y ESLint pasaron.

## No hecho o pendiente
- La V9 no tiene selector claro/oscuro: es una sola apariencia, pensada para la escena.
- Empresa usa una imagen fija; se puede animar en Grok con el mismo procedimiento que las demás escenas.
- Pendiente probar en un iPhone real y medir el peso: cada escena móvil pesa 0,7–1,3 MB y sólo se cargan la escena activa y las contiguas.
