# Preparación de Audiencia con Henry Orellana

Servicio añadido el 12 de octubre de 2026 como quinto destacado de la página principal. La información sale de [links.usalatinoprime.com](https://links.usalatinoprime.com): es una sesión individual de 45 minutos con Henry Orellana, en español, con dos precios según la audiencia:

| Paquete | Audiencia | Precio | Qué se trabaja |
|---|---|---|---|
| Segunda audiencia | Preliminar | $150 | Repasar qué pasa ese día y en qué orden, ordenar tus preguntas y practicar cómo responder con calma |
| Tercera audiencia | De mérito | $350 | Recorrer tu historia de principio a fin, practicar las preguntas más difíciles y llegar con un plan claro |

Henry es consultor migratorio certificado en Utah, no abogado: la sesión es orientación personal y no incluye representación legal. La landing lo dice en la orientación final y en el alcance del servicio.

## Lo que falta en contygo (lo hace el dueño)

El contrato se hace por la API de contygo, como los demás servicios. **El servicio todavía no existe en contygo.** Para conectarlo, hay que crear en el panel de contygo:

- **Slug:** `preparacion-de-audiencia` (si se usa otro, cambia `slug` en `lib/contygo-catalog.ts`).
- **Dos paquetes:** «Segunda audiencia» ($150) y «Tercera audiencia» ($350). La landing elige el paquete por su nombre: busca «segunda» o «preliminar», y «tercera» o «mérito».
- **Sin preguntas de elegibilidad:** las hace la landing. Si contygo añade alguna, el chat la pregunta después de las tres propias.

Mientras no exista, el chat funciona igual (sus preguntas no dependen de contygo) y la ficha del contrato muestra «Este servicio no se contrata en línea» con WhatsApp, en vez de un error.

## La evaluación

Las tres preguntas que aprobó el dueño (`lib/agent/hearing-intake.ts`):

1. ¿Tienes una audiencia programada en la corte de inmigración? Sin audiencia, el chat termina y Henry orienta por WhatsApp: el cierre dice «Hablar con Henry» y la ficha no abre el contrato.
2. ¿Cuándo es tu próxima audiencia? Vale «No la tengo a mano». Si faltan 3 días o menos, el agente avisa que reserve cuanto antes.
3. ¿Esa audiencia es la de mérito, donde se presenta tu caso completo? Sí: preparación para la tercera audiencia. No: para la segunda.

El criterio es el de [la página de la asesoría](https://links.usalatinoprime.com/asesoria): «La de tu próxima cita en la corte. Si es una audiencia preliminar, la segunda; si es tu audiencia de mérito, la tercera.» Al llegar al contrato, el paquete recomendado ya está elegido y la persona puede cambiarlo. Las respuestas llevan claves `audiencia.*` y no salen hacia contygo.

## Lo que falta: los vídeos

Hoy el recorrido abre con «La presentación en vídeo estará disponible próximamente» y va directo a las preguntas. El segundo vídeo es el clip provisional compartido de 6 s. Cuando lleguen los vídeos:

1. Comprimirlos como los demás (`docs/contygo-video-web.md`) y dejarlos en `public/contygo/films/`.
2. Vídeo 1: añadir la constante en `lib/contygo-presentation.ts` y su entrada en `REBUILD_SERVICE_FILMS` (`lib/contygo-rebuild-media.ts`). Vídeo 2: su entrada en `REBUILD_PLATFORM_FILMS` y en `getRebuildPlatformFilm`, como Visa Juvenil, Ajuste y Reforzamiento.
3. Un fotograma del vídeo 1 en `public/contygo/v7/cierre-preparacion-audiencia.webp`. Con el vídeo y el fotograma, el servicio aparece solo en el cierre de la página («Guía en vídeo»). La vitrina muestra entonces «Ver la guía · duración» en vez de «Empezar la guía».
4. Volver a generar su vista previa de WhatsApp con el fotograma (`scripts/build-share-previews.mjs`).

**Ilustración provisional.** La vitrina usa la escultura de papel de «Corte» (`public/contygo/v8/servicio-preparacion-audiencia.webp`, copia de `categoria-corte.webp`) hasta que haya una propia del sistema V8.

## Simulador

`scripts/contygo-mock-server.cjs` ya tiene el servicio tal como se recomienda crearlo, para probar el contrato en local con el código `481920`. Link directo: `/preparacion-de-audiencia` (también `/preparacion-audiencia` y `/audiencia`).
