# Cierre personalizado · 21 septiembre 2026

## Integración vigente en los doce servicios

El cierre aprobado ya es el flujo común de `ServiceCinemaDialog` en la landing, sin bandera de prueba ni condición exclusiva de Visa Juvenil. Cada servicio mantiene sus preguntas; recoge el nombre opcional antes de la propuesta, prepara la única locución en ese momento y conserva el audio durante el vídeo 2. `PaperPlaneClosing` recibe servicio, vídeo y voz preparados; muestra el nombre del servicio y enlaza a su ficha específica. Evaluación de Asilo usa «Conocer mi evaluación», sin prometer una firma de contrato. Ningún clic de animación abre destinos ni firma documentos.

Los vídeos introductorios aprobados de Visa Juvenil, Apelación y Reforzamiento conservan sus archivos. Los demás muestran el estado de presentación pendiente y permiten iniciar las preguntas. El segundo vídeo usa el clip provisional de la app en todos los servicios hasta recibir las piezas definitivas; `provisional` identifica ese recurso en la configuración. El nuevo cierre se activa sólo al terminar el vídeo, con alternativa de movimiento reducido y recuperación de reproducción bloqueada.

Validación de integración: 37 pruebas de flujo, preguntas y voz aprobadas; se comprueban los doce nombres/destinos, el guion único y la conservación de los tres vídeos introductorios. TypeScript sin errores. Las notas siguientes conservan la evolución del prototipo; sus restricciones antiguas de «sólo vista local» ya no aplican al cierre vigente.

## Dirección vigente: avión → marca → nombre → contrato

El usuario descartó el resumen de cristal y el texto sobre el vídeo. La propuesta vigente usa `PaperPlaneClosing.tsx` y su CSS: vídeo intacto → plegado en avión → vuelo e impacto con la «y» → reconstrucción de ContyGo → caída y expansión en el botón. Nombre personal y celebración con los colores de marca. No se buscaron otras referencias para este ajuste.

Se presenta en `/contygo-motion/visa-transicion`, botón **Probar vídeo 2 → nuevo contrato**, y en el recorrido desde **Ver transición del chat al botón**. El campo opcional de nombre aparece antes de continuar al vídeo 2. La landing productiva conserva el cierre anterior mientras se revisa esta propuesta.

La animación se activa con `onEnded`; usa el clip temporal de seis segundos existente. Los controles de prueba quedan fuera del vídeo y se ocultan en el recorrido automático. GSAP existente, sin nuevas dependencias; alternativa sin vuelo para movimiento reducido.

Voz: «[Nombre], tu próximo paso merece claridad y compañía. Revisa tu contrato, conoce nuestro compromiso y, cuando estés listo, avancemos juntos. Tu historia sigue. ContyGo.» Se prepara durante el vídeo mediante el servicio de voz existente, incluyendo el nombre proporcionado. El nombre permanece en la sesión del modal, sin almacenamiento en disco. El botón enlaza al servicio; no firma ni acepta condiciones.

Comprobado: TypeScript sin errores; 21 pruebas de flujo y voz aprobadas; clip terminado en navegador, nombre «Ana» visible y estado de voz `speaking`, sin errores del servicio durante esa prueba. También se introdujo «Ana» en el paso del chat y se verificó su llegada al cierre tras finalizar el vídeo 2. La calidad percibida de voz requiere escucha humana; el estado técnico por sí solo no la acredita.

## Ajuste de celebración y tipografía

Actualización del cierre: celebración desplazada a ambos lados de la marca mediante una variante aislada, conservando la celebración anterior del chat. El titular coincide con la locución y se construye con palabras que se despliegan en profundidad y un destello verde. Las frases de apoyo avanzan según el reloj del audio; los límites de palabras son aproximados porque la voz no entrega marcas temporales por palabra. Al silenciar o fallar la voz se muestra el texto completo. Vista móvil revisada y reinicio de invitación probado.

## Ajuste del avión y llamada a la acción

### Locución vigente: una sola interpretación

Preparación del nombre: `ServiceCinemaDialog` conserva una instancia de voz dedicada desde el paso posterior al primer vídeo y la pasa al cierre. Tras 400 ms sin cambios en el nombre se prepara el guion completo; editarlo descarta la preparación anterior. El mismo audio y transcripción permanecen en memoria durante el vídeo 2, sin regenerarlos al montar el cierre. Al cerrar el modal se libera todo. La prueba aislada aplica el mismo debounce; si se salta directamente a la transición con un nombre nuevo, la generación fría aún depende del proveedor. Diecinueve pruebas de voz aprobadas, incluyendo escritura agrupada, cancelación de nombres anteriores y reproducción inmediata del audio precargado entre pasos.

