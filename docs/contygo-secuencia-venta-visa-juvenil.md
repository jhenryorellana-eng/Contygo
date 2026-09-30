# ContyGo · Secuencia comercial y registro profesional

14 septiembre 2026. Continuación de la landing `/contygo-app`. Se conserva la versión anterior y los tres tratamientos visuales de comparación.

## Decisión actual

Dos vídeos conectados dentro del modal: explicación de Visa Juvenil de 30–50 segundos (guion objetivo 45 s) → webinar institucional con UI real, escenas humanas y gráficos explicativos (guion objetivo 3:30) → elección de contrato o WhatsApp. La duración del webinar depende de la voz definitiva; no se limita al anterior cierre de 45 s.

El webinar recorre promesa, beneficios, entregables, identidad del consultor, cuenta, contrato, activación por firma y pago confirmado, documentos, preparación/entrega, precio, respaldo, recapitulación, objeciones y siguiente paso. La estructura no introduce bonos inexistentes ni vencimientos móviles ficticios.

## Entrega de producción

Galería: `/contygo-produccion/visa-secuencia-venta/index.html`.

- V1: 9 viñetas generales; 89 palabras de locución.
- V2: 14 capítulos; 505 palabras de locución.
- E01–E03 y W01–W14: 17 hojas de tres cortes, con dirección y voz por tramo.
- PNG descargables, dos TXT de voz, dirección de locución, guía de montaje y prompts por bloque.
- Reutiliza las imágenes humanas dirigidas de la comparación anterior. No se generaron nuevas imágenes de personajes ni vídeos en esta entrega.
- El certificado se anima como capa exacta. Las pantallas reales también se componen en edición para conservar sus letras y controles.
- El usuario genera los inserts en Grok. No se abrió ni operó Grok. Los MP4 y las voces grabadas siguen pendientes; las rutas de vídeo de la landing continúan en `null`.

## Registro incorporado

Fuente aportada: `C:/Users/PepitoLee/Downloads/Initial Certificate 8-28 IC.pdf`, dos páginas. Carta del 10 sep 2026 y certificado individual a nombre de **Jimy Henry Orellana**, categoría **Immigration Consultant**, **14304807-IC00**, fechas **21 ago 2026–21 ago 2027**.

El [directorio oficial de Utah](https://services.commerce.utah.gov/dcp-registrations/) mostró ACTIVE y vencimiento 21-AUG-27 al consultar el 14 sep 2026. La fecha inicial procede del certificado, no del resultado del buscador. Es un registro individual; no un aval de ContyGo por el Estado. El aviso en español indica expresamente que el consultor no es abogado y no presta servicios legales.

El PDF original se conserva sin cambios en `public/contygo/registro/registro-utah-original.pdf`. La imagen de detalle es una rasterización del área del certificado de la página 2, con todos sus bordes, datos y aviso; sólo se excluyen márgenes vacíos de la hoja. No se redibujaron sellos, firma ni texto.

`CertificateShowcase` presenta el registro en un marco navy/aluminio, paspartú marfil y luz de borde. Móvil: introducción → documento → datos. Escritorio: texto y documento en dos columnas. Movimiento continuo leve mientras es visible, reducido según la preferencia del dispositivo. El visor usa el documento quieto, zoom a tamaño original, Escape, restitución de foco y enlace al PDF completo.

## Alcance real y pendientes

La [ficha pública de Visa Juvenil Básico](https://contygo.app/servicios/visa-juvenil-basico) mostró **US$2,500, pago único** al consultar el 14 sep 2026. Confirmar antes de grabar/exportar definitivamente. I-485 se contrata por separado; las tasas externas no se presentan como incluidas.

La intención del propietario es reembolsar si ContyGo incumple su preparación a tiempo; faltan las condiciones escritas aplicables. El capítulo W11 usa revisión y respaldo según contrato. No se transforma «≈ 3 semanas» en garantía de plazo ni en devolución automática.

No hay fecha fija de aumento o cupos confirmados. El cierre usa «Consulta los honorarios actuales». Para activar escasez, registrar una condición comercial real y coherente en vídeo, landing y contrato.

Capturas públicas usadas: registro, servicio, área de documentos de la cuenta. Firma, confirmación de pago, progreso y entrega específicos del caso necesitan capturas publicables adicionales. Se identifican como gráficos explicativos en el storyboard. No se publicaron contratos, pagos ni datos de los casos privados revisados.

## Fuentes jurídicas de la redacción

- [USCIS: Special Immigrant Juveniles](https://www.uscis.gov/working-in-US/eb4/SIJ): no confundir orden estatal, petición I-360 y residencia; I-485 sujeta a elegibilidad y visa disponible.
- [Utah: preguntas sobre consultores](https://commerce.utah.gov/dcp/for-businesses/immigration-consultant/frequently-asked-questions/).
- [Utah Code, capítulo 13-49](https://le.utah.gov/xcode/Title13/Chapter49/C13-49_1800010118000101.pdf): alcance no jurídico, registro sin aval y aviso publicitario.

## Validación

TypeScript y ESLint pasan en los archivos de la landing modificados. Visor observado: documento carga, cambio de tamaño, cierre por Escape y foco restituido. Marco y luz tienen animación activa; se dispone de alternativa CSS sin movimiento. DOM sin desbordamiento horizontal a 390 y 1280 px; presentación observada en escritorio y móvil. Las duraciones audiovisuales no están verificadas con audio final.
