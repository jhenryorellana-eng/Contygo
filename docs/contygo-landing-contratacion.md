# ContyGo: documento maestro de la landing de contratación

Fecha de corte del catálogo: **10 de septiembre de 2026**.
Objetivo: presentar todos los servicios públicos vigentes y conducir a su contratación en ContyGo.
Marca principal: **ContyGo**. Respaldo institucional: **USA LatinoPrime**.
Estados de evidencia: **DOCUMENTADO**, **INFERIDO**, **PROPUESTO**, **NO ENCONTRADO** y **CONFLICTO**.
DOCUMENTADO significa explícito en la fuente indicada; leer código no comprueba su ejecución.
NO ENCONTRADO significa ausente del alcance revisado, no que el dato o servicio no exista.
Los precios son honorarios en USD; el contrato y la ficha de ContyGo determinan las condiciones vigentes.

## 1. Resumen ejecutivo y alcance de la investigación

**DOCUMENTADO:** el catálogo público muestra 12 ofertas. **PROPUESTO:** agruparlas en tres de
familia/SIJS, tres de asilo, tres de corte, dos fiscales y una empresarial. Estas agrupaciones son navegación;
no pretenden reproducir las categorías internas de la base de datos.
La oferta prioritaria es el catálogo general, por instrucción del usuario, con contratación por cuenta propia.
El público documentado es la comunidad latina en EE. UU.; se redacta en español y se dirige a
personas/familias y a quienes necesitan servicios fiscales o constituir una LLC en Florida.
La decisión de compra se apoya en alcance, precio y condiciones. El recorrido solicitado ahora es
landing general → elección del servicio → pantalla de video específico → contrato en ContyGo.
El video tiene controles y el contrato queda disponible sin cuestionario ni tiempo mínimo de reproducción.
ContyGo gestiona cuenta, evaluación cuando aplique, contrato y firma; la landing no duplica esos controles.

La fuente comercial principal fue la navegación pública de la sesión del agente principal:
`https://contygo.app/servicios` y las 12 fichas individuales, sin iniciar sesión.
Se verificaron nombres, slugs, precios de entrada y nombres/precios de los planes el 2026-09-10.
La observación en navegador constituye evidencia de esta sesión; no es una exportación de base de datos.

La investigación local complementó los alcances con documentación de producto y código fuente.
Repositorio fuente leído: `C:/Users/PepitoLee/Downloads/x-legal-main (1)/x-legal-main`.
Esta copia procede de ZIP y **no contiene `.git`**: no hay commit o rama verificables en ella.
Las referencias siguientes identifican archivos y líneas de esa copia, no una revisión Git inmutable.
Repositorio de implementación: `D:/Landing Page de servicios de USALATINO/New-landing-`.

Se consultaron SoT, guías, especificaciones, historial de configuración de producto, textos i18n,
plantilla contractual y catálogo histórico. No se ejecutó la aplicación fuente ni consultas a su DB.
No se usaron `.env*`, `.mcp.json`, credenciales, datos de clientes ni contenido de expedientes.
Fixtures, casos de prueba y demos no se consideran evidencia comercial.

Orden de confianza: ficha pública actual para oferta/precio; documentación actual de producto
para alcance; código contractual para límites generales; seed únicamente como antecedente.
Cuando la ficha contiene una simplificación imprecisa, el copy evita repetirla y usa el alcance
específico documentado: EOIR-33 y moción de cambio de sede son documentos distintos.
No se transforman límites jurídicos o plazos históricos en conclusiones sobre una persona.

## 2. Mapa de fuentes y evidencia

En las referencias locales, `FUENTE/` significa la ruta absoluta de la copia ZIP indicada arriba.
`LANDING/` significa la ruta absoluta del repositorio de implementación.

