# Análisis del proyecto USA Latino Prime

Fecha: 5 de septiembre de 2026. Alcance: copia de trabajo local, incluidos los cambios existentes sin confirmar.

## Actualización: foco en el CRM sin API de Meta/WhatsApp

El usuario aclaró que la prioridad es automatizar el CRM actual sin conectar esas API. La existencia de código de CAPI en el repositorio no demuestra una integración activa y no debe presentarse como dependencia del CRM.

En la revisión posterior se consultó Supabase en modo lectura: había 12 contactos, los 12 en etapa nuevo y los 12 sin next_action_at. El historial contenía 13 actividades de sistema cuyo autor era web. Esto evidencia falta de registro de la gestión dentro del CRM; no permite afirmar que las asesoras no hayan atendido por canales externos. No había triggers en las tablas ulp_ ni pg_cron instalado en la base consultada. No se modificaron datos.

Prioridad propuesta para este alcance:

1. Crear automáticamente una tarea inicial al capturar una ficha y actualizar la bandeja sin recarga manual.
2. Ofrecer resultados rápidos de gestión (mensaje enviado, no respondió, cita confirmada), confirmados por la asesora, que registren historial y programen el siguiente paso en una operación.
3. Generar seguimientos según ese resultado, sin duplicar tareas ni sobrescribir una cita ya acordada; suspender la secuencia en casos cerrados o perdidos.
4. Guardar en el CRM la preferencia de cita del formulario como pendiente de confirmación. Actualmente solo viaja en el texto de WhatsApp.
5. Preparar mensajes por servicio y situación; la asesora revisa y envía desde WhatsApp.
6. Mostrar alertas internas y un resumen del dueño sobre fichas sin gestión registrada, tareas vencidas y casos estancados.

Corrección de medición necesaria: abrir WhatsApp no demuestra envío ni respuesta. El botón de la ficha registra “Escribió por WhatsApp” al hacer clic, mientras que el botón de la vista Hoy no registra esa actividad. Unificar como apertura/intento y confirmar el resultado con una acción breve de la asesora.

Las observaciones generales siguientes corresponden al análisis inicial. Sus referencias a producción “no comprobada” describen el alcance de aquel análisis; esta actualización añade únicamente la consulta de estructura y agregados del CRM, no una auditoría del despliegue completo.

## 1. Qué producto contiene este repositorio

Es una aplicación de captación y seguimiento comercial para servicios migratorios y fiscales. Combina una web pública, nueve embudos de evaluación, captación de contactos, reparto por WhatsApp, un CRM interno, reseñas moderadas y un asistente de texto y voz.

El recorrido principal es:

```text
Anuncio o home → página de servicio → video → preguntas → resultado
                                                        ↓
                                            nombre y teléfono opcionales
                                                        ↓
                                              contacto en Supabase
                                                        ↓
                                     solicitud de cita o llamada por WhatsApp
                                                        ↓
                                       asignación / conservación de asesora
                                                        ↓
                                          seguimiento humano en el CRM
```

La captura consume un turno de asignación cuando necesita una asesora nueva. Abrir WhatsApp registra un clic. Son hechos distintos: ninguno confirma que el cliente haya enviado un mensaje ni que la asesora haya respondido.

La preparación completa de expedientes, la validación documental, los pagos y la aplicación móvil se describen comercialmente, pero su implementación no está en este repositorio. La sección de la app contiene una demostración visual y enlaces configurables a tiendas.

## 2. Arquitectura

| Capa | Implementación |
| --- | --- |
| Framework | Next.js 14.2.35 en la compilación local, App Router |
| Interfaz | React 18.3.1, TypeScript estricto, CSS propio |
| Backend | Route Handlers de Next.js, runtime Node.js |
| Persistencia | Supabase/PostgreSQL mediante REST y RPC; sin SDK de Supabase |
| Autenticación | Propia: contraseñas bcrypt en PostgreSQL y cookies HMAC |
| IA | SDK @google/genai; texto por streaming y voz mediante Live API |
| Analítica | Meta Pixel y Conversions API |
| Despliegue previsto | Vercel; la configuración remota no se verificó |
| Diseño original | Carpeta project/, excluida de TypeScript y del flujo principal |

