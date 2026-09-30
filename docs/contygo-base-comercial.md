# ContyGo · Base de trabajo comercial, landing y vídeos

**Punto de entrada para continuar este proyecto.** Actualizado el 14 de septiembre de 2026 a petición del usuario. Guarda lo aprendido y las decisiones vigentes; no aprueba automáticamente nuevas frases, condiciones o medios pendientes.

**Última decisión audiovisual, 15 septiembre:** consultar [vídeo de producto con AE](contygo-producto-ae-2026-09-15.md) y sus archivos. El segundo vídeo debe vender la solución concreta de Visa Juvenil siguiendo nueve bloques comerciales; animatic editable de 3:40, todavía sin voz ni clips finales. Se conserva el explicador inicial de 30–50 s y el registro individual de Jimy Henry Orellana, verificado activo el 14 sep 2026. El usuario confirmó devolución por incumplimiento del plazo según producto y bono de primer permiso de trabajo gratuito durante siete días hábiles. Faltan condiciones concretas y fechas de campaña.

## Los cuatro documentos de trabajo

1. [Propuesta real, funcionamiento y fuentes](contygo-propuesta-y-mensaje.md): qué ofrece ContyGo, quién hace qué y cómo se contrata.
2. [Estructura comercial y experiencia de la landing](contygo-estructura-landing.md): propósito de cada sección, recorrido móvil y salida al contrato.
3. [Fichas comerciales y audiovisuales de los 12 servicios](contygo-videos-servicios.md): alcance, entregables, precios de referencia, enlaces y enfoques de vídeo.
4. [Identidad visual, producción y estado de los medios](contygo-direccion-audiovisual-propuesta.md): referencias observadas, recursos, storyboards, vídeos recibidos y correcciones.

Los datos estructurados de las fichas están en [contygo-servicios.snapshot.json](contygo-servicios.snapshot.json). El generador lee los datos del proyecto para evitar transcribir de nuevo nombres, precios y entregables: `scripts/build-contygo-commercial-brief.mjs`. Es una instantánea documental; no conecta ni modifica el catálogo de producción.

## Entendimiento comercial que debe mantenerse

ContyGo ofrece asistencia, organización y preparación de trámites para la comunidad latina en Estados Unidos. La persona aporta su información y participa en su trámite; una plataforma móvil y el acompañamiento le permiten contratar, completar sus pasos, recibir soporte y seguir el avance. La tecnología asiste la extracción de datos y la preparación de formularios/documentos; existen también revisión y trabajo humano. El servicio comprado tiene un alcance específico, definido por paquete y contrato.

La propuesta que debe percibirse es **preparación + claridad + acompañamiento + participación desde el celular**. La firma digital es el objetivo de conversión de esta landing. La activación posterior requiere el pago inicial correspondiente. La aplicación es central porque hace posible ese recorrido, no porque vender acceso a una app sea el producto final.

La marca aborda migración y también áreas fiscales y empresariales. Mantener los nombres reales de todos los servicios. No reducir el catálogo a Visa Juvenil ni llamar migratorio al trabajo fiscal/empresarial cuando se presenta ese servicio.

**Propósito de trabajo, sintetizado de la propuesta y la visión del producto:** facilitar que la comunidad latina prepare y organice sus trámites con claridad, apoyo y participación desde el celular. La visión técnica incluye catálogo administrable, procesos adaptativos y asistencia tecnológica. Esta síntesis orienta el marketing; no presentarla como una misión/visión corporativa textual oficialmente aprobada.

**Voz de la marca:** cercana, clara y en español. Mostrar quién prepara, quién aporta y qué se recibe. La fuente más reciente utiliza «soporte», «tu guía» y el posicionamiento de «consultor de inmigración registrado»; evitar convertirlo en «bufete» o «equipo legal». Los datos concretos de registro son configurables y necesitan verificación antes de usarlos como prueba pública. El nombre «Sin abogado» de los paquetes se conserva tal como figura en el catálogo.

## Decisiones del usuario que siguen vigentes

- Público procedente de anuncios, TikTok, Facebook y otros canales. Predomina el celular. Claridad inmediata, confianza y contratación autónoma; contacto como ayuda secundaria.
- Estructura de oferta: promesa → beneficios → entregables → precio → garantía/respaldo → oferta reiterada → preguntas → motivo real para actuar → contrato. Al elegir servicio debe existir una explicación en vídeo y una salida directa a su contratación.
- **Actualizado el 15 septiembre:** el usuario sí incluye un bono: proceso del primer permiso de trabajo gratuito, oferta de siete días hábiles. Esta instrucción sustituye la anterior de no colocar regalos. No inventar su valor monetario, cobertura de tasas ni fecha de vencimiento; cerrar estos términos antes de publicar.
- Hero humano, orgánico y cinematográfico. Explicaciones de productos con el universo 3D táctil/papel de ContyGo, su comunidad, documentos y aplicación. Mantener verde, azul marino y blanco.
- Imágenes específicas que ayuden a distinguir servicios; textos grandes y claros. Movimiento elegante, sin saturación ni acumulación de botones de contacto.
- **El usuario opera Grok.** El asistente prepara imágenes/storyboards y prompts; no abre Grok ni genera vídeos allí salvo nueva instrucción explícita para hacerlo. Sí revisa e integra los vídeos que el usuario entregue.
- Cada escena narrativa necesita su storyboard de estados útiles. Las hojas de identidad son separadas. No entregar solo primeros fotogramas en lugar de storyboards sin motivo acordado.
- En el hero humano actual: misma mujer, vestuario y funda navy con símbolo ContyGo verde/blanco; espalda del teléfono hacia la cámara, pantalla hacia la protagonista. No interfaces inventadas.

