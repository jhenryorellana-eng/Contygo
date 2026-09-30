# Clips para el hero de USA Latino Prime

Cinco escenas de **6 segundos**: 30 segundos por recorrido. Generar cada escena dos veces, usando su primera toma horizontal y vertical respectivamente. Son imágenes de marca generadas, no testimonios ni casos reales. El logo, titular, botones y efecto de la estrella se añaden en la web: los videos deben salir limpios.

| Orden | Archivo base | Servicios representados |
| --- | --- | --- |
| 01 | juvenil-desktop / juvenil-mobile | Visa Juvenil SIJS y Petición I-360 |
| 02 | residencia-desktop / residencia-mobile | I-485, Ajuste de Estatus |
| 03 | asilo-desktop / asilo-mobile | Asilo Político y Reforzar Asilo |
| 04 | corte-desktop / corte-mobile | Apelación BIA y Cambio de Corte |
| 05 | impuestos-desktop / impuestos-mobile | ITIN y Declaración de Impuestos |

Las imágenes completas para Grok están en `docs/hero-services-originals/`. Las versiones WebP utilizadas en la página están en `public/hero-services/`. Los originales conservan el formato generado: aproximadamente 16:9 horizontal y 9:16 vertical.

## Instrucción común

Usar esta instrucción más el movimiento de cada escena. En móvil conservar especialmente el encuadre de la acción en la parte superior. Generar cada clip a partir de su imagen correspondiente.

> Use the provided image as the exact first frame of a continuous 6-second cinematic shot. Preserve the composition, every person's identity, clothing, lighting, objects, deep navy and restrained gold color palette. Keep all important subjects in their original part of the frame; preserve the dark negative space for website text. Natural restrained movement, anatomically correct hands and stable faces. No cuts, no transitions, no camera shake, no new people or objects, no invented text, no captions, no logos, no added approval stamps or cards. Keep the input aspect ratio. No music or dialogue needed. End with a stable half-second for the website transition.

## 01 · Visa Juvenil y Petición I-360

> The case assistant gently moves the pen along one line of the open file. The young adult follows the gesture with his eyes and gives a very small nod. His guardian remains quietly beside him. A subtle slow camera push-in, almost imperceptible. Do not turn the page, change facial expressions dramatically, move the hands extensively, or turn anyone toward camera.

## 02 · Ajuste de Estatus

> Slow macro camera movement toward the organized application folder. The woman's fingers lift the existing folder cover just slightly and then remain still. A soft highlight travels across the paper as the camera moves. Preserve all existing documents and the closed passport exactly, without transforming them into identity cards or generating readable text. No new documents and no approval outcome.

## 03 · Asilo y Reforzar Asilo

> A very slow lateral camera movement during a calm confidential case-preparation conversation. The case assistant gives a small attentive nod; the woman makes a subtle natural breathing movement and looks briefly toward the open file. Maintain the respectful serious mood. No speaking, dramatic sadness, tears, smiles of victory, paperwork changes or extra hand gestures.

## 04 · Apelación BIA y Cambio de Corte

> The person holding the case folder takes one slow natural step toward the civic building entrance. Camera follows with a gentle upward-and-forward movement of only a small distance, preserving the architectural composition and the dark left area. Very subtle movement in the jacket. No new passersby, altered architecture, readable signs, police, judges, flags, or courtroom victory imagery.

## 05 · ITIN y Declaración de Impuestos

> The tax preparer gently slides a single existing receipt a few centimeters beside the calculator, while the business owner observes. Slight slow camera push-in toward the organized desk. Keep the forms, laptop and calculator stable, with no readable invented text, screen animation or newly appearing objects. Correct natural fingers, one simple small gesture only.

## Entrega de los videos

Diez clips MP4: `juvenil-desktop.mp4`, `juvenil-mobile.mp4`, `residencia-desktop.mp4`, `residencia-mobile.mp4`, `asilo-desktop.mp4`, `asilo-mobile.mp4`, `corte-desktop.mp4`, `corte-mobile.mp4`, `impuestos-desktop.mp4`, `impuestos-mobile.mp4`.

Los diez clips recibidos están integrados en el hero mediante `lib/hero-scenes.ts`. Se reproduce la versión horizontal o vertical según el ancho de pantalla, sin sonido. Cada capítulo avanza al terminar sus seis segundos de video; la barra de progreso sigue el tiempo real de reproducción. La capa saliente conserva su último fotograma durante la transición.

El visitante puede pausar, seleccionar un grupo y entrar al servicio concreto. La reproducción se detiene al salir del área visible o cambiar de pestaña. Con movimiento reducido se muestran imágenes estáticas; si un video falla, se utiliza su poster. Los posters `*-poster.webp` se extraen del primer fotograma de cada clip para evitar saltos al iniciar la reproducción.

### Archivos recibidos y optimización

Origen: `C:/Users/PepitoLee/Downloads/tomas-y-prompts-grok/videos/`. Los archivos originales se conservan intactos. La numeración corresponde a las filas anteriores: `generated_video.mp4` y `generated_video (1).mp4` son Visa Juvenil horizontal/vertical; los pares siguientes corresponden a residencia, asilo, corte e impuestos, hasta `generated_video (9).mp4`.

Los archivos web se guardan en `public/hero-services/`: H.264, 24 fps, 144 fotogramas (6 segundos), sin pista de audio y con inicio de reproducción progresivo (`faststart`). Resolución horizontal 1264 × 720; vertical 720 × 1280. Peso conjunto: 24.919 MB de origen → 9.188 MB optimizados, aproximadamente 63% menos. El navegador carga los clips a medida que aparecen; no descarga las diez versiones al iniciar. El detalle de cada archivo está en `docs/hero-services-videos.json`.

Generación de imágenes: herramienta integrada `image_gen.imagegen`. Prompts de imagen guardados en `docs/hero-services-image-prompts.json`. Conversión WebP únicamente para reducir peso de transferencia, conservando los PNG originales para la producción de video.