La home se renderiza dinámicamente para leer reseñas. Los nueve servicios se generan estáticamente desde el catálogo, y los slugs desconocidos devuelven 404. Las rutas privadas sirven la interfaz de acceso y protegen los datos en sus API.

El tema realmente activo es **clasico**, aunque README y tareas antiguas dicen moderno. La identidad visual usa azul marino, dorado, tipografías Source Sans 3 / Source Serif 4 y elementos de expedientes/pasaportes. Hay adaptaciones móviles, safe areas y estilos de movimiento reducido.

Archivos de entrada: [app/layout.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/app/layout.tsx>), [app/page.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/app/page.tsx>), [app/[slug]/page.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/app/[slug]/page.tsx>) y [next.config.mjs](<D:/Landing Page de servicios de USALATINO/New-landing-/next.config.mjs>).

## 3. Mapa de módulos

| Módulo | Responsabilidad | Referencia |
| --- | --- | --- |
| Catálogo | Nombres, identificadores, slugs, videos, preguntas y funciones de evaluación | [lib/services.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/services.ts>) |
| Embudo | Estado de respuestas, navegación y progreso | [components/ServiceFunnel.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/components/ServiceFunnel.tsx>) |
| Video | Autoplay, sonido, reproducción obligatoria y avance al finalizar | [components/VideoSlide.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/components/VideoSlide.tsx>) |
| Resultado | Mensaje, captura opcional y conversión de Meta | [components/ResultSlide.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/components/ResultSlide.tsx>) |
| Solicitud de cita | Fecha y franja enviadas como texto a WhatsApp | [components/ScheduleModal.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/components/ScheduleModal.tsx>) |
| Reparto | Asesoras activas, turnos ponderados y persistencia de clics | [lib/advisors.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/advisors.ts>) |
| CRM | Contactos, actividades y cuentas del equipo | [lib/crm.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/crm.ts>) |
| Sesiones | Firma, caducidad y lectura de identidad del equipo | [lib/session.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/session.ts>) |
| Identidad del visitante | Cookies firmadas para contacto y visitante | [lib/lead-identity.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/lead-identity.ts>) |
| Reseñas | Lectura pública, captura y moderación | [lib/reviews.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/reviews.ts>) |
| Prime | Widget, audio, herramientas y mensajes del asistente | [components/agent/AgentWidget.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/components/agent/AgentWidget.tsx>) |
| Analítica | Eventos de navegador y envío a Meta | [lib/meta/pixel-client.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/meta/pixel-client.ts>) |

## 4. Servicios y evaluación

| Identificador interno | Ruta | Comportamiento del evaluador |
| --- | --- | --- |
| visa-juvenil | /visa-juvenil | Éxito si está en EE. UU. y es menor de 21; la respuesta sobre abandono no modifica el resultado |
| i-360 | /peticion-i-360 | Comprueba custodia y edad |
| i-485 | /ajuste-de-estatus | Comprueba aprobación de I-360 y fecha de prioridad |
| asilo | /asilo-politico | El resultado depende de persecución; la respuesta sobre tiempo en EE. UU. no cambia la clasificación |
| reforzar-asilo | /reforzar-asilo | Caso iniciado y audiencia final pendiente |
| apelacion | /apelacion-bia | Clasificación según intervalo de días seleccionado |
| cambio-corte | /cambio-de-corte | Cambio de estado y pruebas de residencia |
| itin | /itin | Documento y dirección |
| impuestos | /declaracion-de-impuestos | Éxito si se seleccionan los siete documentos de la lista |

Estas son reglas observadas en el código, no una validación de requisitos legales. La evaluación es determinista y ocurre en el navegador; no utiliza Gemini. Conviene confirmar que las preguntas que no influyen y la exigencia de todos los documentos fiscales son decisiones comerciales intencionales.

