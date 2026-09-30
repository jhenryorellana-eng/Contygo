# ContyGo · Propuesta audiovisual

[Volver a la base comercial y audiovisual](contygo-base-comercial.md).

## Estado vigente para retomar

Al cierre del 14 de septiembre de 2026, el hero de `/contygo-app` ya utiliza los tres vídeos humanos por formato, recibidos del usuario e integrados en `public/contygo/hero-video-v2/`. Sus referencias de producción son los seis storyboards de `hero-storyboards-v2`. Las cinco categorías de esta variante usan imágenes de `cinema-v3`, con `videoSrc: null`; los bucles anteriores de `experience-v2` siguen disponibles como antecedentes. Los próximos vídeos específicos de los 12 servicios se prepararán desde [sus fichas](contygo-videos-servicios.md). El usuario opera Grok; el asistente prepara referencias, imágenes, storyboards y prompts y revisa el material recibido.

**El resto de este documento es un historial por etapas.** Los apartados que describen imágenes alternadas, vídeos pendientes, una terna por elegir o categorías ya animadas pertenecen a estados anteriores, no a la integración actual. Las correcciones posteriores y la base comercial prevalecen al continuar.

## Identidad y recursos para futuras piezas

Valores observados en la variante actual, que deben conservarse al continuar: navy `#061b3d`, verde `#25d366`, verde profundo `#087f46`, blanco `#ffffff` y fondo suave `#f4f8f5`. Procedencia: `components/contygo/ContygoAppFirst.module.css`. Tipografía de la web: Nunito para títulos y Nunito Sans para cuerpo, cargadas localmente en `app/layout.tsx`. Son referencias de implementación, no un manual de marca externo certificado.

El símbolo está disponible en `public/contygo/brand-mark.png`. Referencias propias de categoría: `public/contygo/cinema-v3/familia.png`, `asilo.png`, `corte.png`, `fiscal.png` y `empresa.png`; comunidad y contrato están en la misma carpeta. Su asignación está en `lib/contygo-cinema-media.ts`. Mantener el símbolo, su proporción y la funda del teléfono mediante referencias de imagen; no reconstruirlo libremente en cada escena.

Para cada producción futura conservar: ficha del servicio y alcance vigente, referencias elegidas, identidad, storyboard por escena y formato, prompt de animación, original recibido, derivaciones y resultado de revisión. Los textos publicitarios, nombres exactos de servicios y precios deben permanecer editables; no incrustarlos como letras generadas dentro de la escena. Esta documentación y los medios de ContyGo pertenecen al proyecto, no a una colección global de marcas.

## Historial de la dirección y sus pruebas

Fecha: 2026-09-14. Estado: alternativa implementada para comparar; usuario aceptó avanzar con app protagonista conservando el diseño anterior. No sustituye la landing actual.

## Comparación disponible

- Actual intacta: `/`. Componentes `ContygoConversion.tsx` y su CSS sin cambios en esta prueba.
- Alternativa: `/contygo-app`. Componentes propios `ContygoAppFirst`, `AppFirstScenes` y sus CSS. Hero humano junto al teléfono, demostración ilustrativa de cuatro pasos, vídeos existentes más visibles en categorías y recorrido de catálogo/presentación/contrato conservado.
- Respaldo de código previo: `output/design-snapshots/contygo-actual-20260914-102233.zip`. Los medios existentes permanecen en sus rutas originales, sin sobrescrituras.
- Piloto global generado por Luna con dirección de Astra: `output/imagegen/contygo-app-first/pilot-storyboard.png`, también visible desde la barra de comparación. Una generación, seis viñetas. Estado: generado e inspeccionado; pendiente de valoración del usuario.
- La animación del teléfono en esta prueba es web; sus pantallas son ilustrativas. Los nuevos clips de Grok aún no están producidos. Se conservan los MP4 anteriores para evaluar la composición sin producir un lote anticipado.
- Verificación de prueba: TypeScript sin errores, móvil 390 y escritorio 1440 observados; cambio a Firma comprobado; selección Visa Juvenil → presentación → enlace real `https://contygo.app/servicios/visa-juvenil-basico` comprobado sin efectuar contratación.

## Intención

