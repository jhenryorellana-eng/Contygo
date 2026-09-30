# Vídeo de Visa Juvenil en la landing

La versión final de AE `output/contygo-video1-final/ContyGo-Video1-Continuidad-v4-2m05.mp4` se conserva como original. La copia de distribución está en `public/contygo/films/visa-juvenil-v1-720p.mp4`.

- Duración: 125 segundos de vídeo, sin cambiar la velocidad ni recortar contenido.
- Original: 245.31 MB. Web: 21.02 MB. Reducción: 91.43 %.
- Vídeo: H.264 High, 1280 × 720, 24 fps, píxeles YUV 4:2:0, Rec.709.
- Codificación: libx264, preset slow, CRF 24, máximo 1800 kbit/s, búfer 3600 kbit/s.
- Audio: AAC estéreo, 96 kbit/s, 48 kHz.
- MP4 con faststart: metadatos al inicio para empezar antes de descargar el archivo completo.
- Portada WebP: fotograma del vídeo, 960 × 540, 23 KB.

`VISA_JUVENIL_VIDEO` en `lib/contygo-presentation.ts` centraliza la ruta, portada y duración. Se usa en el primer paso de la secuencia de la landing V5 y en la presentación existente de Visa Juvenil. El segundo vídeo mantiene su configuración independiente.

Los reproductores usan `preload="none"`, reproducción por clic y `playsInline`. El reproductor de la secuencia conserva el formato 16:9. Al cerrar o pasar al siguiente paso se detiene el vídeo.

Comprobado: decodificación completa sin errores, metadatos MP4 antes de los datos de vídeo, TypeScript y nueve pruebas existentes del recorrido. En el navegador se comprobó que el reproductor espera sin datos almacenados antes del clic y después reproduce a 1280 × 720 con avance de tiempo y duración 125.013 s (incluye el relleno final de AAC).

Mediciones y registro de codificación: `output/contygo-video1-final/revision/web-720p-*`.

## Apelación y Reforzamiento de Asilo · integración 2026-09-21

Los montajes finales de AE, con presentación y salida, se asignan al primer vídeo de su propio servicio. Las constantes `APELACION_VIDEO` y `REFORZAMIENTO_ASILO_VIDEO` centralizan archivo, portada y duración en `lib/contygo-presentation.ts`.

| Servicio / ID | Archivo en `public/contygo/films/` | Duración | Peso web |
| --- | --- | --- | --- |
| Apelación (BIA) / `apelacion` | `apelacion-v1-720p.mp4` | 1:50 (109.833 s) | 18.05 MB |
| Reforzar Asilo / `reforzar-asilo` | `reforzamiento-asilo-v1-720p.mp4` | 2:00 | 17.73 MB |

La asignación se comparte entre el modal de V5/V4, las fichas y el modal de la landing principal; las rutas de evaluación anteriores también usan estos archivos. Los segundos vídeos conservan su configuración independiente.

Copias H.264, 1280 × 720, 24 fps, Rec.709, AAC 96 kbit/s, MP4 faststart, con portada WebP propia. Se conserva la velocidad y todo el montaje. El reproductor solicita el vídeo al pulsar reproducir.

Preparación reproducible: `scripts/prepare-contygo-service-films.py`. Fuentes originales en `output/contygo-apelacion-video1/entrega-ae/` y `output/contygo-reforzamiento-asilo-video1/entrega-ae/`. Manifiesto, medidas y decodificación completa de los dos archivos: `output/service-films-web/`.

Verificado en la landing V5: los botones «Conocer Apelación (BIA)» y «Conocer Reforzar Asilo» abren sus respectivos vídeos; ambos reproducen a 1280 × 720, con tiempo avanzando y sin error de medios. TypeScript sin errores y nueve pruebas existentes del recorrido aprobadas.