Los estados son success, urgent, contact y denied. El caso denied de Visa Juvenil lleva automáticamente a otros servicios después de ocho segundos. Los demás ofrecen contacto. La cita no reserva un espacio en calendario: prepara un mensaje para pedir confirmación.

## 5. Backend y datos

Hay 16 archivos de rutas API, además del redirect /ir/whatsapp.

- Público: POST /api/reviews, /api/contacts/capture, /api/agent/chat, /api/agent/voice-token y /api/meta.
- Sesión: /api/admin/login permite entrar, consultar sesión y salir.
- Dueño: moderación de reseñas, asesoras, leads y administración del equipo.
- Equipo: listado y edición de contactos, actividades y cambio de contraseña.
- /ir/whatsapp valida el servicio, reconoce cookies, elige asesora, registra el clic y responde 302 hacia wa.me.

| Tabla | Función |
| --- | --- |
| ulp_reviews | Reseñas pendientes, aprobadas o rechazadas |
| ulp_admin_config | Secreto de acceso a operaciones privilegiadas |
| ulp_advisors | Asesoras, números, pesos y contadores |
| ulp_leads | Clics con origen, servicio, asesora, contacto y visitante |
| ulp_team_users | Cuentas, rol, estado y hash de contraseña |
| ulp_contacts | Ficha comercial, respuestas, etapa, seguimiento e importe |
| ulp_activities | Historial de notas, cambios y acciones |

El acceso privado usa RPC con un secreto del servidor. Las tablas privadas tienen RLS sin políticas públicas de lectura. La separación entre dueño y asesora se decide principalmente en las rutas Next.js: la base recibe el secreto compartido, no la identidad autenticada del empleado. Por eso los controles de sesión y pertenencia en cada endpoint son esenciales.

Las reseñas aprobadas y las asesoras activas tienen lectura pública. Las reseñas nuevas solo pueden entrar como pendientes según la política SQL.

La deduplicación de contactos busca el mismo teléfono con caso abierto y actualiza servicio/respuestas; no crea necesariamente una nueva ficha por servicio. Esto también significa que la ficha no representa varios casos independientes de una misma persona.

La actualización de seguridad incorpora bloqueo transaccional del reparto, cookies firmadas de contacto/visitante y una RPC que registra clic e historial juntos. Reintentar la misma operación SQL con el mismo ID no duplica la actividad.

Instrucciones de reconstrucción y transición: [supabase/README.md](<D:/Landing Page de servicios de USALATINO/New-landing-/supabase/README.md>). Orden documentado: setup → advisors → crm → crm-functions → prepare → despliegue web → cutover.

**Estado remoto no comprobado:** la documentación afirma que prepare ya está aplicada y que falta coordinar el despliegue y cutover. Este análisis no confirma ni altera ese estado. Aplicar cutover antes de actualizar la web anterior puede romper el reparto antiguo.

## 6. Paneles y métricas

/admin reúne resumen, contactos, leads y asesoras, reseñas, equipo y cuenta. /equipo muestra contactos y cuenta.

El CRM tiene vistas Hoy, Tablero y Lista. Las etapas son Nuevo, Contactado, Calificado, Pagado, En trámite, Cerrado y Perdido. La ficha permite cambiar datos, registrar acciones, anotar importe y programar seguimiento.

Los paneles descargan listas y hacen buena parte de los filtros y cálculos en el navegador. El reloj se actualiza cada minuto, pero eso no vuelve a consultar automáticamente los nuevos contactos. Hay recarga manual; no se encontró suscripción realtime.

Distinciones que deben mantenerse:

- assigned_count: turnos consumidos; no equivale a mensajes enviados.
- source=auto: primer clic reconocido.
- source=sticky: clic posterior.
- first_contact_at: primera acción de contacto registrada por el equipo o cambio de etapa según la función SQL.
- amount: importe manual de la ficha; no es una transacción de pago confirmada.
- Meta Lead: evento del CTA final, deduplicado entre navegador y CAPI por event_id; no representa necesariamente todos los clics registrados en Supabase.

