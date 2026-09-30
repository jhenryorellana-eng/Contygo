# ContyGo V5 — propuesta y piloto, 15 septiembre 2026

Petición: recrear los vídeos con el flujo AE + Grok y proponer/mejorar el diseño de la landing usando identidad existente. Se conserva V4 en `/contygo-app`; exploración V5 en `/contygo-app/v5`. No sustituye producción pública.

## Dirección propuesta, pendiente de revisión del piloto

Humanos naturales y escenas cotidianas para conectar; papel editorial marfil para distinguir etapas; UI real, tipografía y documentos precisos bajo control de AE. Colores navy #071c3c y verde #1dce64; Nunito/Nunito Sans. Marca auténtica en `public/contygo/brand-mark.png`. El certificado original es recurso íntegro, no se regenera para el vídeo final.

Secuencia: elegir servicio → explicador Visa Juvenil objetivo 45 s → webinar institucional objetivo aproximado 3:30 según voz → contrato o WhatsApp. El usuario genera clips Grok; AE compone pantallas, texto, certificado, montaje y acabado. Los vídeos finales no existen aún. La hoja piloto no es un vídeo ni una reproducción exacta del documento/UI; esos elementos requieren las fuentes originales en composición. No usar el piloto como captura real de una transacción.

Nueva narrativa propuesta: situación familiar → etapas separadas con papel → puente al servicio → persona y registro → recorrido real de contratación → participación documental → entregables/condiciones → decisión. En el webinar se desarrollarán promesa, beneficios, entregables, demostración del proceso, precio, respaldo, recapitulación y objeciones. No inventar bonos, garantías o escasez; consultar la base comercial antes de cerrar locución.

## Entregas comprobables

- `components/contygo/v5/ContygoV5.tsx` y CSS: nueva variante completa para comparar. Reutiliza fotos anteriores como provisionales y modal existente. Incluye catálogo de 12 servicios, capítulos seleccionables, captura real y certificado ampliable. No atribuir nueva producción de fotos a esos recursos existentes.
- `output/contygo-ae-v5/piloto-secuencia.png`: UNA hoja nueva de 8 cuadros para revisar el conjunto antes del lote de storyboards finales. No enviar toda la hoja a Grok como un único clip.
- `output/contygo-ae-v5/ae/ContyGo-v5-certificado.aep`: prueba nativa nueva de certificado, 1920×1080, 30 fps, 6 s. Texto y marco editables; documento raster original íntegro. Sin voz ni música. Control padre para entrada del marco. Original de otro proyecto abierto preservado antes de empezar.
- `output/contygo-ae-v5/preview/certificado-06s.mp4`: exportación H.264 decodificada; fotogramas 0,24,60,179 extraídos para inspección. Apertura, entrada y estado final observados. Reproducción de navegador comprobada con tiempo avanzando, dimensiones correctas y duración 6 s.
- Corregida nota heredada de cierre Visa de 45 s en `RealPlatformPreview`: ahora identifica webinar objetivo 3:30, todavía en preparación.

## Referencias observadas

Luna buscó en Pinterest; director observó las imágenes finales. Se descartaron teléfono DIY y stock chroma por falta de adecuación. Candidatos usados: ReliefMind / Ordinary (https://www.pinterest.com/pin/893331276112073570/), papel publicitario Carlos Meira (https://uk.pinterest.com/pin/305611524734741799/), Bank App UI (https://in.pinterest.com/pin/638103840988970192/). No se verificó movimiento de los pines, sólo sus imágenes. Terna mostrada en conversación antes de generar el piloto.

Consulta adicional One Page Love / Fintech Salon: el sitio externo resultó no disponible; no atribuirle comportamiento responsive observado ni usarlo como validación de esta propuesta. La adaptación móvil de V5 es diseño propio contrastado con el proyecto actual.

## Comprobaciones y siguiente punto

TypeScript y ESLint sin errores. UI observada en ventana móvil de 319 px y vista independiente de escritorio de 1280 px (el override solicitado no afectó al panel del usuario; no afirmar 390/1440). Modal: servicio → plataforma → decisión, enlace de contrato y cierre Escape comprobados. Corregida interferencia de estilos de la página sobre modal separándolo del contenedor. No se han probado vídeos finales ni avance automático con ellos porque siguen pendientes.

Pendiente: revisión visual del piloto por usuario, luego producción por escenas y guiones finales, recursos nuevos del hero/categorías, voz, clips Grok aportados por usuario, composición y exportaciones AE con versión móvil, acabado y revisión integral. La V5 es exploración implementada, no entrega final de toda la recreación.