El guion de `closingScript` ahora incluye también «Toca Revisar mi contrato y descubre cómo vamos a acompañarte. Tu siguiente paso empieza aquí». Se prepara y reproduce como una única locución, sin generar un segundo audio ni insertar una pausa artificial. La identidad de voz existente se conserva. El gesto usa una señal estimada a partir de los fragmentos de transcripción y el reloj de reproducción; si no hay transcripción, usa una proporción del guion sobre la duración completa. No equivale a alineación fonética exacta. La prueba de audio verifica una sola petición, una sola grabación precargada y una única activación del CTA. El esquema de dos partes descrito más abajo queda como antecedente descartado.

Dirección corregida tras descartar el rebote: el avión desciende en una curva Bézier continua y sus alas se afinan en una cinta de luz. La cinta se extiende y abre el botón desde el centro mientras se dibuja su contorno. Sin suelo, rebotes ni relieve voluminoso. La revisión más reciente usa una cápsula clara (blanco de marca), letras azules, luz verde interior y flecha verde; máximo 300 × 68 px en móvil y 340 × 70 px en escritorio (la altura puede crecer si el texto lo necesita).

La frase final es «Toca Revisar mi contrato y descubre cómo vamos a acompañarte. Tu siguiente paso empieza aquí». Corrección de ritmo: se descartó esperar ambas voces y unirlas con un crossfade de 8 ms. La primera empieza sin esperar la segunda, al formarse la marca (3,6 s de transición); la segunda se prepara en paralelo y se programa en el mismo reloj de audio, sin acelerar la voz. Para buffers completos se conservan 140 ms tras el último fonema, 220 ms de respiración y 80 ms antes del siguiente: unos 440 ms entre frases. Si la primera voz llega por streaming, se conserva íntegra. Una generación tardía todavía puede añadir espera, pero nunca retrasa la primera voz. El reloj de reproducción dispara `onContinuation`: la mano presiona y el borde verde se enciende 480 ms después. No ejecuta clics. Se reforzaron el halo verde, la luz que recorre el contorno y su respiración mientras habla; el botón conserva su tamaño compacto. Quince pruebas de voz aprobadas, incluyendo primera voz independiente, pausa programada, señal de CTA y cancelación. TypeScript sin errores.

Verificación en navegador: cierre visible en móvil, el segmento final activó `data-invited=true` y terminó en estado de voz `idle`, sin errores en consola.

## Archivo: propuesta de cristal descartada

Lo que sigue documenta la propuesta anterior; no es la dirección vigente.

Vista local: `/contygo-motion/cierre-concepto`. Exploración independiente solicitada antes de rehacer el contrato de la landing. No sustituye el cierre actual ni genera contratos. La transición general del vídeo 2 al contrato continúa pendiente de integración en todos los servicios.

Presentación vigente: el usuario pidió conservar el panel de pruebas habitual `/contygo-motion/visa-transicion`. Allí están «Probar vídeo 2 → nuevo contrato», «Comparar con el cierre anterior» y la secuencia completa desde el chat. `previewClosingConcept` conecta el nuevo cierre al vídeo 2 únicamente en ese panel local; la landing mantiene su cierre anterior. La vista aislada sigue accesible como recurso, pero no es el enlace principal de presentación.

## Dirección: de tu historia a tu acuerdo

El contenedor del último fotograma conserva continuidad espacial: se estrecha, gira ligeramente y se convierte en una lámina de cristal con el resumen del servicio. La luz verde pasa por el borde; texto y marca aparecen después. El documento permanece visible en móvil. El líquido se limita al fondo.

Tres apartados del documento: Tu servicio / Condiciones / Lo que sigue. Contenido tomado del catálogo existente, pendiente de contrastar con el contrato vigente antes de integración final. No se muestran firmas automáticas, contratos emitidos, promesas nuevas ni decisiones de elegibilidad. El botón permite revisar; no simula una firma.

Prueba con Visa Juvenil, Apelación y Reforzamiento. `Reproducir clip + cierre` usa el clip temporal de 6 s del proyecto y activa la transformación mediante `onEnded`. `Ver transformación` permite evaluar directamente. La pantalla posterior al botón es una propuesta de enlace a la app, no su autenticación real. En integración final conviene evitar un clic adicional si el destino ya puede abrirse directamente.

## Inspiración consultada

- https://codepen.io/peiche/full/naYmMb — Letter opening, Paul. Observados sobre cerrado tras Reset y carta desplegada. Se toma el cambio de forma de una misma pieza; no la apariencia del sobre.
- https://tympanus.net/Tutorials/PageRevealEffects/ — Codrops. Probada navegación inferior; observados estados de página inicial/final. Se toma continuidad mediante capas. La demo antigua no recompone bien a 390 px: el diseño móvil de la propuesta es propio. Las capturas no establecen curvas o duraciones exactas de la referencia.
- https://gsap.com/docs/v3/GSAP/gsap.context()/ — referencia técnica para limpiar las secuencias al reiniciar/cambiar servicio.

Motor GSAP existente, sin dependencias nuevas. Las animaciones usan una versión reducida con `prefers-reduced-motion`. La propuesta no cambia el flujo de contratación productivo.