## 7. Prime y analítica

Prime aparece en / y /califica cuando hay clave de Gemini o modo de vista previa. El prompt se construye desde el catálogo y usa marcadores para mostrar botones de servicio y de WhatsApp.

El chat conserva hasta 40 mensajes en sessionStorage; el servidor procesa los últimos 16 y limita cada texto a 2.000 caracteres. No se encontró persistencia de conversaciones en la base de datos.

La voz obtiene un token efímero de un uso desde el servidor y conecta el navegador a Gemini. El código convierte audio PCM a 16 kHz de entrada y 24 kHz de salida. Las herramientas muestran recomendaciones o el botón de contacto humano. La transcripción se utiliza para inferir recomendaciones, pero la interfaz actual no la presenta como conversación escrita.

Modelos predeterminados en código: gemini-3.7-flash y gemini-3.1-flash-live-preview. Sus nombres son configurables; su disponibilidad y funcionamiento con la cuenta real no se probaron. La documentación menciona reconexión de sesión, pero no se encontró implementación de sessionResumption en CallView.

Meta registra PageView, ViewContent, VideoCompleted, EvaluationCompleted, Lead, Contact, AgentChat y AgentCall. El consentimiento depende de una variable global, no de geolocalización. Pixel y rastreador están en el layout raíz, incluyendo las páginas de administración.

## 8. Hallazgos prioritarios

### A. Revocación de acceso del equipo — prioridad alta

[lib/session.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/lib/session.ts>) verifica firma, caducidad y rol de una cookie con vigencia de 14 días. No consulta si la cuenta sigue activa ni si su rol/asignación cambió. Desactivar una cuenta, cambiar su contraseña individual o quitarle el rol de dueño no invalida sus cookies ya emitidas. Cambiar los secretos globales sí invalida todas las sesiones.

Acción propuesta: validar estado/versión de sesión del usuario en operaciones protegidas y revocar sesiones cuando cambien sus permisos o contraseña.

### B. Preguntas omitidas con pulsaciones rápidas — reproducido localmente

En [components/ServiceFunnel.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/components/ServiceFunnel.tsx>), cada respuesta programa un avance dentro de 320 ms. No se cancela el avance anterior ni se bloquea una segunda pulsación.

Se extrajo y ejecutó el manejador real en una prueba aislada: dos clics en la primera pregunta llevaron del índice 1 al 3 con una sola respuesta guardada. También debe revisarse la combinación de seleccionar respuesta y pulsar Continuar antes del avance automático.

Acción propuesta: un único avance por pregunta, cancelable al navegar, y validación de respuestas completas antes del resultado.

### C. Un video que falla bloquea la evaluación — confirmado por lectura

El avance exige videoDone; un error de archivo solo muestra el placeholder y nunca desbloquea el cuestionario. El visitante queda sin salida hacia las preguntas. Además, el placeholder expone instrucciones de desarrollo.

Acción propuesta: ofrecer recuperación visible, reintento y una alternativa de continuidad cuando falle el medio, según la política de negocio.

### D. “Cobrado en 30 días” no mide fechas de cobro — confirmado por lectura

[components/admin/OwnerOverview.tsx](<D:/Landing Page de servicios de USALATINO/New-landing-/components/admin/OwnerOverview.tsx>) filtra contactos por updated_at y suma amount. Editar hoy una nota de un caso pagado hace meses puede volver a incluir todo su importe en la cifra del período.

Acción propuesta: registrar fecha e historial de pagos, o cambiar el indicador para que describa exactamente el cálculo actual.

### E. Contactos e indicadores incompletos al crecer — límite explícito