Conservar el recorrido de la landing: promesa → beneficios → servicio → entregables → contratación → precio → respaldo → preguntas → contrato. El hero mantiene personas y entornos orgánicos; las explicaciones usan el universo táctil de papel de ContyGo, verde, azul marino y blanco.

Observado: el hero actualmente alterna dos imágenes, sin MP4 asignado. Las cinco categorías ya tienen vídeos. En sus fotogramas predominan las carpetas que se abren y los personajes que levantan documentos. La siguiente versión debe diferenciar mejor la acción de cada categoría y mantener una composición legible en móvil.

## Hilo visual propuesto

Un documento acompaña el recorrido desde la mesa de una persona hasta su expediente digital. El símbolo de ContyGo representa organización y acompañamiento; no equivale a una aprobación migratoria.

- Hero: dos escenas humanas, familia y emprendimiento. Gestos cotidianos, luz natural, planos de manos y rostro; composiciones propias para móvil y escritorio con espacio estable para el titular.
- Beneficios: transición visual de documentos físicos a un espacio digital organizado. Mantener personas, profundidad y fondo integrado con la página.
- Categorías: cinco bucles de seis segundos con una sola acción principal. Familia: documentos de tutor y menor se reúnen. Asilo: relato y pruebas se ordenan. Corte: expediente y correspondencia se preparan. Impuestos: comprobantes se agrupan. Empresa: documentos de constitución se relacionan con el negocio. Son representaciones, no aprobaciones ni funciones adicionales de la app.
- Entregables: mostrar el paquete específico del servicio elegido; evitar repetir el mismo vídeo genérico de categoría.
- Cómo funciona: revisión/firma, pago, información y preparación. Demostrar la interfaz real cuando se explique una acción concreta; adaptar evaluación de asilo a su informe automatizado.
- Precio, respaldo y cierre: conservar cifras, condiciones y CTA como texto accesible de la web. Movimiento secundario y sobrio.

## Producción propuesta

Primero comparar tres tratamientos artísticos en Pinterest. Estado: búsqueda realizada por Luna; director observó finalistas y recuperó por navegador el tercer candidato tras fallo de acceso del auxiliar. Terna preparada para mostrarse, elección pendiente. Después de elegir, crear un storyboard de prueba del recorrido completo antes de producir el lote. Los bucles mantienen estados inicial/final compatibles; comprobar la unión en el vídeo generado, sin darla por garantizada por el prompt. Categorías 1:1, seis segundos; hero con composiciones separadas según dispositivo. No cambiar información comercial ni añadir urgencia ficticia.

## Referencias de estilo observadas

Son imágenes fijas externas, no ejemplos de movimiento comprobado ni medios destinados a publicarse en la landing.

1. Diorama escultórico: https://www.pinterest.com/pin/art-ideas-in-2025--122371314869498623/ — https://i.pinimg.com/originals/e8/0f/a1/e80fa19b59cac2187ef58f2d0e08f30f.jpg . Recortes volumétricos, luz lateral, separación de planos. Transferir técnica y profundidad a los personajes/documentos de ContyGo; no el escenario fantástico.
2. Gráfica de papel en relieve: https://www.pinterest.com/pin/1055601600131216745/ — https://i.pinimg.com/originals/5e/c4/09/5ec409ce8c741079b716e0e2c04e0c86.jpg . Capas concéntricas planas con textura y sombras. Aplicar a documentos y símbolo, sin copiar los colores de la referencia.
3. Personajes 3D estilizados: https://in.pinterest.com/pin/995788167579319332/ — https://i.pinimg.com/736x/4b/0d/e8/4b0de85240c97b819eecf9ea8966df93.jpg . Personaje de proporciones caricaturizadas, rostro expresivo, gafas y materiales suaves. Adaptación a usuarios y objetos propios de ContyGo; no utilizar dinero como motivo de los servicios migratorios.

Recomendación preliminar: primera ruta con los personajes existentes de ContyGo, encuadres más próximos y acciones concretas por servicio. Segunda más abstracta; tercera más cercana al acabado de personaje digital. El hero humano se conserva en las tres.

## Hero de 18 segundos — actualización 14 de septiembre de 2026

Pedido actual: tres escenas consecutivas de seis segundos para mostrar el uso de ContyGo. La generación de vídeo la realiza exclusivamente el usuario; no abrir ni operar Grok. Entrega: seis imágenes iniciales (16:9 y 9:16 para cada escena) y tres prompts en `public/contygo-produccion/hero-18s/`, con ZIP descargable. Se conserva la primera toma y se crearon cuatro imágenes nuevas para contrato y documentos.