| ID | Afirmación | Estado | Fuente | Ubicación exacta | Vigencia / límite |
|---|---|---|---|---|---|
| V1 | 12 ofertas y precios públicos | DOCUMENTADO | Catálogo web | [Servicios](https://contygo.app/servicios) | Observado 2026-09-10; no reserva precio futuro. |
| V2 | Nombres, slugs y 14 planes | DOCUMENTADO | Fichas públicas | Los 12 enlaces de sección 4, bloques de descripción y planes | Observado 2026-09-10; no se creó contrato ni pago. |
| V3 | Contacto secundario (número retirado el 2026-10-02: hoy la web usa un único número de WhatsApp) | RETIRADO | Botón público de WhatsApp | [I-485](https://contygo.app/servicios/i-485), «Escríbenos por WhatsApp» | Enlace abierto 2026-09-10 sin enviar mensaje. |
| U1 | Existen garantía, bonos y promoción; condiciones aún por enviar | DOCUMENTADO | Confirmación explícita del usuario | Conversación de este encargo, corrección posterior a la primera versión | Acredita existencia declarada; no cobertura, valor, elegibilidad ni fechas. Tratamiento en §6.3. |
| U2 | Recorrido elegido: oferta general → servicio → video → contrato | DOCUMENTADO | Instrucción explícita del usuario | Conversación de este encargo, última corrección de conversión | Requisito de diseño, no prueba de que las doce pantallas estén implementadas. |
| U3 | 500+ clientes atendidos; propuesta de garantía de reembolso y alza de precio en siete días | DOCUMENTADO / PROPUESTO | Confirmación e ideas del usuario | Conversación de este encargo, actualización de ContygoStory | La cifra acredita clientes atendidos, no aprobaciones. Reembolso y alza son ideas pendientes de condiciones; no autorizan prometer cobertura, precio futuro o fecha. |
| S1 | Público latino, pro se, organización y soporte | DOCUMENTADO | SoT | `FUENTE/docs/sot/docs/00-vision/00-producto.md:14`, `:20` | Declaración de producto; no auditoría de atención. |
| S2 | Crear contrato y pasos de la interfaz | DOCUMENTADO | i18n | `FUENTE/src/frontend/i18n/messages/es.json:185`, `:205`, `:265` | Texto en código; no prueba de firma real. |
| S3 | Gastos, naturaleza, límites y cláusula 11 sin devoluciones tras firma | DOCUMENTADO | Plantilla contractual | `FUENTE/src/backend/modules/contracts/contract-boilerplate.ts:139`, `:143`, `:155` | Plantilla leída; el contrato específico prevalece. Conciliar una eventual garantía de reembolso con U1. |
| S4 | Paquete, evaluación, partes, cuotas, confirmación | DOCUMENTADO | Spec de producto | `FUENTE/specs/contratacion-cinco-pasos.md:27`, `:142` | Especificación; no medición de contratos. |
| S5 | Gate de cuenta/correo/caso existente | DOCUMENTADO | Código | `FUENTE/src/app/(cliente)/servicios/[slug]/contract-gate.ts:24` | Inspección estática, sin ejecutar backend. |
| S6 | Básico: custodia e I-360, $2,500 | DOCUMENTADO | Historial de configuración | `FUENTE/docs/historial/2026-09-07-visa-juvenil-basico-en-produccion.md:15`, `:42` | Precio también confirmado en V2; no caso real probado aquí. |
| S7 | I-360 por menor y respaldo | DOCUMENTADO | Historial de producto | `FUENTE/docs/historial/2026-07-31-handoff-sesion-i-360.md:12` | Su precio provisional se descarta; rige V2. |
| S8 | I-485 SIJ y expediente por menor | DOCUMENTADO | Guía de producto | `FUENTE/docs/guides/i-485-desde-el-admin.md:45`, `:81`, `:103` | Precio de receta no acredita precio vivo; rige V2. |
| S9 | Asilo: I-589 y memorándum | DOCUMENTADO | Historial de producto | `FUENTE/docs/historial/2026-07-10-asilo-fase-unica.md:12` | Alcance documentado, no SLA vigente. |
| S10 | Reforzar usa I-589 ya presentado | DOCUMENTADO | Historial de producto | `FUENTE/docs/historial/2026-07-13-reforzar-asilo-servicio-nuevo.md:7` | Precio antiguo superado por V2/S11. |
| S11 | Evaluación y reforzamiento en un contrato | DOCUMENTADO | Spec/historial | `FUENTE/docs/historial/2026-08-20-fase-de-herramienta-externa.md:11` | $600 también observado en V2. |
| S12 | Evaluación: IA, PDF, un intento | DOCUMENTADO | Historial de producto | `FUENTE/docs/historial/2026-07-23-evaluacion-asilo-juez.md:5` | Extra administrativo no es bono garantizado. |
| S13 | BIA: EOIR-26, Statement, Proof of Service | DOCUMENTADO | Historial de configuración | `FUENTE/docs/historial/2026-07-20-apelacion-statement-proof-of-service.md:12` | Sustituye el brief anterior. |
| S14 | Cambio de Corte: formularios y moción separados | DOCUMENTADO | Spec de producto | `FUENTE/specs/cambio-de-corte-flujo.md:25`, `:54` | SLA histórico no se publica como plazo actual. |
| S15 | Reapertura ante misma corte | DOCUMENTADO | Historial de producto | `FUENTE/docs/historial/2026-08-12-reapertura-servicio-nuevo.md:12` | No extrapolar resultados jurídicos al visitante. |
| S16 | Antecedente de taxes/ITIN | DOCUMENTADO | Seed histórico | `FUENTE/supabase/seeds/02_catalogo_servicios.sql:54`, `:58` | No acredita disponibilidad ni precio actuales. |
| S17 | Documentos fiscales de referencia | DOCUMENTADO | SoT de seed | `FUENTE/docs/sot/docs/30-bd/32-migraciones-y-seeds.md:568` | No amplía el paquete publicado. |
| S18 | Nueve IDs y slugs anteriores | DOCUMENTADO | Código de landing | `LANDING/lib/services.ts:40` | Las promesas antiguas no son evidencia comercial. |
| S19 | Datos locales de 12 servicios/14 planes | DOCUMENTADO | Archivo de presentación | `LANDING/lib/contygo-catalog.ts`, `CONTYGO_SERVICES` | Sintaxis/datos comprobados; no backend ni contratación probados. |
| S20 | Nueve rutas locales y su resolución | DOCUMENTADO | Código de rutas | `LANDING/app/[slug]/page.tsx:12`; `LANDING/lib/services.ts:239` | Comprobación estática; tres ofertas nuevas enlazan externamente. |
| S21 | Razón social y domicilio declarados | DOCUMENTADO | Páginas legales del repositorio | `LANDING/app/terminos/page.tsx:44`; `LANDING/app/privacidad/page.tsx:34` | USA LATINO PRIME LLC, Highland, Utah; no verificación registral. |
| S22 | Doce presentaciones locales, medios y salida contractual | DOCUMENTADO | Implementación de la landing | `LANDING/lib/contygo-presentation.ts`; `LANDING/components/contygo/ServicePresentation.tsx:32`, `:40` | Código incorporado: video a iniciativa del usuario, sin redirección al finalizar; tres medios específicos faltantes. |
| S24 | Reconstrucción anterior con catálogo integrado y campañas | DOCUMENTADO, HISTÓRICO | Código de landing | `LANDING/components/contygo/ContygoExperience.tsx`; `LANDING/components/contygo/ServiceExplorer.tsx` | Conservados como antecedente; ya no están montados en la homepage. Sustituidos por S25. |
| S23 | Build ampliada y pruebas anteriores del recorrido U2 | DOCUMENTADO, HISTÓRICO | Informe de integración del agente principal | Conversación de este encargo: build de 45 rutas, 13/13 tests y recorrido Visa Juvenil | Registro del 2026-09-10; no acredita una build final de ContygoStory. |
| S25 | ContygoStory + ServiceOffer y validación actual | DOCUMENTADO | Código y reporte del agente principal | `LANDING/app/page.tsx:2`; `LANDING/components/contygo/ContygoStory.tsx`; `LANDING/components/contygo/ServiceOffer.tsx`; registro al final de §12 | QA en 390/320 px móvil y 1280 px escritorio; build final de 45 páginas con lint/tipos y 13/13 pruebas. Sin firma ni pago real. |
| S26 | Entregables, ejemplos de documentos y doce guías PDF gratuitas | DOCUMENTADO | Catálogo, referencias de producto y archivos locales | `LANDING/lib/contygo-deliverables.ts`; `LANDING/public/contygo/guias/{slug}.pdf` | Fuentes revisadas por los agentes; 12 archivos coinciden con los slugs. Ejemplos orientativos, no requisitos universales ni asesoría legal. |
| I1 | Tutor y beneficiario pueden participar juntos en compra | INFERIDO | Roles de partes | S6/S7/S8 | Se deduce del titular tutor y menores; no estudio de compradores. |
| P1 | Cinco grupos, jerarquía y CTA de catálogo | PROPUESTO | Brief | Secciones 5–10 de este documento | Decisión editorial; no promesa comercial nueva. |
| N1 | Misión oficial, historia y métricas de éxito | NO ENCONTRADO | Alcance de sección 1 | SoT/documentación/páginas públicas revisadas | No demuestra inexistencia; se omiten como hechos. |
| N2 | SLA y rondas vigentes por paquete | NO ENCONTRADO | Fichas y documentos revisados | V2 y tabla 4.13 | Datos históricos no fijan compromisos actuales. |
| C1 | Seed de 13 ofertas vs 12 públicas; LLC futura vs vigente | CONFLICTO | Seed/SoT y catálogo público | S16; `FUENTE/docs/sot/docs/00-vision/00-producto.md`, §5.2; V1/V2 | Para disponibilidad prevalece observación pública actual. |
| C2 | Precios históricos vs actuales | CONFLICTO | Historial y fichas | S7/S10; `FUENTE/docs/historial/2026-07-15-apelacion-servicio-nuevo.md:29`; V2 | I-360 500→1,000; Reforzar 900→600; BIA 500→700. Se usa V2. |
| C3 | WhatsApp histórico vs contacto actual | CONFLICTO | Spec y enlace público | `FUENTE/specs/contacto-org-en-ficha-servicio.md:9`; V3 | La spec del ZIP lleva fecha 11-sep; no se usa para fechar el cambio. V3 verifica destino actual. |

## 3. Dossier empresarial

**DOCUMENTADO en S1/S2 y estructura del código.** ContyGo organiza y prepara trámites, con cuenta,
documentos, formularios, contrato, pagos, seguimiento e historial. Los textos públicos describen
un modelo en el que la persona conduce su trámite con guía y soporte de la plataforma.
La organización aparece como UsaLatinoPrime en el código contractual.

La oferta actual cubre necesidades familiares/SIJS, asilo, actuaciones ante corte, impuestos,
ITIN y constitución de LLC en Florida. La landing no debe reducir ese negocio a Visa Juvenil.
Evaluación de Asilo es un servicio propio y también una fase incluida en Reforzar Asilo;
comprar reforzamiento no debe presentarse como una compra adicional obligatoria de evaluación.

**Propuesta de presentación.** Una sola puerta de entrada permite identificar el trámite,
leer qué se prepara, conocer el precio, abrir su explicación en video y continuar a contratar.
U3 autoriza «500+ clientes atendidos»; no convertirlo en casos aprobados ni tasa de éxito.
Certificaciones, reseñas, logos de asociaciones y puntuaciones siguen sin evidencia autorizada.
Garantía y promoción U1/U3 esperan condiciones publicables. El bono actual es una guía PDF real
por servicio, gratuita y sin registro (S26); otros bonos de U1 continúan pendientes.
No se publican datos de casos, ni se reutilizan capturas que identifiquen clientes.
La oportunidad de conversión es reducir dudas sobre alcance y destino, no calificar legalmente al visitante.

| Campo empresarial | Estado | Hallazgo o propuesta |
|---|---|---|
| Identidad y sede | DOCUMENTADO | ContyGo / UsaLatinoPrime; razón social y Highland, Utah en S21. No equivale a acreditación profesional. |
| Cobertura | DOCUMENTADO | Comunidad latina en EE. UU. (S1); LLC específicamente Florida (V2). Cobertura exacta por estado/servicio: NO ENCONTRADO. |
| Propósito operativo | DOCUMENTADO | Organizar y preparar trámites que la persona conduce, con apoyo tecnológico/administrativo (S1/S3). |
| Historia, fecha de fundación, misión oficial, valores oficiales | NO ENCONTRADO | No publicar antigüedad ni declaraciones institucionales inventadas. |
| Visión de producto | DOCUMENTADO | Catálogo ampliable a líneas empresariales/familiares en S1, §5.2; no es una misión corporativa aprobada. |
| Misión sugerida | PROPUESTO | «Hacer comprensibles y organizados los pasos de tus trámites, con información clara y apoyo en español». Validación empresarial pendiente. |
| Visión sugerida | PROPUESTO | «Ser un lugar accesible para gestionar los trámites de tu vida, tu familia y tu actividad en Estados Unidos». Validación pendiente. |
| Valores/voz sugeridos | PROPUESTO | Claridad, autonomía y cuidado de la información; se derivan del posicionamiento, no se presentan como valores oficiales. |
| Compradores y participantes | INFERIDO | La persona interesada, tutor o familiar puede decidir/pagar; beneficiarios aportan datos. Base: I1. |
| Responsabilidades | DOCUMENTADO | Cliente aporta información veraz, revisa y firma; servicio organiza/prepara; autoridad decide (S3). |
| Confianza/diferenciación | DOCUMENTADO | Precios/fichas públicas y recorrido de contrato (V1/V2/S2). Ventaja comparativa frente a competidores: NO ENCONTRADO. |
| Equipo/acreditaciones/casos de éxito | NO ENCONTRADO | No hay evidencia comercial suficiente revisada para publicarlos. No se transforma personal interno en aval profesional. |

**INFERIDO:** el valor práctico de centralizar documentos/contrato/pagos es reducir dispersión y
aclarar próximos pasos. Es una interpretación de S1/S2, no un resultado medido ni una garantía.

## 4. Catálogo de servicios

Los nombres y planes siguientes reproducen el catálogo vivo observado; los resúmenes son copy
editorial basado en las fuentes. “Desde” identifica el menor precio publicado de cada servicio.
Los tiempos de preparación y respuesta gubernamental se omiten por variación y deriva documental.
En cada ficha, «Destino» y «Crear mi contrato» identifican la salida final a ContyGo desde la
pantalla de video; el CTA de elección de la landing abre primero `/servicios/{slug}` local (U2, §10).

### 4.1 Visa Juvenil Básico — familia

- **ID local:** `visa-juvenil`. **Destino:** [Visa Juvenil Básico](https://contygo.app/servicios/visa-juvenil-basico).
- **Plan verificado:** Básico, **$2,500**.
- **Para quién:** tutores y menores que necesitan preparar custodia estatal y petición SIJS.
- **Alcance:** custodia, declaraciones de tutor/menores/testigos según caso y petición I-360.
- **Entregables:** declaraciones y expediente por etapa; I-360 por menor según configuración.
- **Límite decisivo:** no incluye I-485. No prometer residencia dentro de este paquete.
- **Respaldo:** V2 + S6. El historial confirma $500 inicial y 8 cuotas mensuales de $250.
- **Uso del precio:** mostrar el total; las opciones vigentes de pago se eligen en ContyGo.

### 4.2 I-360 — Inmigrante Juvenil Especial (SIJS) — familia

- **ID local:** `i-360`. **Destino:** [I-360](https://contygo.app/servicios/i-360).
- **Plan verificado:** Sin abogado, **$1,000**.
- **Para quién:** tutores y menores con orden estatal que necesitan preparar la petición SIJS.
- **Alcance:** preparación documental de la petición ante USCIS.
- **Entregables:** un I-360 por menor y expediente con orden certificada/documentos de respaldo.
- **Límite decisivo:** custodia e I-485 son etapas distintas; no se ofrecen incluidas aquí.
- **Respaldo:** V2 + S7. La variante de $500 de un historial fue provisional y quedó superada.
- **CTA:** Crear mi contrato, hacia la ficha exacta de I-360.

### 4.3 Ajuste de estatus I-485 (SIJ) — familia

- **ID local:** `i-485`. **Destino:** [I-485 (SIJ)](https://contygo.app/servicios/i-485).
- **Plan verificado:** Estándar, **$1,500**.
- **Para quién:** menores con I-360 SIJ aprobado que necesitan revisar las condiciones del ajuste.
- **Alcance:** preparación del formulario y de sus evidencias, por menor.
- **Entregables:** I-485 y expediente correspondiente a cada menor.
- **Límite decisivo:** I-360 aprobado no equivale por sí mismo a estar listo para presentar I-485.
- **Respaldo:** V2 + S8. Las condiciones se revisan en ContyGo, no en un test de la landing.
- **CTA:** Crear mi contrato, hacia la ficha exacta de I-485.

### 4.4 Asilo Político — asilo

- **ID local:** `asilo`. **Destino:** [Asilo Político](https://contygo.app/servicios/asilo-politico).
- **Plan verificado:** Sin abogado, **$1,500**.
- **Para quién:** personas que necesitan preparar una solicitud de asilo.
- **Alcance:** I-589, declaración, evidencias y memorándum de Miedo Creíble.
- **Entregables:** formularios y expediente organizados con la información aportada.
- **Límite decisivo:** no incluye representación ni decisión favorable de USCIS/corte.
- **Respaldo:** V2 + S9. La SoT antigua de varias fases no determina la experiencia actual.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Asilo Político.

### 4.5 Reforzar Asilo — asilo

- **ID local:** `reforzar-asilo`. **Destino:** [Reforzar Asilo](https://contygo.app/servicios/reforzar-asilo).
- **Plan verificado:** Sin abogado, **$600**.
- **Para quién:** personas con I-589 ya presentado que necesitan preparar el respaldo de su caso.
- **Alcance:** evaluación inicial y reforzamiento documental dentro del mismo contrato.
- **Entregables:** evaluación, cuestionario y memorándum basado en declaración/evidencias/I-589.
- **Límite decisivo:** no incluye preparar una nueva solicitud I-589 ni representación.
- **Respaldo:** V2 + S10 + S11. No ofrecer otra evaluación pagada como requisito del paquete.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Reforzar Asilo.

### 4.6 Evaluación de Asilo — asilo

- **ID local:** `evaluacion-asilo`. **Destino:** [Evaluación de Asilo](https://contygo.app/servicios/evaluacion-asilo).
- **Plan verificado:** Sin abogado, **$50**.
- **Para quién:** personas que quieren revisar la información documental de su caso.
- **Alcance:** un intento de evaluación con IA a partir de los documentos compartidos.
- **Entregables:** informe PDF accesible desde la cuenta.
- **Límite decisivo:** no incluye preparar/presentar asilo; no sustituye asesoría legal.
- **Respaldo:** V2 + S12. Un intento extra administrativo es una posibilidad, no una promesa de paquete.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Evaluación de Asilo.

### 4.7 Apelación (BIA) — corte

- **ID local:** `apelacion`. **Destino:** [Apelación (BIA)](https://contygo.app/servicios/apelacion).
- **Plan verificado:** Sin abogado, **$700**.
- **Para quién:** personas que necesitan preparar una apelación de una decisión migratoria.
- **Alcance:** paquete documental para presentar ante la BIA.
- **Entregables:** EOIR-26, Statement of Reasons for Appeal y Proof of Service; anexos pertinentes.
- **Límite decisivo:** no representación; tasas gubernamentales aparte; no prometer un Appeal Brief adicional.
- **Respaldo:** V2 + S13. El brief previo se desactivó; el precio histórico de $500 quedó superado.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Apelación (BIA).

### 4.8 Cambio de Corte — corte

- **ID local:** `cambio-corte`. **Destino:** [Cambio de Corte](https://contygo.app/servicios/cambio-de-corte).
- **Plan verificado:** Sin abogado, **$250**.
- **Para quién:** personas que se mudaron y necesitan solicitar un cambio de sede.
- **Alcance:** documentación de domicilio/caso, cuestionarios, preparación y envío del paquete.
- **Entregables:** EOIR-33 de dirección y moción de cambio de sede como documentos separados.
- **Límite decisivo:** el cambio depende de decisión de la corte; no se promete traslado automático.
- **Respaldo:** V2 + S14. Se evita la confusión entre EOIR-33 y moción presente en textos antiguos.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Cambio de Corte.

### 4.9 Apelación (Re-apertura) — corte

- **ID local:** `reapertura`. **Destino:** [Apelación (Re-apertura)](https://contygo.app/servicios/reapertura-in-absentia).
- **Plan verificado:** Sin abogado, **$250**.
- **Para quién:** personas con orden in absentia que necesitan preparar una moción de reapertura.
- **Alcance:** motivo de ausencia, evidencias y solicitud ante la corte que emitió la orden.
- **Entregables:** moción, Proof of Service, carátula y EOIR-26A cuando corresponda.
- **Límite decisivo:** no es apelación BIA. No afirmar suspensión automática o reapertura garantizada.
- **Respaldo:** V2 + S15. Se conserva el nombre público y se explica su naturaleza precisa.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Re-apertura.

### 4.10 Número ITIN — fiscal

- **ID local:** `itin`. **Destino:** [Número ITIN](https://contygo.app/servicios/itin-number).
- **Plan verificado:** Individual, **$250**.
- **Para quién:** personas que necesitan solicitar identificación fiscal individual.
- **Alcance:** preparación de solicitud W-7 y organización documental.
- **Entregables:** solicitud y respaldo pertinente según la ficha/contrato vigentes.
- **Límite decisivo:** no prometer emisión del ITIN, facultad de empleo o estatus migratorio.
- **Respaldo:** V2 + antecedentes S16/S17, que no se usan para ampliar el paquete actual.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Número ITIN.

### 4.11 Declaración de Impuestos — fiscal

- **ID local:** `impuestos`. **Destino:** [Declaración de Impuestos](https://contygo.app/servicios/taxes).
- **Planes verificados:** Individual **$100**; Familiar **$150**. Precio desde $100.
- **Para quién:** personas y familias que necesitan preparar una declaración.
- **Alcance:** preparación de declaración y organización de documentos de ingresos/identidad.
- **Entregables:** declaración según el alcance del paquete contratado.
- **Límite decisivo:** no prometer reembolso; no inferir años, estados o declaraciones incluidos.
- **Respaldo:** V2 + antecedentes S16/S17. “Federal y estatal” de la landing vieja no amplía la ficha.
- **CTA:** Crear mi contrato, hacia la ficha exacta de Declaración de Impuestos.

### 4.12 Creación de LLC — empresa

- **ID local:** `llc`. **Destino:** [Creación de LLC](https://contygo.app/servicios/llc-florida).
- **Planes verificados:** Constitución **$500**; Constitución + Identidad de Marca **$1,000**.
- **Para quién:** personas que quieren constituir una LLC en Florida.
- **Alcance:** Articles of Organization, agente registrado y EIN, según el paquete publicado.
- **Entregables:** constitución; identidad de marca únicamente en el paquete que la incluye.
- **Límite decisivo:** no extender a otros estados ni inventar renovaciones, asesoría o activos de marca.
- **Respaldo:** V2. La SoT local aún llama a LLC “futuro”; la ficha viva confirma que ya se ofrece.
- **CTA:** Crear mi contrato, hacia la ficha exacta de LLC Florida.

### 4.13 Campos operativos, requisitos y vacíos por servicio

Esta tabla complementa cada ficha: no sustituye sus planes, exclusiones, evidencia ni siguiente paso.
**C1 — común a las 12:** plazo vigente de preparación/entrega, número de rondas de revisión,
horarios/SLA de soporte y cantidad de sesiones incluidas: **NO ENCONTRADO**. La guía y el soporte
están **DOCUMENTADOS** a nivel producto (S1/S2) y el contacto actual en V3; no se atribuyen cupos por plan.
Los SLA/citas de historiales son antecedentes, no compromisos comerciales vigentes. La duración
gubernamental es externa (S3). Las preguntas de encaje se completan en ContyGo; esta tabla no califica personas.

| Servicio | Problema / utilidad para el comprador — INFERIDO | Requisitos de preparación — DOCUMENTADO salvo indicación | Formato/cantidad documentados | Plazo, revisiones y soporte |
|---|---|---|---|---|
| Visa Juvenil Básico | Coordinar custodia e I-360 en un proceso | Tutor, uno o más menores y documentos de respaldo (S6) | Declaración del tutor, por menor y por testigo cuando exista; I-360 por menor | C1 |
| I-360 | Organizar la petición después de la orden estatal | Orden certificada y documentos del menor (S7) | Un formulario I-360 por menor; expediente | C1 |
| I-485 (SIJ) | Preparar el ajuste con respaldo por menor | I-360 aprobado, documentos y revisión de condiciones en app (S8) | Un I-485 y expediente por menor | C1 |
| Asilo Político | Convertir información dispersa en solicitud organizada | Identidad, historia, declaración y evidencias (S9) | I-589 y memorándum; páginas finales: NO ENCONTRADO | C1 |
| Reforzar Asilo | Revisar el respaldo de un caso ya presentado | I-589 presentado, declaración y evidencias (S10/S11) | Evaluación e informe/memorándum; extensión final: NO ENCONTRADO | C1 |
| Evaluación de Asilo | Revisar información antes de decidir próximos pasos | Documentos aportados en la herramienta (S12); listado completo: NO ENCONTRADO | Un intento y un informe PDF; número de páginas: NO ENCONTRADO | C1; intento extra no garantizado |
| Apelación (BIA) | Organizar el paquete de apelación | Decisión y documentos del caso; revisión de condiciones en app (S13) | EOIR-26, Statement of Reasons y Proof of Service | C1 |
| Cambio de Corte | Preparar una solicitud de cambio de sede | Documentación de domicilio y caso (S14) | EOIR-33, moción separada y paquete para corte/fiscal | C1 |
| Re-apertura | Documentar motivo de ausencia y solicitud | Orden in absentia, motivo y evidencias (S15) | Moción, Proof of Service, carátula; EOIR-26A si corresponde | C1 |
| Número ITIN | Organizar identificación fiscal y respaldo | Identidad; lista vigente completa: NO ENCONTRADO (S16/S17 son antecedentes) | Solicitud W-7; copias/envíos exactos: NO ENCONTRADO | C1 |
| Impuestos | Reunir información para declarar | Identificación/ingresos; lista vigente por plan: NO ENCONTRADO (S17) | Declaración Individual/Familiar; años/estados/cantidad: NO ENCONTRADO | C1 |
| LLC | Organizar la constitución de una empresa en Florida | Cobertura Florida (V2); requisitos documentales completos: NO ENCONTRADO | Constitución/EIN; cantidad/formato de activos de marca: NO ENCONTRADO | C1 |

**Proceso y cobro comunes — DOCUMENTADO:** elegir paquete → condiciones/evaluación aplicable →
personas → plan de pago → confirmar/firmar (S2/S4/S5); importes y modalidad por servicio en §4.1–4.12.
El precio es por paquete, no una suscripción inferida. Cuotas vigentes se leen en la app.
**Objeciones comunes — INFERIDO:** encaje, documentos faltantes, alcance, gastos externos y qué
ocurre tras firmar. Las FAQ de §8 responden lo documentado; los límites de cada ficha indican
cuándo no encaja. Criterios cuantitativos de aceptación y revisiones adicionales: **NO ENCONTRADO**.

## 5. Comprador y posicionamiento

**PROPUESTO:** “Tus trámites, organizados. Tu siguiente paso, claro.”
ContyGo es la marca de la experiencia. USA LatinoPrime aporta el respaldo institucional.
La comunicación debe explicar qué puede hacer la persona y qué documentación prepara el servicio.
Usar “tu trámite”, “tu cuenta”, “documentos”, “guía” y “soporte” en lenguaje cotidiano.
Evitar presentar al soporte como abogado, firma legal o representante de la persona.
No usar “calificas”, “aprobación garantizada”, “sin riesgo” o “Green Card asegurada”.
No atribuir al producto certificados, tasas de éxito, reseñas ni alianzas no verificadas.
La cercanía proviene del español claro y de la claridad del proceso, no de presión por urgencia.
La oferta abarca familia, asilo, corte, fiscal y empresa con igual acceso desde el catálogo.
Visa Juvenil Básico puede destacarse editorialmente, pero nunca reemplaza el catálogo completo.

| Aspecto de compra | Estado | Interpretación y decisión |
|---|---|---|
| Segmento prioritario | DOCUMENTADO | Comunidad latina en EE. UU. (S1), con catálogo general por instrucción del usuario. |
| Situación de compra | INFERIDO | La persona ya identifica un trámite o necesita distinguir servicios cercanos; por eso filtros y alcance antes de firmar. Base: V1/V2. |
| Motivación y riesgo percibido | INFERIDO | Ordenar documentos, entender gasto y evitar contratar otra etapa por error. Base: servicios separados SIJS/asilo/corte. |
| Nivel de conocimiento | PROPUESTO | Redactar para quien conoce su necesidad pero no todos los formularios; nombre público seguido de explicación sencilla. |
| Tráfico de adquisición | DOCUMENTADO | Homepage acepta ?servicio= con ID o slug conocido y destaca su categoría/oferta (S24); también existen rutas anteriores. Tráfico real, volúmenes y mix: NO ENCONTRADO. |
| Prueba de la promesa | DOCUMENTADO | Oferta/precio consultables y mecanismo de contrato documentado (V1/V2/S2/S5); no prueba de resultados migratorios. |
| Conversión | PROPUESTO sobre U2 | Elegir servicio, abrir su video y contratar por cuenta propia; detalle y soporte secundarios. No forzar cuestionario, conversación comercial ni reproducción completa. |

## 6. Oferta comercial

### 6.1 Oferta paraguas y razón de compra

**PROPUESTO:** «Prepara tu trámite. Paso a paso».
Apoyo: «Servicios migratorios, fiscales y para tu empresa. Revisa qué prepara cada servicio,
conoce el precio de tu paquete y crea tu contrato en ContyGo».
La promesa común es **preparación y organización con un alcance definido**. No es obtener estatus,
un reembolso fiscal ni una empresa rentable. Cubre las nueve ofertas migratorias de familia/asilo/corte,
las dos fiscales y LLC Florida; cada una conserva su público, límites y precio de §4.
Misión y visión sugeridas en §3 siguen siendo propuestas internas, no declaraciones oficiales.

**INFERIDO:** antes de comprar, la persona necesita relacionar su necesidad con un producto concreto,
saber qué recibirá, comprender el importe y conocer sus responsabilidades. Por eso cada beneficio
conduce a evidencia del servicio y después al contrato, sin conversación comercial obligatoria.

| Beneficio propuesto al comprador | Entregable o mecanismo que lo sostiene | Prueba exacta y límite |
|---|---|---|
| «Elige el servicio que corresponde a tu próximo paso». | Público y exclusiones de cada ficha; distinción entre Básico/I-360/I-485, asilo/refuerzo/evaluación y BIA/reapertura. | §4.1–4.9, V2, S6–S15. La landing explica; no determina elegibilidad jurídica. |
| «Conoce qué documentos se preparan». | Formularios, declaraciones, expediente o informe identificados por servicio. | §4.13 y tabla 6.2. Cantidades solo cuando están documentadas; ningún resultado de autoridad se vende como entregable. |
| «Revisa el precio antes de crear tu contrato». | Plan y total públicos; condiciones y opciones de pago en ContyGo. | V2 y S4 (:27, :142 en §2). No hay descuento ni ahorro comparativo acreditado. |
| «Consulta documentos, contrato y pagos desde tu cuenta». | Cuenta y herramientas de gestión documentadas como parte de la experiencia. | S1 (:14, :20), S2 (:185, :205, :265). No afirmar ahorro de tiempo cuantificado, atención ilimitada o funciones idénticas en cada fase. |

### 6.2 Entregables medibles que hacen concreto el valor

«Medible» aquí significa identificar una pieza, un formato o una unidad de preparación;
no atribuir una mejora porcentual. La condición de aceptación comercial y las rondas de revisión
siguen **NO ENCONTRADO** (C1, §4.13). La tabla orienta la presentación y reutiliza §4 como referencia contractual.

| Servicio / valor que explica la pieza — PROPUESTO | Pieza verificable que puede mostrarse — DOCUMENTADO | Prueba y límite decisivo |
|---|---|---|
| Visa Juvenil Básico — coordinar dos etapas documentales | Custodia y declaraciones; I-360 por menor según configuración | §4.1, S6. I-485 separado; no número fijo de testigos ni menores incluidos en un precio universal. |
| I-360 — preparar la petición con la orden estatal | Un I-360 por menor y expediente con orden certificada | §4.2, S7. No incluye custodia ni I-485. |
| I-485 (SIJ) — organizar el expediente del ajuste | Un I-485 y expediente por menor | §4.3, S8. Aprobación de I-360 no basta por sí sola para presentar ajuste. |
| Asilo Político — ordenar solicitud, relato y evidencias | I-589, declaración y memorándum con respaldo | §4.4, S9. No prometer aprobación ni una cantidad de páginas. |
| Reforzar Asilo — trabajar sobre el caso ya presentado | Evaluación inicial y memorándum a partir de I-589/declaración/evidencias | §4.5, S10/S11. La evaluación ya pertenece al alcance; no es un bono. |
| Evaluación de Asilo — revisar información documental | Un intento de evaluación con IA y un informe PDF | §4.6, S12. No incluye preparar/presentar asilo ni una evaluación jurídica humana. |
| Apelación (BIA) — identificar las piezas de la apelación | EOIR-26, Statement of Reasons y Proof of Service | §4.7, S13. No añadir el Appeal Brief anterior, desactivado. |
| Cambio de Corte — separar dirección y petición de sede | EOIR-33, moción separada y paquete para corte/fiscal | §4.8, S14. La moción no garantiza traslado. |
| Apelación (Re-apertura) — documentar la solicitud ante la misma corte | Moción, Proof of Service y carátula; EOIR-26A si corresponde | §4.9, S15. No confundir con BIA ni prometer suspensión automática. |
| Número ITIN — organizar la solicitud fiscal | Solicitud W-7 y respaldo pertinente | §4.10, V2/S16/S17. Cantidad exacta de copias/envíos y lista actual completa: NO ENCONTRADO. |
| Declaración de Impuestos — preparar la declaración del paquete elegido | Declaración Individual o Familiar | §4.11, V2/S16/S17. Años, estados y número de declaraciones incluidos: NO ENCONTRADO; no inventarlos. |
| Creación de LLC — preparar la constitución en Florida | Articles of Organization, gestión de agente registrado/EIN según paquete | §4.12, V2. Piezas y cantidades de Identidad de Marca: NO ENCONTRADO; mostrar nombre del plan sin inventar activos. |

### 6.3 Secuencia de la oferta y tratamiento de condiciones pendientes

**DOCUMENTADO:** 12 servicios y 14 planes V1/V2. Todos los importes exactos se mantienen en §4;
cada bloque usa el servicio elegido. Mostrar total en USD y «Desde» si hay variantes; sin sumar
servicios diferentes en un supuesto paquete general. Cuotas y cargos por personas se confirman
en ContyGo. S3 documenta gastos operativos y exclusión de tasas gubernamentales; el contrato
específico prevalece. No publicar «todo incluido» ni equiparar revisión con representación legal.

| Secuencia | Desarrollo recomendado | Estado y condición |
|---|---|---|
| 1. Promesa | Preparación paso a paso con alcance definido para migración, fiscal y empresa. | PROPUESTO, apoyado en S1/V1; no promete regularización universal. |
| 2. Beneficios | Elegir la etapa, identificar documentos, conocer precio y gestionar en la cuenta. | PROPUESTO; utilidad INFERIDA y mecanismo DOCUMENTADO en 6.1. |
| 3. Entregables | Selector de los 12 servicios con piezas, público y exclusión decisiva. | DOCUMENTADO, 6.2/§4; no exigir selección ni cuestionario para acceder a precios. |
| 4. Precio | Catálogo con planes y total de la oferta elegida. | DOCUMENTADO, V2; 14 planes, sin ancla de precio tachado. |
| 5. Garantía/respaldo | Publicar hoy alcance, condiciones antes de firma y responsabilidades. | Respaldo DOCUMENTADO en S2–S5. Existencia de garantía confirmada por usuario (U1); condiciones NO ENCONTRADO. |
| 6. Bonos reales | Guía de preparación PDF del servicio elegido, gratuita, con descarga directa y sin registro. Después se presenta la app como parte del servicio. | Doce guías reales DOCUMENTADAS en S26. Otros bonos de U1 esperan condiciones; no se asigna valor monetario ficticio a la guía ni se renombra la app como bono. |
| 7. Reiteración de precio y valor | Repetir servicio, plan, alcance, total y tasas aparte; añadir únicamente bonos confirmados y aplicables cuando se documenten. | PROPUESTO; datos de V2/§4. No sumar valores ficticios para simular ahorro. |
| 8. FAQ | Resolver encaje, alcance, cuenta, firma, pagos y límites antes de decidir. | PROPUESTO, respuestas sustentadas en V2/S2–S5. |
| 9. Escasez/disponibilidad | «Revisa la disponibilidad y las condiciones vigentes en ContyGo». | Ofertas públicas DOCUMENTADAS en V1/V2. Promoción confirmada U1; cupos, fechas o límite real NO ENCONTRADO. Sin contador ni «últimos cupos». |
| 10. Contratar | Elección abre el video del servicio; allí «Crear mi contrato» lleva a su ficha exacta. Sin selección, volver a catálogo. | U2 y destinos DOCUMENTADOS de §4/§10; el clic no firma ni cobra. |

**U1 — confirmación de esta conversación:** el usuario indica que existen garantía, bonos y promoción
y enviará las condiciones. Esto acredita existencia declarada, no aprobación de ningún texto específico.
Para publicar garantía faltan cobertura, activación, remedio, exclusiones, plazo y responsable;
para otros bonos, contenido/cantidad/formato, servicio/plan aplicable, entrega, costo real y condiciones;
para promoción, precio o ventaja, elegibilidad, inicio/fin con zona horaria y límite verificable si existe.
Responsable de definir/aprobar: empresa; persona concreta **NO ENCONTRADO**.
No inventar una garantía operativa provisional ni asignar costo cero a futuros bonos.
La cláusula 11 de S3 (`contract-boilerplate.ts:155`) dice que tras la firma no hay devoluciones: una futura garantía de reembolso
necesitaría alinear el texto comercial y contractual antes de publicarse, no superponer promesas contradictorias.
Hasta entonces, no aparecen en interfaz tarjetas vacías de «Garantía», «Bono» o «Oferta especial».
U3 propone explorar reembolso y subida de precio a los siete días; no están implementados.
Se esperan importe/ventaja, fecha y zona horaria, aplicabilidad y condiciones verificables;
la cláusula 11 sigue pendiente de conciliación si la garantía finalmente incluye devolución.
La guía gratuita S26 sí se publica porque su contenido y descarga ya existen.

## 7. Arquitectura de la landing

**DOCUMENTADO, S25 — versión actual:** la homepage monta ContygoStory y ServiceOffer.
ContygoExperience/ServiceExplorer quedan desmontados. La secuencia prioriza móvil:
promesa/beneficios → selector de 12 servicios → entregables y documentos orientativos →
firma/pago confirmado/carga → precio → respaldo → guía PDF gratuita → plataforma →
reiteración de inversión → FAQ → CTA. La presentación local permite continuar al contrato sin quiz ni espera.

| Bloque / decisión del comprador | Mensaje y prueba | Escritorio / móvil | CTA y destino |
|---|---|---|---|
| Hero y beneficios | «Del papeleo a tu próximo capítulo». Migración, impuestos y empresa. «Menos vueltas con el papeleo», «Sabes qué pasa después», «El servicio, claro desde el principio». 500+ clientes atendidos (U3). | Composición de expediente y check; lectura vertical móvil. La ilustración no es un caso real ni un video explicativo. | «Encontrar mi servicio» → #servicios; campaña válida → presentación del servicio. |
| ServiceOffer: elección y entregables | Selector nativo con 12 nombres originales, agrupados 3/3/3/2/1. Piezas concretas, público, ejemplos de documentos y límites desplegables, según §4/S26. | Documento ilustrativo y aportaciones del visitante; columnas en escritorio, apilados en móvil. Sin búsqueda, cards múltiples ni modal. | Elegir actualiza contenido, precios, guía y destinos. |
| Cómo empieza y precio | Firma tras revisar condiciones → pago inicial confirmado → documentos → preparación. Los 14 planes conservan importes de V2. | Cuatro pasos y bloque de precio del servicio; planes múltiples visibles, tasas aparte. | «Ver presentación y continuar» → /servicios/{slug}; texto de video solo si existe el recurso. |
| Respaldo, bono y plataforma | «Lo que acordamos, por escrito». Guía gratuita real del servicio (S26). Cuenta, contrato, documentos y pagos como funciones vinculadas a contratar. | Sello ilustrativo, guía descargable y piezas visuales de la plataforma. Sin promesa de devolución ni valor inventado del regalo. | PDF directo sin registro; ayuda V3 opcional. |
| Reiteración y FAQ | Servicio, alcance resumido y honorarios; cuenta, carga tras pago confirmado, cuotas y límites. | Resumen sincronizado y acordeones nativos; preguntas pertinentes al servicio. Garantía/reembolso esperan términos U1/U3. | Presentación local; «Explorar otro servicio» → #servicios. |
| Cierre y acceso persistente móvil | «Tu próximo paso. ContyGo». Sin escasez ni alza anunciada. | Dock contextual, oculto con menú abierto o hero/precio/cierre visibles. Antes de confirmar elección dirige al selector. | Presentación del servicio elegido o #servicios mientras no haya elección; WhatsApp secundario. |
| Presentación local: ¿entiendo el servicio y puedo contratar? | Nombre, video, alcance, planes y límites de §4. S22 y U2. | Video iniciado por usuario, controles, precio/CTA disponibles; incluidos/exclusiones desplegables. | «Crear mi contrato en ContyGo» → https://contygo.app/servicios/{slug}; sin esperar fin de video ni completar preguntas. |

**Campañas documentadas en S25:** ?servicio= acepta ID estable o slug público conocido
(por ejemplo ?servicio=llc o ?servicio=llc-florida), establece la elección y actualiza su presentación.
Un valor desconocido conserva la experiencia general. Visa Juvenil puede mostrarse inicialmente
como ejemplo, pero el dock no lo considera elección confirmada y lleva al selector hasta elegir.
No se afirma orden preferente, reserva, precio especial, elegibilidad ni atribución comercial por usar el parámetro.
El visitante puede cambiar entre las doce opciones desde el mismo selector.

**Wireframe actual:** sigue la secuencia inicial de esta sección, con header y footer.
En móvil, lectura vertical y acción contextual; precio y CTA juntos en el bloque de inversión.
Tras la elección: pantalla de presentación local → ficha externa ContyGo → cuenta y contrato.
Garantía, promoción y otros bonos U1/U3 esperan condiciones; la guía real S26 ya está disponible.


## 8. Copy propuesto listo para interfaz

El texto entre comillas se destina al visitante. Las notas de evidencia son internas.
Esta sección conserva la propuesta editorial de oferta; el copy y agrupamiento montados actualmente
se identifican en §7/S25. No afirmar que todos estos textos o bloques independientes estén en la homepage.
La tabla de §4 es la única referencia de nombres, planes, importes y límites por servicio;
no se escriben doce versiones divergentes del precio en distintos componentes.

**B1 · Promesa**
«Prepara tu trámite. Paso a paso».
«Servicios migratorios, fiscales y para tu empresa. Revisa qué prepara cada servicio, conoce
el precio de tu paquete y crea tu contrato en ContyGo».
CTA: «Elegir mi servicio». Microcopy: «Revisa tu paquete. Crea tu cuenta. Firma en línea».

**B2 · Beneficios**
«Elige con claridad. Prepara con orden».
«El servicio que corresponde a tu próximo paso: revisa para quién es y qué incluye».
«Documentos identificados desde el inicio: conoce qué se prepara para el servicio que elijas».
«Tu proceso en tu cuenta: consulta documentos, contrato y pagos desde ContyGo».
Nota interna: S1/S2 y §4 sostienen los mecanismos; no hay afirmación de tiempo ahorrado o éxito medido.

**B3 · Entregables**
«Así se concreta tu servicio».
«Selecciona un servicio para ver qué se prepara y qué debes tener en cuenta».
Etiquetas: «Para quién es», «Documentos y entregables», «Fuera de este alcance».
Estado sin selección: «Elige uno de los 12 servicios para revisar sus entregables».
El contenido elegido reproduce §6.2 y se apoya en §4. No mostrar una carpeta genérica como si fuera
el mismo producto para asilo, impuestos y LLC. Si no se conoce cantidad/formato, mantener la descripción limitada.

**B4 · Precio**
«Elige tu servicio. Conoce su precio».
«Compara los paquetes y revisa su alcance. Cuando lo tengas claro, puedes comenzar tu contrato en ContyGo».
Etiquetas: «Desde», «USD», «Paquetes disponibles». CTA: «Ver servicio y video».
«Los precios corresponden a los paquetes publicados. Confirma su vigencia y alcance en ContyGo.
Tasas gubernamentales aparte».
En Impuestos mostrar Individual $100 / Familiar $150; en LLC Constitución $500 /
Constitución + Identidad de Marca $1,000. Los otros diez servicios muestran su plan de §4.
No presentar una cuota como total ni el mínimo de Evaluación de Asilo como precio de toda la oferta.

**B5 · Respaldo**
«Revisa el alcance. Lee las condiciones. Decide».
«Antes de firmar, revisa el paquete, las condiciones y las opciones de pago disponibles en ContyGo».
«Tú aportas la información y revisas tu contrato. ContyGo organiza y prepara según el servicio contratado».
«El servicio no incluye representación legal ni garantiza decisiones de las autoridades».
Nota interna: S2–S5; se explica la responsabilidad real. No titular este bloque «Garantía de satisfacción».
La garantía comercial confirmada por el usuario se redactará al recibir sus condiciones (U1).

**B6 · Guía real y app incluida**
«Tu guía de preparación. De regalo». «Descargar mi guía gratuita». «PDF · Acceso directo, sin registro».
S26: doce guías reales; el enlace usa el slug del servicio elegido. Después se presenta la cuenta:
«Tu cuenta forma parte de la experiencia».
«Consulta tus documentos, tu contrato, tus pagos y el avance de tu caso en ContyGo».
«Una cuenta para seguir los pasos de tu servicio».
Nota interna: S1/S2. No «app gratis valorada en…», atención ilimitada ni disponibilidad de todas las herramientas
en todos los servicios. Otros bonos U1: pendientes de contenido, aplicabilidad y condiciones; sin texto público provisional.

**B7 · Reiteración de inversión**
«Tu servicio. Tu inversión. El siguiente paso».
Con selección: nombre exacto → plan/total → hasta tres entregables documentados → exclusión principal.
«Revisa las condiciones vigentes del paquete en ContyGo antes de firmar».
CTA: «Ver servicio y video». Sin selección: «Elige un servicio para revisar tu alcance e inversión».
Ejemplo sustentado: «Evaluación de Asilo · Sin abogado · $50 USD. Un intento de evaluación con IA
y un informe PDF. No incluye preparar ni presentar una solicitud de asilo».
Nota interna: ejemplo de V2/S12, no selección predeterminada ni producto recomendado para todos.
La identidad de marca de LLC es una variante pagada; la evaluación incluida en Reforzar no es una compra adicional.

**B8 · FAQ**

| Pregunta del visitante | Respuesta propuesta | Evidencia interna |
|---|---|---|
| ¿Puedo contratar por mi cuenta? | «Sí. Elige un servicio, abre su explicación en video y pulsa Crear mi contrato. En ContyGo revisas el paquete, completas los pasos que correspondan y firmas tu contrato». | U2/S2/S4/S5; no se promete aprobación del encaje. |
| ¿Tengo que completar un cuestionario o terminar el video? | «El botón para crear tu contrato está disponible en la pantalla del servicio. Puedes usar el video para revisar la explicación y continuar cuando lo decidas». | U2 y especificación de pantalla V; requiere validación del comportamiento implementado. |
| ¿Necesito escribir por WhatsApp? | «Puedes continuar a contratar desde la pantalla del servicio. La ayuda está disponible si tienes una duda al elegir». | U2 y destinos V2/V3; no SLA inventado. |
| ¿Qué incluye mi servicio? | «Cada servicio tiene su propio alcance. Revisa sus entregables, límites y plan antes de continuar; las condiciones finales están en tu contrato». | §4/V2/S3. |
| ¿Puedo pagar en cuotas? | «Las opciones disponibles se muestran en ContyGo antes de firmar». | S4; no extender el calendario de Básico a los doce. |
| ¿El precio incluye tasas del gobierno? | «Las tasas gubernamentales se pagan aparte. Revisa el alcance y las condiciones de tu contrato». | S3 (:139–140); prevalece contrato específico. |
| ¿ContyGo me representa legalmente? | «ContyGo brinda apoyo administrativo y tecnológico para organizar y preparar tu trámite. No ofrece representación legal». | S1/S3. |
| ¿Visa Juvenil Básico incluye I-485? | «Básico cubre custodia e I-360. I-485 es otro servicio». | S6/S8. |
| ¿Evaluación y Reforzar Asilo son lo mismo? | «Evaluación de Asilo ofrece un informe PDF con IA. Reforzar Asilo trabaja sobre un I-589 ya presentado e incluye evaluación y preparación del respaldo documental». | S10–S12/V2. |
| ¿LLC incluye identidad de marca? | «Está disponible en el plan Constitución + Identidad de Marca. El plan Constitución tiene su propio alcance». | V2/§4.12; no inventar piezas. |

Preguntas sobre garantía, otros bonos y promoción se añadirán cuando existan respuestas aprobadas;
no publicar «no hay garantía/bonos/promoción», porque U1 confirma su existencia.
Tampoco usar una respuesta genérica sobre resultados para simular condiciones de garantía comercial.

**B9–B10 · Disponibilidad y acción**
«Consulta la disponibilidad y las condiciones vigentes en ContyGo».
«Tu próximo paso empieza con un servicio claro».
Con servicio elegido: «Ver servicio y video». Sin selección: «Elegir mi servicio».
«Verás la explicación de tu servicio y podrás continuar a crear tu contrato».
No añadir fecha límite, cuenta regresiva, supuesto cupo o precio promocional hasta documentar U1.

**Pantalla V · Video y contrato**
Título: nombre exacto del servicio. Apoyo: «Conoce qué se prepara y revisa tu paquete antes de continuar».
Junto al video: alcance y límites de §4; debajo o al lado, plan/precio y «Crear mi contrato».
Microcopy de salida: «Continuarás en ContyGo para revisar tu paquete y crear tu contrato».
Enlace de regreso: «Ver todos los servicios». No afirmar que ver el video crea una cuenta, reserva o evaluación.

**Microcopy funcional y SEO**
Búsqueda vacía: «No encontramos ese servicio. Prueba con otro nombre o vuelve al catálogo completo».
Acción: «Ver los 12 servicios». Detalle: «Cerrar detalle del servicio».
Ayuda secundaria: «¿No sabes cuál elegir? Te ayudamos» → V3, sin envío automático.
Título SEO: «ContyGo | Servicios migratorios, fiscales y LLC».
Descripción: «Conoce los servicios de ContyGo, revisa entregables, paquetes y precios, y crea
tu contrato en línea. Documentos, pagos y seguimiento desde tu cuenta».
Las nueve rutas anteriores nombran su oferta vigente; no conservar promesas antiguas o «descubre si calificas»
como mensaje principal de una ruta de contratación.

## 9. Brief visual y de UX

**PROPUESTO — concepto:** mostrar el trabajo que la persona compra. La relación visual entre
beneficio, documento y precio tiene prioridad sobre una sucesión de imágenes decorativas.
ContyGo encabeza; USA LatinoPrime aparece como organización detrás del producto.
No dedicar la hero únicamente a SIJS: migración, fiscal y empresa deben reconocerse desde el apoyo.

La composición de §7 es la especificación por bloque. Escritorio: anchura controlada, alternancia
de explicación y prueba y catálogo uniforme. Móvil: una decisión por tramo, sin obligar a deslizar
tarjetas para descubrir información crítica. El botón puede saltar al catálogo desde el inicio.
La pantalla V reutiliza nombre, alcance y precio, sin autoplay y con controles nativos. El CTA de
contrato permanece visible y disponible; reproducir o terminar el video nunca es una condición.
Los videos reutilizados de una línea deben identificarse como contexto general cuando no explican
el paquete exacto, sin atribuirles promesas específicas que no contienen. Material aún sin localizar
se registra como recurso pendiente; no se inventa ni se presenta otro servicio como equivalente.
La versión S25 usa un selector, entregables/documentos y precio sincronizados; los planes múltiples
se muestran en el bloque de inversión y la reiteración usa «Desde». Una campaña válida establece
el servicio sin reservarlo ni contratarlo por el visitante.

**Sistema visual actual, S25:** navy #061B3D, verde #25D366, apoyo #087F46 y superficie #F6F8F7.
Tokens implementados, no manual oficial ni contraste certificado.
Nunito en títulos y Nunito Sans en cuerpo conservan la identidad. **DOCUMENTADO en código:**
LANDING/app/layout.tsx utiliza next/font/local con archivos de LANDING/public/fonts/;
no depende de Google Fonts en tiempo de renderizado. Titulares con jerarquía 1/2/3, cuerpo
de unos 60–70 caracteres por línea, espacios que agrupen beneficio/pieza/precio y mayor densidad
solo en comparaciones. Los valores de espaciado concretos se ajustan en implementación.

**Prueba visual por tipo de servicio:** representar formularios y paquetes con sus nombres reales
(I-360, EOIR-26, W-7); el informe PDF de evaluación lleva «Generado con IA»; LLC muestra constitución
en Florida. Usar composiciones genéricas claramente ilustrativas, sin formularios completados con
datos de personas, firmas ficticias, sellos oficiales decorativos o apariencia de aprobación.
Un documento diseñado para ilustración es un recurso nuevo propuesto, no una muestra de trabajo entregado.
No asignar número de páginas ni mostrar entregables adicionales que el paquete no respalde.

**Recursos DOCUMENTADOS:** LANDING/public/contygo/brand-mark.png, lex-still.webp y familias
juvenil/asilo/impuestos en LANDING/public/hero-services/ con posters y MP4 móvil/escritorio.
Las categorías usan cuatro imágenes de LANDING/public/services-images/ y la nueva
LANDING/public/contygo/empresa-editorial.webp (720×480, 42,224 bytes): escena ilustrativa generada
de emprendedores, incorporada para Empresa. No representa clientes ni personal reales.
Las piezas ilustrativas se basan en funciones S1/S2; el teléfono anterior ya no está montado.
U3 respalda 500+ clientes atendidos; testimonios, resultados y retratos de empleados acreditados: **NO ENCONTRADO**.
Los medios existentes fueron aportados por el usuario para esta landing y se reutilizan dentro
del encargo; no se vuelve a pedir esa autorización. Las fuentes tipográficas tienen documentación
local en public/fonts. Para recursos nuevos, registrar su procedencia y condiciones aplicables.

**Interacciones y accesibilidad:** selector etiquetado, foco visible y orden de lectura equivalente
al visual. Alcance opcional: details/summary junto al servicio, operable por teclado, sin modal.
Precio y acción legibles a 320 px y con texto ampliado; sin elementos flotantes encima del CTA.
Estados: cambio de selección con nombre, entregables, guía y precios actualizados;
poster ante fallo de video; enlaces normales que no muestran éxito de contrato en esta página.
Otros bonos y promoción aún sin condiciones permanecen fuera de interfaz; la guía S26 sí se descarga. No mostrar estados «próximamente»
ni deshabilitar contratación mientras se completa ese contenido.

**Rendimiento y movimiento:** texto/precio/CTA visibles desde el primer render; imágenes dimensionadas,
poster inmediato, carga diferida de videos secundarios y reproducción solo visible.
Mantener preferencia del usuario de películas sin botón de pausa y respetar movimiento reducido
con imagen estática; no emular loaders ni animar precios/contadores. No afirmar cumplimiento WCAG
sin auditoría. No ofrecer App Store/Google Play sin destinos acreditados.


### 9.1 Inspiración observada y aplicación concreta

Referencias inspeccionadas en navegador por el agente principal el 2026-09-10. Los originales
Heron y Plnty también se contrastaron por lectura web en esta revisión. Las fichas de Awwwards
se citan como referencias de nominaciones observadas; no se afirma que sean ganadores o premiados.

| Referencia | Observación útil | Aplicación propuesta a ContyGo |
|---|---|---|
| [Heron AI en Awwwards](https://www.awwwards.com/sites/heron-ai) · [Original](https://heronaiapp.com/) | Presenta el producto con herramientas identificables, visuales de interfaz y una secuencia de uso. | Jerarquía contundente y visual de documentos, contrato y seguimiento, con etiquetas que correspondan a funciones reales. |
| [Plnty App en Awwwards](https://www.awwwards.com/sites/plnty-app) · [Original](https://plnty.app/) | Organiza su propuesta alrededor de herramientas concretas y da acceso a su catálogo. | Hacer visible la amplitud de los 12 servicios y permitir explorarlos antes de continuar a la contratación. |
| [Catálogo real ContyGo](https://contygo.app/servicios) | Nombres, precios, planes y fichas públicas que llevan al flujo de cuenta/contrato. | Conservar identidad comercial y destinos exactos; la landing explica el alcance y ContyGo ejecuta la contratación. |

Decisión editorial derivada: **una acción primaria por bloque**, con el acceso de clientes como
acción secundaria. Se toman principios de jerarquía y demostración de producto; no se copian
marcas, métricas, testimonios, logos de clientes ni cifras de los sitios de referencia.
No emular loaders o secuencias de entrada que retrasen el catálogo. El contenido y CTA deben
estar disponibles sin esperar animaciones; Nunito/Nunito Sans y navy/verde siguen siendo ContyGo.
La preferencia previa del usuario mantiene las películas sin botón de pausa. Se respeta
`prefers-reduced-motion` con imagen estática y se evita reproducir fuera de vista o con pestaña oculta.

## 10. Recorrido de conversión y medición

**Recorrido solicitado y especificado (U2):** landing con oferta completa → elegir servicio →
pantalla local `/servicios/{slug}` con video específico, alcance/precio y CTA disponible →
«Crear mi contrato» → ficha pública `https://contygo.app/servicios/{slug}` → controles ContyGo → firma.
La ruta local de presentación y la ficha externa comparten slug, pero cumplen funciones diferentes.
La pantalla de video es una etapa del recorrido; ni verla completa ni contestar preguntas es requisito.
La ficha externa es el destino contractual deliberado: puede presentar registro, verificación de correo, selección de
paquete, evaluación y personas del caso según corresponda. La landing no duplica esos controles.
No se simula checkout, no se crean contratos de prueba y no se envían datos personales por URL.
WhatsApp no es paso obligatorio, CTA principal ni condición para ver el precio.
**DOCUMENTADO/PROPUESTO:** la landing no necesita campos de contacto ni preguntas obligatorias:
el destino realiza el intake (S4/S5). No se piden documentos sensibles en esta página.
Ayuda secundaria: enlace V3 con mensaje editorial “Hola, necesito ayuda para elegir un servicio en ContyGo”.
El clic abre WhatsApp y el visitante decide enviarlo; no hay confirmación ficticia ni plazo de respuesta.
Si un servicio deja de estar disponible, **PROPUESTO:** actualizar/ocultar su card y conservar acceso
al catálogo público y ayuda. Errores de cuenta, correo, encaje o pago se resuelven dentro de ContyGo;
la landing no presenta un resultado de éxito propio. Responsable de atención concreto y SLA: **NO ENCONTRADO**.
Soporte es el rol de cara al cliente (S1); nombres de empleados internos no se convierten en contacto comercial.

| ID local estable | Slug anterior | Pantalla de video local especificada | Slug final en ContyGo |
|---|---|---|---|
| visa-juvenil | visa-juvenil | /servicios/visa-juvenil-basico | visa-juvenil-basico |
| i-360 | peticion-i-360 | /servicios/i-360 | i-360 |
| i-485 | ajuste-de-estatus | /servicios/i-485 | i-485 |
| asilo | asilo-politico | /servicios/asilo-politico | asilo-politico |
| reforzar-asilo | reforzar-asilo | /servicios/reforzar-asilo | reforzar-asilo |
| apelacion | apelacion-bia | /servicios/apelacion | apelacion |
| cambio-corte | cambio-de-corte | /servicios/cambio-de-corte | cambio-de-corte |
| itin | itin | /servicios/itin-number | itin-number |
| impuestos | declaracion-de-impuestos | /servicios/taxes | taxes |
| evaluacion-asilo | Sin ruta anterior | /servicios/evaluacion-asilo | evaluacion-asilo |
| reapertura | Sin ruta anterior | /servicios/reapertura-in-absentia | reapertura-in-absentia |
| llc | Sin ruta anterior | /servicios/llc-florida | llc-florida |

**Verificación estática realizada:** los nueve `legacySlug` resuelven mediante
`getServiceBySlug()` al mismo ID de `CONTYGO_SERVICES`, sin servicios anteriores sin correspondencia.
La ruta heredada `/{legacySlug}` está implementada en `app/[slug]/page.tsx`;
su `dynamicParams = false` limita las páginas a `generateStaticParams()`.
La nueva familia `/servicios/{slug}` y su configuración `lib/contygo-presentation.ts` ya están
incorporadas (S22). La primera build ampliada genera 45 rutas y las pruebas pasan 13/13 (S23).
La tabla define las doce entradas de U2; la revisión móvil final está en curso y no se presume completada.
**Inventario de video DOCUMENTADO por auditoría local:** archivos encontrados, con pista de video
1280×720 y audio; la duración verifica un archivo, no la exactitud de su narración comercial.

| Servicio o servicios | Archivo público local | Duración aproximada / condición |
|---|---|---|
| Visa Juvenil Básico; I-360 | `LANDING/public/videos/visa-juvenil.mp4` | 40 s; compartido, no verificada narración específica de I-360. |
| Ajuste de estatus I-485 (SIJ) | `LANDING/public/videos/ajuste-estatus.mp4` | 37 s; revisar copy/precio narrado contra V2. |
| Asilo Político; Reforzar Asilo | `LANDING/public/videos/asilo-politico.mp4` | 38 s; compartido, no verificada narración específica de Reforzar. |
| Apelación (BIA) | `LANDING/public/videos/apelacion-bia.mp4` | 39 s; revisar narración contra alcance actual S13/V2. |
| Cambio de Corte | `LANDING/public/videos/cambio-corte.mp4` | 43 s; separar EOIR-33 y moción, S14. |
| Número ITIN | `LANDING/public/videos/itin.mp4` | 53 s; revisar narración contra V2. |
| Declaración de Impuestos | `LANDING/public/videos/taxes.mp4` | 65 s; no ampliar años/estados por inferencia. |
| Evaluación de Asilo; Reapertura; LLC | **NO ENCONTRADO** | No hay video público específico localizado en landing/ZIP; recurso pendiente. |

Origen de la correspondencia: `LANDING/lib/services.ts:33` y archivos MP4; auditoría reportada
por el agente de verificación. S22 incorpora esta selección a las nuevas pantallas. Las narraciones
no se han revisado íntegramente. I-360 y Reforzar ya se etiquetan como introducción compartida;
esa etiqueta no demuestra que el video explique exactamente su paquete.
Las escenas de `public/hero-services/` son decorativas y no cubren los tres videos faltantes.
Los videos privados de fases del ZIP usan enlaces firmados temporales; no son recursos públicos
estables ni se reutilizan en la landing. Las tres pantallas sin video muestran un aviso honesto,
alcance, precio y acceso inmediato al contrato. Ese fallback ya está implementado y permite continuar,
pero no cumple por sí solo el requisito de video específico de U2; la brecha de contenido permanece.

**Especificación propuesta de medición, todavía no instrumentada en la homepage nueva:**
`service_filter_select`, `service_scope_toggle`, `service_video_page_view`, `service_video_start`,
`service_video_complete` y `contract_cta_click`, con ID de servicio, categoría,
ubicación del CTA y fecha del catálogo. No recoger nombre, correo ni respuestas migratorias.
Medir elección del servicio, llegada a video, reproducción opcional y clic saliente desde esa pantalla.
La elección no equivale a ver el video; finalizarlo no equivale a contratar y no desbloquea el CTA.
Un clic a ContyGo **no es** contrato creado, firmado ni pago. Esas conversiones solo pueden medirse
con eventos autorizados de la aplicación destino y un diseño de atribución entre dominios.
No registrar `contract_signed` desde la landing ni deducirlo por abrir una pestaña.
La lectura de `components/contygo/ContygoStory.tsx` y `ServiceOffer.tsx` no encontró llamadas
de seguimiento para estos eventos. ?servicio= personaliza contexto, no acredita atribución a contrato.
El layout conserva Meta Pixel y `PixelRouteTracker` preexistentes; sus PageView
y los eventos del recorrido anterior no equivalen a instrumentación del catálogo nuevo.

## 11. Pendientes priorizados y preguntas

Las prioridades siguientes son **PROPUESTAS**. Una omisión comercial segura permite publicar
el contenido sustentado; no se convierte un dato ausente en requisito de autorización adicional.

| Prioridad / estado | Pendiente o discrepancia | Impacto y resolución concreta | Persona o fuente que puede confirmar |
|---|---|---|---|
| P0 · CONFLICTO, resuelto por selección/omisión | Seed de 13 servicios/precio cero, paquetes demo, precios antiguos y contacto anterior difieren de V1–V3. | Usar las 12 ofertas, 14 planes y contacto públicos; no presentar ceros, Premium ni tres fases demo como oferta. Actualizar fecha y datos juntos al cambiar. | Catálogo y fichas públicas actuales; responsable del catálogo ContyGo. |
| P0 · CONFLICTO, resuelto por omisión | Reapertura afirma suspensión automática; Cambio de Corte simplifica EOIR-33/moción. | Omitir promesa jurídica contextual; separar documentos según S14/S15. No condicionar la landing a corregir la app. | Responsable de contenido del servicio; S14/S15 y contrato vigente. |
| P0 · DOCUMENTADO/NO ENCONTRADO | Garantía, promoción y otros bonos U1/U3 esperan términos; guía S26 disponible. | Reembolso y alza en siete días son propuestas sin implementar. Confirmar cobertura, precio/fechas y aplicabilidad; conciliar cláusula 11 S3 antes de prometer devolución. | Usuario/responsable comercial y contractual; condiciones que enviará. |
| P0 · DOCUMENTADO, tres medios pendientes | Doce pantallas y CTAs U2 incorporados; faltan videos de Evaluación, Reapertura y LLC. | S25 registra build de 45 páginas, 13/13 pruebas y QA actual. Mantener aviso de video faltante y resolver los tres recursos sin inventarlos. | Responsable de contenidos; S22/S25, archivos autorizados o fuente pública. |
| P1 · NO ENCONTRADO | SLA actual, revisiones, soporte cuantificado, requisitos completos fiscales/LLC y detalle de identidad de marca. | Mantener C1 y alcances documentados; no añadir plazos, renovaciones, estados/años fiscales ni piezas de marca sin respaldo. | Responsable de cada servicio; matriz comercial y contrato vigentes. |
| P1 · DOCUMENTADO con validación pendiente | Deuda de edición PDF I-485 en S8; condiciones contractuales S3. | Remitir a la app; comprobar edición aplicable antes de emitir documentos. No prometer reembolso ni modificar condiciones desde la landing. | Equipo de producto ContyGo y responsable contractual. |
| P1 · PROPUESTO | Textos nuevos de presentación. | Revisar el copy en la versión local antes de una futura publicación. Los videos existentes fueron aportados por el usuario para esta landing; se reutilizan dentro de ese encargo. | Responsable comercial; versión local implementada. |
| P2 · PROPUESTO, no instrumentado | Eventos nuevos y atribución a firma/pago. | Implementar eventos de §10 por separado; integrar resultados solo con señal autorizada del destino. No etiquetar clic como contrato. | Analítica y producto ContyGo; contratos de eventos entre dominios. |
| P2 · NO ENCONTRADO | Historia corporativa, misión/visión oficiales, credenciales y casos publicables. | Omitir del copy factual; incorporar únicamente evidencia aprobada. Conservar archivos y contenido identificado si cambian líneas del ZIP. | Responsable de empresa; documentos corporativos y material autorizado. |

**Lagunas comerciales para la siguiente actualización (máximo seis; no repetir lo confirmado):**
1. Condiciones que el usuario enviará: ¿qué cubre la garantía, cómo se solicita, qué remedio ofrece y qué exclusiones/plazo tiene? Conciliar con S3 si incluye devoluciones.
2. Además de las doce guías gratuitas S26, ¿qué contienen los otros bonos, a qué plan aplican y cuáles son sus condiciones de entrega?
3. ¿En qué consiste la promoción, quién puede usarla, cuál es su vigencia y existe algún límite real verificable?
4. ¿Qué tiempos orientativos, revisiones y soporte actuales pueden publicarse para cada servicio, con qué condiciones?
5. ¿Cuáles son los requisitos y límites vigentes de impuestos, ITIN y LLC, y qué piezas/cantidad incluye Identidad de Marca?
6. ¿Qué rol mantiene y aprueba las condiciones comerciales y qué evidencia autoriza su publicación? La identidad visual, los doce servicios y el autocontrato ya están confirmados.

## 12. Handoff de implementación

Archivo de datos: `LANDING/lib/contygo-catalog.ts`, sin credenciales ni dependencias del backend ContyGo.
Exporta `ContygoCategory`, `ContygoService`, `CONTYGO_SERVICES` y `CONTYGO_CATALOG_VERIFIED_AT`.
Conserva los nueve IDs anteriores y sus `legacySlug`; agrega Evaluación, Reapertura y LLC.
El dato `slug` siempre pertenece a ContyGo; `legacySlug` solo identifica la ruta local anterior.
Los importes se expresan en dólares, no en centavos. `price` es el mínimo de los planes publicados.
Las categorías son de presentación. El contrato del tipo permite pintar detalle sin buscar otro catálogo.

**Versión actual, S25:** `LANDING/app/page.tsx` monta `ContygoStory`, con `ServiceOffer` para
selector, entregables, documentos orientativos, pasos y precio. La secuencia completa está en §7.
`ContygoExperience`, `ServiceExplorer` y `ContygoLanding` ya no están montados.
Nunito/Nunito Sans se cargan mediante `next/font/local`; archivos y licencias en `public/fonts`.
Los 12 nombres, alcances y 14 planes provienen del catálogo; `contygo-deliverables.ts` documenta
las fuentes de los ejemplos. Cada guía real se descarga de `/contygo/guias/{slug}.pdf` sin registro.
?servicio= acepta ID/slug conocido; el dock dirige a `#servicios` hasta confirmar una elección.
El recorrido vigente es oferta/catálogo → presentación local de video → ficha de ContyGo para contrato.
No se requieren cuestionario, WhatsApp ni reproducción completa. U3 respalda 500+ clientes atendidos.
Garantía de reembolso y alza en siete días esperan condiciones; no están implementadas. La cláusula 11 sigue pendiente.
`ServicePresentation` ofrece reproducción iniciada por el usuario, controles nativos durante la
reproducción, precio y CTA inmediatos. Incluidos/exclusiones se consultan en desplegables.
Terminar el video actualiza su estado visual sin redirigir ni exigir otra acción.
Siete MP4 cubren nueve servicios; I-360 y Reforzar llevan etiqueta de introducción compartida.
Evaluación, Reapertura y LLC muestran un aviso de ausencia de video y conservan la contratación.
`LANDING/lib/contygo.ts` resuelve cada ID al destino público exacto del catálogo.
El alcance se abre en `details/summary` junto al servicio. El helper promete video solo si existe.
Los encabezados usan `data-story-reveal`; la navegación denomina «Cómo empieza» al bloque de pasos.
La ayuda secundaria utiliza el contacto público comprobado en V3; no es una condición para contratar.
`LANDING/components/DirectContractEntry.tsx` ofrecía contratación desde las nueve rutas anteriores;
la implementación de U2 debe conservar su correspondencia y evitar un requisito de preguntas.
Evaluación, Reapertura y LLC ya tienen pantalla local bajo el contrato de rutas de §10; falta su video específico.
En `LANDING/components/ServiceFunnel.tsx:83`, terminar el video solo registra `VideoCompleted`:
no avanza a preguntas ni retira la contratación; el visitante decide continuar. Las slides inactivas
usan `inert` (`:140`). `LANDING/components/agent/AgentWidget.tsx:36` limita el widget anterior
a `/califica`; la homepage conserva su ayuda contextual. Estos ajustes no cambian el backend de chat/CRM.
La presentación sigue navy/verde con Nunito/Nunito Sans. No hay checkout simulado ni captura nueva de leads.
Los eventos específicos de filtro, detalle y contratación siguen **propuestos, no instrumentados**.
La implementación visual y el cableado viven en la landing, no en el proyecto ZIP.
No se modifica ni despliega la aplicación ContyGo como parte de estos archivos de contenido.

**Criterios de aceptación actuales:** secuencia §7 sin inventar pendientes U1/U3; selector con
12 servicios, grupos 3/3/3/2/1 y datos de §4. Selección/campaña sincronizan entregables, guía y precio;
parámetros desconocidos mantienen la experiencia general y siempre se puede cambiar de servicio.
Cada CTA de selección abre su pantalla local de video y su CTA final lleva al slug exacto en ContyGo.
Las doce pantallas deben mostrar video específico o contexto reutilizado explícitamente identificado,
alcance/precio correctos, controles sin autoplay y contratación disponible desde el inicio.
Resolver los tres recursos pendientes sin inventar contenido. No exigir reproducción completa, quiz o WhatsApp.
Las nueve rutas anteriores conservan correspondencia; desplegables, selector, menú y foco funcionan por teclado;
móvil no desborda; 500+ significa clientes atendidos, sin atribuir aprobaciones ni representación.
Garantía, promoción y otros bonos esperan condiciones consistentes con contrato; las doce guías S26 ya existen.
Verificar typecheck y lint de la landing, y realizar navegación de prueba en escritorio y móvil.
La validación efectivamente realizada se registra al final de esta sección.

| Elemento / recursos y conexiones | Estado final del handoff | Evidencia o siguiente paso |
|---|---|---|
| Catálogo TS, 12 fichas, 14 planes, 9 rutas anteriores y copy sustentado | **listo para implementar**; incorporado al código | Comprobación estática: IDs/slugs únicos, rutas 9/9, grupos 3/3/3/2/1, mínimos coherentes y cero diagnósticos de sintaxis TypeScript. |
| ContygoStory + ServiceOffer, selector, entregables, precio y campañas | **implementado y validado en las vistas indicadas** | S25 y registro actual inferior; Experience/Explorer desmontados. |
| Guías de preparación PDF | **12 archivos reales disponibles** | S26; nombre del servicio, entregables, ejemplos orientativos y próximos pasos. Descarga gratuita sin registro, sin valor monetario inventado. |
| Pantallas de video y elección U2 | **implementado; faltan tres medios específicos** | Doce rutas de §10 y configuración S22 incorporadas. Build/tests y recorrido Visa Juvenil probados; tres avisos honestos de video faltante. |
| Destinos finales “Crear mi contrato” y ayuda secundaria | **implementado** desde la pantalla de video | Doce fichas externas exactas de §4/§10; ayuda V3. La firma/pagos corresponden a ContyGo, sin nuevo checkout local. |
| Nunito/Nunito Sans, marca/Lex, posters y películas existentes (§9) | **incorporado y revisado visualmente** | Fuentes locales verificadas y licenciadas; medios existentes del encargo. Preferencia de movimiento reducido implementada, sin medición formal de rendimiento. |
| Plazos, revisiones, requisitos incompletos y prueba corporativa adicional | **requiere información** | C1 y §11; omitir promesas hasta obtener fuente vigente. No bloquea el texto limitado a evidencia disponible. |
| Garantía, promoción y otros bonos U1/U3 | **requiere información** sobre condiciones | Reembolso y alza a siete días no implementados; cláusula 11 por conciliar. La guía S26 ya está disponible. |
| Medición específica nueva y atribución entre dominios | **requiere validación** de diseño e implementación | Especificación §10 **PROPUESTA**, no instrumentada; ninguna conversión de contrato/pago se presume por un clic. |

No se dejan marcadores `[PENDIENTE: dato]` dentro del copy destinado al visitante. Los vacíos y
las recomendaciones permanecen en las tablas internas; la aprobación empresarial no se presume.

**Validación actual ContygoStory + ServiceOffer — 2026-09-10 (DOCUMENTADO, S25):**

- El agente principal reporta build final correcta: **45 páginas**, lint y tipos correctos; **13/13 pruebas**.
- QA a **390 y 320 px móvil y 1280 px escritorio**, sin desbordamiento en las vistas comprobadas; menú con cierre Escape, FAQ y selección de LLC/I-360 actualizando guía y precios.
- Recorrido actual Visa Juvenil → presentación con video reproduciéndose → `href` contractual correcto. Se observó inicio y cierre de la introducción visual; no se midieron FPS.
- En producción local, `?servicio=cambio-de-corte` selecciona `cambio-corte`, con CTA del hero y PDF correctos, sin desbordamiento a 390 px. Servidor local activo en puerto 3000 al cerrar el reporte.
- La auditoría estática confirma doce destinos y doce PDFs; correcciones incorporadas: texto condicionado a video disponible, dock al selector hasta elegir, atributos de títulos unificados y enlace «Cómo empieza».
- No se acredita publicación, firma, pago ni funcionamiento del backend externo. Continúan pendientes tres videos y las condiciones comerciales U1/U3.

**Validación previa a la reconstrucción ContygoExperience — 2026-09-10 (DOCUMENTADO, S23):**

Este registro corresponde a ContygoLanding y su integración U2. Se conserva como historial;
no se atribuyen sus pruebas del selector/modal/resumen a los componentes actuales S25.

- El agente principal reporta primera build correcta con **45 rutas** y **13/13 tests** correctos.
- En navegador probó selector de los 12 servicios y resumen sincronizado; comparar otra oferta conserva la elección.
- Probó homepage → Visa Juvenil Básico → pantalla local con video reproduciéndose → ficha pública de ContyGo, con plan de **$2,500**.
- La lectura de S22 confirma CTA inmediato, ausencia de autoplay/redirección al terminar, incluidos/exclusiones desplegables y etiquetas de introducción compartida.
- Build final correcta con TypeScript/lint y 45 páginas generadas; **13/13 pruebas**. Revisión visual en escritorio, presentación de Visa Juvenil a 390 px, landing con selector/entregables a 320 px y presentación de LLC a 320 px: sin desbordamiento horizontal en las vistas comprobadas. Las medidas interiores excluyen la barra del navegador.
- La presentación de LLC muestra honestamente el video pendiente y mantiene ambos precios/destino. Desplegable de condiciones probado: Florida e identidad de marca aparecen al abrirlo. Los dos selectores conservaron LLC al consultar otra oferta.
- No se acredita firma, pago, publicación ni reproducción de los doce videos: tres recursos específicos siguen faltando.

**Validación de la versión anterior — 2026-09-10 (DOCUMENTADO):**

Registro conservado de la integración previa a la estrategia ampliada y a U2. Estos resultados
deben repetirse/adaptarse para el nuevo recorrido y no acreditan las doce pantallas de video.

- `npm run build`: correcto, con lint y comprobación de tipos; 33 páginas generadas.
- `npm test`: 10/10 correctos, incluyendo 12 destinos, nueve entradas de contratación y continuidad de contacto existente.
- Navegador local: revisado en escritorio (1280 px) y móvil (390 y 320 px), sin desbordamiento horizontal del documento en las vistas comprobadas.
- Probados filtros Empresa e Impuestos; búsqueda `apelacion` devuelve BIA y Re-apertura; estado sin resultados y recuperación a los 12 servicios.
- Probados detalles de LLC e Impuestos, planes $100/$150, cierre con Escape y retorno del foco al botón original.
- Probada salida del CTA de LLC a su ficha pública real; aparecen sus planes de $500 y $1,000.
- Probados menú móvil, FAQ expandible y selección del paso de contrato en el teléfono ilustrativo.
- Probado acceso a preguntas sin esperar video en Visa Juvenil; CTA inicial visible también en I-485. Las diapositivas inactivas llevan el atributo nativo `inert`.
- No se iniciaron sesiones, crearon cuentas/contratos, firmaron documentos ni ejecutaron pagos. No se publicó la landing ni se alteró el proyecto fuente ContyGo.

En esa validación se usó `http://127.0.0.1:3000/` con la compilación de producción.
El código de la landing y este documento se actualizaron en el workspace local. La aplicación ContyGo permanece como destino externo de contratación.