/api/crm/contacts devuelve hasta 600 contactos ordenados por última actualización. /api/admin/leads devuelve hasta 1.000 clics. Los paneles calculan totales sobre esos resultados sin paginación de servidor ni señal de truncamiento. Los contactos antiguos sin atender pueden quedar fuera de Hoy.

Acción propuesta: paginar listados y calcular indicadores agregados en la base; consultar pendientes con filtros y orden adecuados.

### F. Entrega de CAPI en segundo plano — riesgo pendiente de validar en despliegue

[app/api/meta/route.ts](<D:/Landing Page de servicios de USALATINO/New-landing-/app/api/meta/route.ts>) invoca void sendCapiEvent y devuelve 204 inmediatamente. No vincula esa promesa al ciclo de vida de la función. Por tanto, la entrega posterior no está garantizada por el código y un 204 tampoco demuestra recepción por Meta.

Para este Next.js 14, puede esperarse el envío con timeout o usar el mecanismo compatible de prolongación de la ejecución. Vercel documenta waitUntil para este propósito y distingue su uso del after disponible en versiones posteriores de Next.js. [Referencia oficial de Vercel](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil).

### G. Documentación y privacidad desactualizadas — discrepancias verificables

- README dice “sin backend”, pero existen CRM, APIs, Supabase y Gemini.
- README describe tema moderno; layout activa clasico.
- NEXT_PUBLIC_WHATSAPP figura como configurable, pero el número está fijado en lib/config.ts.
- Las tareas pendientes incluyen analítica y videos por servicio, que ya existen.
- Privacidad enumera reseñas y asistente, pero no explica la captura actual de nombre, teléfono y respuestas para el CRM.
- Privacidad menciona ulp_admin; el código usa ulp_session y añade ulp_cid / ulp_lead_visitor.
- Privacidad menciona Stripe, cuya integración no está en este repositorio.
- La documentación de voz describe transcripción visible y reconexión que no corresponden a la interfaz/implementación revisada.

Esto es una comparación entre texto y código, no un dictamen jurídico.

## 9. Otros puntos a revisar

- Deduplicación concurrente: contact_create hace SELECT y luego INSERT sin restricción única de teléfono para casos abiertos ni bloqueo por teléfono. Dos capturas simultáneas pueden crear fichas duplicadas.
- La captura pública puede enriquecer una ficha existente por teléfono sin verificar titularidad. No expone su ficha completa, pero permite asociar nuevos datos al contacto encontrado; conviene definir el nivel de confianza aceptable.
- La asignación se ejecuta antes de deduplicar la captura: una visita sin cookie puede consumir un turno y acabar usando la asesora que ya tenía el contacto.
- La búsqueda SQL por texto transforma el término a dígitos; si no hay dígitos, la condición telefónica termina en LIKE '%%'. El filtro de la UI evita este caso, pero la RPC/consulta API sigue siendo incorrecta para búsquedas alfabéticas.
- Los límites de uso de login, captura y Gemini son Map en memoria por proceso. No constituyen un límite global entre instancias. /api/reviews solo tiene honeypot; /api/meta no aplica lista de eventos en tiempo de ejecución ni límite de frecuencia.
- La caché de reseñas de 30 segundos y la de asesoras de 20 segundos son locales a cada proceso; invalidar una no garantiza refresco inmediato en todas las instancias.
- Las secciones inactivas del embudo usan aria-hidden y desplazamiento visual, pero conservan controles montados sin inert. Los modales carecen de gestión completa del foco. Se requiere una prueba de teclado/navegador para medir el impacto.
- Los siete MP4 suman aproximadamente 124,44 MiB, con archivos de 14,68 a 25,69 MiB. Las cinco fotos suman varios MiB y algunas se cargan como img sin optimización. El peso multimedia merece atención en conexiones móviles.
- La mayoría de estilos vive en un CSS global de más de 2.000 líneas y varios paneles concentran cientos de líneas. Modularizar por área facilitaría mantenimiento sin necesidad de cambiar el stack.
- Las afirmaciones comerciales “+500 familias” y “1/10 del costo” son textos fijos; no están calculadas a partir del CRM.
- No se encontró configuración de CI ni cobertura e2e del embudo, roles, reseñas o asistente.