Secuencia: elegir con alcance/precio → revisar y firmar → compartir documentos. La confirmación del pago inicial queda explícita en texto entre firma y activación, sin inventar que la firma por sí sola activa el servicio. Los clips avanzan narrativamente; no se rebobinan individualmente. Montaje 1–2–3 y regreso al inicio por corte. Pendiente: vídeos aportados por el usuario y revisión del montaje real.

En `/contygo-app`, la promesa es «Tu próximo paso migratorio empieza en tu celular». La vista previa alterna las imágenes cada seis segundos, con selección manual de escena; no son vídeos generados. Titular, prueba de confianza y CTA estables. Versión original `/` conservada.

## Corrección de storyboards y funda — 14 de septiembre de 2026

El usuario rechazó las tomas iniciales aisladas y las pantallas/forma del teléfono. La entrega de producción vigente es `public/contygo/hero-storyboards-v2/`: tres escenas, cada una con storyboard de cuatro momentos en móvil 9:16 y escritorio 16:9. Misma protagonista, ropa y funda azul marino con símbolo verde y blanco; mostrar reverso del celular, pantalla siempre hacia la protagonista. Reutilizar esta identidad para cualquier continuación del hero.

Galería actualizada: `/contygo-produccion/hero-18s/index.html`; selector móvil/escritorio, ampliación, descarga y copia de prompts. ZIP: `contygo-hero-storyboards-v2.zip` (seis hojas, tres prompts y LEEME). Generador: `scripts/build-hero-storyboards-v2.mjs`, invocado también por el generador anterior. Prompts fuente: `output/imagegen/contygo-hero-storyboards-v2/animation-prompts.json`.

Revisión: las seis hojas fueron observadas; dos correcciones locales estabilizan la pila de documentos. Galería comprobada a 390 px y 1440 px, sin desbordamiento; copia del prompt y cambio de formato funcionan; ZIP con diez archivos y respuesta HTTP 200. Dirección/prompts/revisión por el principal, ejecución de imágenes con Luna Bajo. Originales y manifiesto conservados. No se operó Grok. Los vídeos los genera el usuario. Estas hojas sustituyen las referencias de producción; el componente del hero aún conserva sus pósteres anteriores hasta integrar material limpio o vídeos, nunca la cuadrícula completa.

## Vídeos del hero integrados — 14 de septiembre de 2026

Recibidos los seis MP4 de `C:/Users/PepitoLee/Downloads/vvvv/`. Duración comprobada: 6,041667 s cada uno, H.264, 24 fps; escritorio 1280×720 y móvil 720×1280. Importados a `public/contygo/hero-video-v2/`, con portadas extraídas del vídeo real y manifiesto de procedencia. Originales del usuario intactos.

Excepción detectada al observar fotogramas: `2 mobile.mp4` muestra el frontal y cambia el escenario acordado. Para conservar la instrucción de mostrar la funda, la versión móvil integrada de la escena 2 deriva de `2 escritorio.mp4`, recorte vertical x=350, ancho404, alto720, escalado a720×1280; el MP4 móvil aportado también queda como `02-contrato-mobile-original.mp4`. No se generaron vídeos ni se operó Grok.

`AppCinemaHero.tsx` reproduce tres clips según formato, silenciados y playsInline. Los eventos ended avanzan 1→2→3→1; el progreso usa currentTime/duration, selección manual reinicia escena. Pausa al salir del viewport, ocultar pestaña o preferir movimiento reducido. Portadas reales reemplazan imágenes antiguas; titular y CTA se mantienen. Preparación reproducible en `scripts/prepare-contygo-hero-videos.py` usando imageio-ffmpeg local en output/media-tools.

Comprobación de integración: TypeScript sin errores. Navegador a390px y1440px sin desbordamiento; recursos móviles720×1280 y escritorio1280×720, autoplay silenciado verificado. Observados avance1→2→3 y regreso3→1, selección manual y pausa de los tres vídeos al navegar aServicios. Encuadre de escritorio desplazado20% con máscara gradual para separar rostro y titular. Portada responsive renderizada antes de hidratación.