## Estado real al guardar esta base

| Elemento | Estado comprobado |
|---|---|
| Dirección nueva de landing | `/contygo-app`; la versión `/` se conserva para comparación. No se ha publicado una sustitución definitiva. |
| Hero | Tres clips consecutivos por formato, 6,041667 s cada uno; reproducción silenciada 1→2→3→1, progreso sincronizado, portadas reales y CTA fijo. |
| Material recibido | Seis MP4 de `C:/Users/PepitoLee/Downloads/vvvv/`; activos en `public/contygo/hero-video-v2/`. |
| Excepción de la escena 2 móvil | El archivo recibido mostraba la pantalla. Se integró recorte vertical de la escena 2 de escritorio; original conservado. Detalle en manifiesto y notas audiovisuales. |
| Storyboards del hero | Seis hojas en `public/contygo/hero-storyboards-v2/`; galería `/contygo-produccion/hero-18s/index.html`. |
| Titular actualmente implementado | «Tu próximo paso migratorio empieza en tu celular». |
| Nueva propuesta de titular | «Tu trámite migratorio, preparado paso a paso», con antetítulo y cuerpo guardados en el documento de propuesta. **Pendiente de elección/aplicación.** |
| Categorías de `/contygo-app` | La nueva dirección usa imágenes `cinema-v3` y `videoSrc: null`. Los cinco bucles `experience-v2` existen como recursos anteriores; no confundirlos con nuevas animaciones ya integradas en esta variante. |
| Vídeos explicativos por servicio | Siete archivos anteriores, nueve asignaciones y tres servicios sin vídeo asignado; I-360/Reforzar reutilizan introducciones generales. Las fichas distinguen existencia de adecuación al nuevo encargo. |
| Garantía | Hay un texto de reembolso visible en el prototipo mediante `lib/contygo-commercial-offer.ts`. Es una intención comercial del usuario; falta concretar y conciliar condiciones con el contrato vigente antes de publicación definitiva. |
| Promoción | `promotion: null`; no hay fecha fija confirmada para aumento de precios. |

## Evidencia, condiciones y asuntos abiertos

**Confirmado por el usuario:** más de 500 clientes atendidos, en distintos servicios y mayoritariamente visa; no equivale a casos aprobados. Quiere precios accesibles y reembolso cuando su proceso no cubra el caso a tiempo, solicitado en la app.

**Pendiente comercial:** plazo de preparación al que se obliga ContyGo, evento que inicia el plazo, responsabilidad por documentación pendiente, monto/cobertura del reembolso, forma y plazo de resolución, servicios cubiertos y concordancia con contrato publicado. El archivo contractual legacy tiene una cláusula distinta; la versión nueva admite plantillas en BD. No afirmar qué cláusula está hoy vigente basándose solo en el archivo legacy.

**Urgencia:** la petición de mostrar siempre poco tiempo restante se registra como intención persuasiva, no como fecha verificada. No publicar una cuenta atrás que reinicia ni un aumento ficticio. Si hay promoción real, registrar inicio, fin, servicios y condiciones, y cambiar el mensaje al vencer. Mientras tanto, presentar honorarios actuales y un CTA claro.

**Pruebas no acreditadas:** no hay en esta revisión una medición de velocidad/precisión frente a abogados, tasa de aprobación, garantía de resultado migratorio ni plazo de autoridades. La fianza o registro que describe el proyecto tampoco es un seguro de aprobación o reembolso automático. Antes de publicar una credencial, verificar los datos configurados y su vigencia.

## Fuentes y prevalencia

Repositorio de aplicación revisado: `C:/Users/PepitoLee/Downloads/vvvv/x-legal-main/x-legal-main/`. Repositorio de landing: esta carpeta de trabajo. La revisión del 14 de septiembre es estática, centrada en negocio, contratación y seguimiento; no prueba transacciones reales ni toda la configuración en producción.

Usar las instrucciones actuales del usuario para intención y decisiones de diseño; usar el catálogo y contrato vigentes para condiciones comerciales; usar el código reciente para el recorrido implementado; usar los documentos históricos como antecedentes fechados. No convertir un texto viejo en una regla actual ni una idea propuesta en un hecho comprobado.

No se guardan credenciales de acceso en esta documentación. Para nuevas producciones, consultar primero esta base y después solo las fuentes del servicio afectado. Actualizar fechas, evidencia y estado cuando haya un cambio; conservar los originales visuales que permitan comparar.
