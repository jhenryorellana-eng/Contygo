# Hero humano de ContyGo — edición v2

## Entrega
Dos nuevas escenas fotográficas de personas ficticias. Se usan como representación del uso cotidiano de un servicio digital, no como testimonios de clientes ni evidencia de resultados. La estética humana conserva luz y textura orgánicas; las animaciones de producto usan por separado el lenguaje papercraft aprobado.

- H01_familia_inicio.png → también public/contygo/experience-v2/hero-familia.png.
- H01_familia_storyboard.png → cuatro viñetas retrato 3:4 en una hoja 2×2.
- H01_familia_grok-10s.txt → prompt completo.
- H02_empresa_inicio.png → también public/contygo/experience-v2/hero-empresa.png.
- H02_empresa_storyboard.png → cuatro viñetas retrato 3:4 en una hoja 2×2.
- H02_empresa_grok-10s.txt → prompt completo.
- prompts-imagenes.md → prompts finales usados con la herramienta integrada image_gen.

## Cómo usar en Grok web
Cada clip dura 10 segundos, en formato retrato 3:4. Adjuntar su hoja multipanel como **Referencia**. La imagen individual de inicio sirve como **Primer fotograma** si la interfaz permite combinar ese rol con Referencia. Si solo permite un rol, usar la hoja como Referencia para la ruta multipanel; la toma inicial individual queda disponible para una recuperación puntual. No colocar la hoja como Primer fotograma, Fotograma final ni Bucle.

Los cuatro cuadros representan momentos de un solo plano continuo, no cuatro cortes. Se priorizan movimientos pequeños, piel natural, contacto real con objetos y cámara fija. No hay interfaz exacta regenerada: cualquier texto o logotipo definitivo se compone con recursos reales en la web.

Los finales están dirigidos hacia la postura de apertura, pero no hay un video generado aún: el bucle, la anatomía durante el movimiento y los extremos deben revisarse sobre el archivo real. Las hojas son guías y no garantizan ejecución exacta de tiempos ni coincidencia píxel a píxel.

## Destino web
Los másters son 1086 × 1448, proporción exacta 3:4. Usar como pósteres con Next Image para servir tamaños adecuados al dispositivo. Recomendación inicial: object-position: 50% 40%. En escritorio pueden funcionar como panel retrato grande o con recorte moderado. Un recorte 16:9 de estos archivos pierde parte de la mesa y debe revisarse, por lo que no se presenta como máster horizontal equivalente. Los videos horizontales deberán producirse/reencuadrarse y revisarse por separado si la composición final lo exige.

## Referencias inspeccionadas
- public/hero-services/juvenil-mobile-poster.webp.
- public/hero-services/asilo-mobile-poster.webp.

Se reutilizó la dirección humana orgánica solicitada y se crearon personajes nuevos. No se necesitó otra elección estética para esta continuidad.

## Fuentes de generación
- Familia: C:/Users/PepitoLee/.codex/generated_images/01a0924b-4f07-7551-b2a2-4360b7fbb8d3/exec-646a7540-eb36-478a-9c2b-30d4a436e4d8.png
- Empresa: C:/Users/PepitoLee/.codex/generated_images/01a0924b-4f07-7551-b2a2-4360b7fbb8d3/exec-53427a62-f07c-4b36-995a-1981bf2137fd.png
- Hoja familia: C:/Users/PepitoLee/.codex/generated_images/01a0924b-4f07-7551-b2a2-4360b7fbb8d3/exec-758a5cb7-a50e-4856-b906-4fbdc96ed21d.png
- Hoja empresa: C:/Users/PepitoLee/.codex/generated_images/01a0924b-4f07-7551-b2a2-4360b7fbb8d3/exec-6937a35b-6a93-4d83-b35a-437ebda1d1d9.png

Se inspeccionaron visualmente los cuatro resultados: identidades coherentes, cuatro celdas, objetos y paleta consistentes. Los gestos de las hojas son orientativos; no se ha generado o revisado video. Generación mediante la herramienta integrada image_gen, sin API y sin acceso a Grok.

