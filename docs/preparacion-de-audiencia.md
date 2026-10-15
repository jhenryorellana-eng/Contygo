# Preparación de Audiencia con Henry Orellana

Servicio añadido el 12 de octubre de 2026 como quinto destacado de la página principal. La información sale de [links.usalatinoprime.com](https://links.usalatinoprime.com): es una sesión individual de 45 minutos con Henry Orellana, en español, con dos precios según la audiencia:

| Paquete | Audiencia | Precio | Qué se trabaja |
|---|---|---|---|
| Segunda audiencia | Preliminar | $150 | Repasar qué pasa ese día y en qué orden, ordenar tus preguntas y practicar cómo responder con calma |
| Tercera audiencia | De mérito | $350 | Recorrer tu historia de principio a fin, practicar las preguntas más difíciles y llegar con un plan claro |

Henry es consultor migratorio certificado en Utah, no abogado: la sesión es orientación personal y no incluye representación legal. La landing lo dice en la orientación final y en el alcance del servicio.

## El servicio en contygo (desde el 14-10-2026)

El contrato se hace por la API de contygo, como los demás servicios. El servicio **ya existe** en producción (lo montó el dueño desde el admin de contygo, guía `docs/guides/preparacion-de-audiencia-desde-el-admin.md` de x-legal):

- **Slug:** `preparacion-de-audiencia` (la landing lo une por slug: `lib/contygo-catalog.ts`).
- **Dos paquetes de pago único:** «Preparación para la segunda audiencia» ($150) y «Preparación para la tercera audiencia» ($350).
- **Dos preguntas de elegibilidad propias de contygo:**
  - «¿Cuándo es su próxima audiencia?»: `date` + `future_event`, con **7 días naturales** de antelación. Una audiencia más cercana la descalifica (`event_too_close`).
  - «¿En qué audiencia se encuentra?»: `single_choice` con `segunda-audiencia` y `tercera-audiencia`. Limita el paquete: Segunda → $150, Tercera → $350. `/eligibility/evaluate` devuelve `allowedPlanIds` y `POST /contracts` rechaza otro paquete con `422 PLAN_NOT_ALLOWED`.

**El chat no repite esas dos preguntas:** las responde con las suyas (`hearingRemoteAnswers` en `lib/agent/hearing-intake.ts`, que las encuentra por `kind` y por sus opciones, nunca por posición ni id). La fecha va tal cual; «¿Es la de mérito?» sí → `tercera-audiencia`, no → `segunda-audiencia`.

- **«No la tengo a mano»:** la fecha queda sin responder. No es un «no»: la ficha del contrato la pide en su paso «Preguntas» y contygo vuelve a evaluar antes de enviar el código.
- **Audiencia en menos de 7 días:** el chat lo dice («Henry necesita al menos 7 días…»), el cierre es «Hablar con Henry» y la ficha manda a WhatsApp.
- **La ficha solo ofrece el paquete de su audiencia.** El servidor de la landing también comprueba `allowedPlanIds` antes de enviar el código, y un `PLAN_NOT_ALLOWED` de contygo devuelve a la persona al paso del paquete.

Que el servicio exista no basta: hasta el 15-10-2026 la ficha lo mandaba a WhatsApp porque la landing no conocía el `kind` `single_choice` (lo trataba como «desconocido»). Desde entonces lo responde, para este y cualquier otro servicio.

## La evaluación

Las tres preguntas que aprobó el dueño (`lib/agent/hearing-intake.ts`):

1. ¿Tienes una audiencia programada en la corte de inmigración? Sin audiencia, el chat termina y Henry orienta por WhatsApp: el cierre dice «Hablar con Henry» y la ficha no abre el contrato.
2. ¿Cuándo es tu próxima audiencia? Vale «No la tengo a mano». Si faltan 3 días o menos, el agente avisa que reserve cuanto antes.
3. ¿Esa audiencia es la de mérito, donde se presenta tu caso completo? Sí: preparación para la tercera audiencia. No: para la segunda.

El criterio es el de [la página de la asesoría](https://links.usalatinoprime.com/asesoria): «La de tu próxima cita en la corte. Si es una audiencia preliminar, la segunda; si es tu audiencia de mérito, la tercera.» Al llegar al contrato, la ficha solo ofrece el paquete de esa audiencia. Las respuestas de la landing llevan claves `audiencia.*` y no salen hacia contygo: salen las de contygo que se derivan de ellas (sección anterior).

## Los vídeos

**Vídeo 1 (12-10-2026).** La entrega del dueño, `ContyGo-Preparacion-Audiencia-1-Corregido-Web-720p.mp4` (26.27 MB), comprimida como los demás (`docs/contygo-video-web.md`): `public/contygo/films/preparacion-audiencia-v1-720p.mp4`, 1:20 (79.583 s, 1910 fotogramas), 11.31 MB. `PREPARACION_AUDIENCIA_VIDEO`, en `lib/contygo-presentation.ts`, centraliza el archivo, la portada y la duración. Con él, la vitrina dice «Ver la guía · 1:20» y el servicio aparece en el cierre de la página («Guía en vídeo»), con el fotograma del segundo 7 (`public/contygo/v7/cierre-preparacion-audiencia.webp`). La vista previa de WhatsApp usa ese mismo fotograma.

**Vídeo 2 (12-10-2026).** La entrega `ContyGo-Preparacion-Audiencia-2-Web-720p.mp4` (49.51 MB), comprimida igual: `public/contygo/films/preparacion-audiencia-video2-v1-720p.mp4`, 2:29 (149.083 s, 3578 fotogramas), 21.54 MB. `PREPARACION_AUDIENCIA_VIDEO_2` sustituye al clip provisional. El vídeo presenta las dos sesiones con Henry y sus precios ($150 y $350, 45 minutos), el pago con tarjeta o Zelle y el cambio de horario por WhatsApp. El botón del cierre es «Revisar mi contrato» (o «Hablar con Henry» sin audiencia).

**Ilustración provisional.** La vitrina usa la escultura de papel de «Corte» (`public/contygo/v8/servicio-preparacion-audiencia.webp`, copia de `categoria-corte.webp`) hasta que haya una propia del sistema V8.

## Simulador

`scripts/contygo-mock-server.cjs` reproduce el servicio como está en producción: los dos paquetes, las dos preguntas, la regla de 7 días, `allowedPlanIds` y el `422 PLAN_NOT_ALLOWED`. El código de prueba es `481920`. Enlace directo: `/preparacion-de-audiencia` (también `/preparacion-audiencia` y `/audiencia`).
