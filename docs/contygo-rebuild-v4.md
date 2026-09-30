# ContyGo · reconstrucción de UI y piloto Visa Juvenil

Estado: 14 de septiembre de 2026. Versión local para comparar. No desplegada.

## Rutas y alcance

- Nueva landing: `/contygo-app?servicio=visa-juvenil#inicio`.
- Versión anterior conservada: `/contygo-app/anterior#inicio`. La portada `/` no se modifica en esta reconstrucción.
- Galería de producción: `/contygo-produccion/rebuild-v4/index.html`.
- Componentes aislados: `components/contygo/rebuild/`.
- Catálogo y enlaces: se reutilizan `lib/contygo-catalog.ts`, `lib/contygo-deliverables.ts` y `lib/contygo.ts`.

La UI cubre los doce servicios y cinco categorías. Solo Visa Juvenil es el piloto audiovisual de esta fase. El usuario pidió completar la UI y renovar el hero mientras revisa ese primer ejemplo.

## Estructura comercial

Promesa → beneficios → selección del servicio → funcionamiento → entregables y honorarios del seleccionado → alcance, cancelación y reembolso → preguntas → siguiente paso.

Promesa: **Tu trámite, bien preparado. Desde tu celular.**

ContyGo organiza y prepara documentos y formularios con la información que aporta el cliente, apoyado por tecnología y acompañamiento humano. La firma y el pago inicial confirmado activan la preparación de los servicios que siguen ese flujo. Los requisitos y entregables cambian según el contrato. La evaluación de asilo es un informe con un intento por pago y no debe presentarse como el mismo proceso contractual.

Se preservan los nombres originales y honorarios del catálogo investigado. Visa Juvenil Básico: USD 2.500, preparación documental de custodia estatal e I-360. I-485 y tasas gubernamentales no incluidas. Confirmar alcance y condiciones en la ficha y contrato real antes de publicar.

Los más de 500 corresponden a **clientes atendidos**, según aclaración del usuario, no a aprobaciones. No se afirma mayor rapidez que un abogado, elegibilidad individual, aprobación o plazo de decisión oficial. No se inventan bonos ni una fecha de promoción que se reinicie por visitante. La condición detallada de reembolso debe estar respaldada por el contrato; la UI dirige a su revisión y a Soporte.

## Recorrido del modal

1. La tarjeta se expande visualmente desde el disparador hacia un diálogo nativo.
2. Servicio: explainer previsto de 20 segundos; descripción, audiencia y alcance disponibles mientras no haya MP4.
3. Plataforma: cierre previsto de 45 segundos; mientras no exista el archivo, muestra capturas reales seguras y pasos explicados.
4. Decisión: precio, planes, entregables, exclusiones, documentos orientativos y acciones de WhatsApp/contratación específica.

El usuario puede avanzar o volver manualmente. Con archivos válidos, `onEnded` pasa del servicio a plataforma y del cierre a decisión. Se conserva el control de reproducción, pausa al cambiar/cerrar, Escape, foco y posición de scroll. No se bloquea la información si falla un vídeo.

## Producción visual

- `public/contygo/rebuild-v4/hero.png`: nuevo personaje humano en fotografía editorial, funda navy/check verde, pantalla orientada hacia él. Movimiento suave de la imagen en UI; no se presenta como un nuevo vídeo.
- `familia.png`: nuevos personajes y diorama de papel, fondo blanco, preparación de dos etapas documentales.
- `visa-piloto.png`: seis viñetas de continuidad de todo el recorrido, **piloto conceptual**, no seis clips ni interfaz real.
- `public/contygo-produccion/rebuild-v4/produccion.json`: prompts de animación para hero/familia, guiones propuestos de 20 y 45 s y estado de producción.
- Los otros cuatro grupos mantienen el arte anterior hasta su producción específica.
- El usuario opera Grok. No abrir Grok, no generar vídeos allí en su nombre. Recibir y revisar MP4 antes de integrarlos.
- `lib/contygo-rebuild-media.ts`: manifiesto con `null` hasta que existan los vídeos nuevos. No reemplazar los explainers por loops antiguos o clips de otro servicio.

Se observaron y mostraron tres referencias distintas de Pinterest antes de cerrar las nuevas imágenes. Evidencia y prompts de imagen en `output/contygo-rebuild/`.

## Capturas reales y privacidad

Solo se copiaron al área pública las capturas inspeccionadas sin datos personales: registro vacío, ficha pública Visa Juvenil Básico y documentos vacíos. Se muestran en `RealPlatformPreview` como capturas, nunca como una app operativa. La ficha Visa solo se muestra para ese servicio.

Las capturas internas y privadas originales permanecen fuera de `public`. No usar el administrador, las demos antiguas, identificadores de caso, firmas, enlaces con tokens o datos de clientes en publicidad. Las pantallas de firma/entrega final que no se hayan observado no deben inventarse en el vídeo; usar concepto explicativo o material seguro verificado.

## Comprobación

TypeScript y ESLint de los archivos nuevos: sin errores. Los 13 tests existentes pasan; son regresión del proyecto, no evidencia de reproducción de los nuevos vídeos.

Revisión visual en móvil y escritorio: hero, servicios, modal de Visa con tres etapas, selección de capturas, precios/planes de LLC, preguntas desplegables, Escape y retorno de foco. Se corrigió una colisión con el selector global `[data-reveal]` usando `data-contygo-reveal`; el contenido permanece visible aun sin animación. También se aisló el tamaño de los títulos de beneficios.

Pendiente audiovisual: revisión del piloto, storyboards finales por bloque, locución/exportaciones de Grok, ensamblaje, subtítulos y prueba de los MP4 reales. Esta UI está preparada para ellos; no constituye una entrega de vídeos terminados.