## 10. Configuración real

| Área | Variables que utiliza el código |
| --- | --- |
| URL pública | NEXT_PUBLIC_SITE_URL, VERCEL_PROJECT_PRODUCTION_URL |
| Medios | NEXT_PUBLIC_VIDEO_URL, NEXT_PUBLIC_VIDEO_POSTER |
| Tiendas | NEXT_PUBLIC_APPSTORE_URL, NEXT_PUBLIC_PLAYSTORE_URL |
| Supabase | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ADMIN_SECRET |
| Sesión | ADMIN_PASSWORD y SUPABASE_ADMIN_SECRET |
| Gemini | GEMINI_API_KEY, GEMINI_CHAT_MODEL, GEMINI_LIVE_MODEL, GEMINI_VOICE, AGENT_PREVIEW |
| Meta | NEXT_PUBLIC_FACEBOOK_PIXEL_ID, FACEBOOK_CONVERSION_API_TOKEN, FACEBOOK_GRAPH_API_VERSION, FACEBOOK_TEST_EVENT_CODE, NEXT_PUBLIC_META_REQUIRE_CONSENT |

No se imprimieron los valores secretos de .env.local. La compilación usó ese archivo mediante Next.js. La presencia de código/configuración local no confirma que cada integración esté operativa en producción.

## 11. Verificación realizada

| Comprobación | Resultado |
| --- | --- |
| npm test | 4 pruebas aprobadas |
| npm run lint | Sin errores ni advertencias |
| TypeScript --noEmit --incremental false | Correcto |
| npm run build | Correcto; 33 entradas de generación estática procesadas |
| Servidor local de producción | Inició correctamente |
| 17 rutas de páginas/metadatos | HTTP 200 |
| /sijs | HTTP 308 hacia /visa-juvenil |
| Slug inexistente | HTTP 404 |
| API contactos y asesoras sin sesión | HTTP 401 |
| Doble clic en manejador del cuestionario | Reproducido: dos avances con una respuesta |

El build informa aproximadamente 111 kB de JavaScript inicial en home, 114 kB en servicios y 130 kB en admin. Son cifras de compilación, no una medición de velocidad percibida ni de Core Web Vitals.

Las cuatro pruebas existentes simulan Supabase y cubren firmas/caducidad de cookies, continuidad de asesora entre captura y WhatsApp, cookies falsificadas y bots. No prueban la base real. El archivo SQL de integración existe y termina en ROLLBACK, pero no se ejecutó en esta revisión.

No se realizaron escrituras de clientes, llamadas de IA, envíos a WhatsApp, despliegues ni migraciones. No se verificaron visualmente todos los recorridos en navegador ni permisos actuales de producción.

## 12. Estado de la copia y siguiente orden de trabajo

Al comenzar ya había ocho archivos versionados modificados, nuevas funciones/migraciones SQL, tests, identidad de leads y configuración local de Claude sin confirmar. Se preservaron. Este informe es el único archivo fuente/documental añadido durante el análisis; build y lint actualizaron artefactos locales ignorados.

Orden propuesto:

1. Resolver revocación de sesiones y verificar cierre coordinado de permisos del reparto.
2. Corregir avance del cuestionario y recuperación ante errores de video.
3. Corregir la semántica de cobros, la paginación y el refresco de pendientes.
4. Asegurar entrega y validación de CAPI, y excluir tráfico interno de las métricas públicas.
5. Alinear documentación y textos con las funciones realmente implementadas.
6. Ampliar pruebas de flujos críticos y revisar rendimiento multimedia y accesibilidad.

La estructura actual permite continuar el desarrollo sin una reescritura: el catálogo central, la separación de módulos y las RPC transaccionales ofrecen una base clara. Los principales pendientes se concentran en consistencia operativa, autenticación, medición y recuperación de errores.
