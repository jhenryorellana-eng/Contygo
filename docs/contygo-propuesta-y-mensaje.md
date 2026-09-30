# ContyGo: propuesta real y criterio para la landing

[Volver a la base comercial y audiovisual](contygo-base-comercial.md).

Actualización: 14 de septiembre de 2026. Revisión estática de la versión entregada por el usuario en `C:/Users/PepitoLee/Downloads/vvvv/x-legal-main/x-legal-main/`, contrastada con las decisiones de esta conversación. No constituye una prueba de la configuración ni de transacciones en producción.

## Qué se vende

Servicios de asistencia, organización y preparación de trámites para la comunidad latina en Estados Unidos. La aplicación permite contratar, aportar información y documentos, conocer el siguiente paso y seguir el caso. La tecnología ayuda a extraer datos, preparar formularios y producir documentos; la operación también tiene revisión humana y soporte. Evitar presentar el servicio como una compra de software o como un expediente íntegramente automático sin revisión.

La persona conduce su propio trámite con acompañamiento. La versión revisada incorpora el posicionamiento de consultor de inmigración registrado y distingue esa actividad de la representación jurídica. El alcance depende del servicio y paquete. No convertir una función de revisión externa con abogado en una prestación universal.

El catálogo se administra en la base de datos. La landing contempla familias/SIJS, asilo, actuaciones ante corte, servicios fiscales y creación de LLC. La existencia de un servicio en una semilla histórica o en la visión de producto no demuestra que hoy esté activo; no añadir ofertas o cambiar precios sin contrastar la configuración vigente.

## Recorrido verificado en el código

1. Consultar el servicio y sus paquetes.
2. Crear cuenta o entrar y resolver la verificación requerida.
3. Recorrer selección de paquete, evaluación y partes cuando el servicio los requiere. El plan de pago y la confirmación siempre aparecen.
4. Crear el contrato, leer/aceptar los documentos correspondientes y firmar digitalmente. La versión actual contempla divulgación y autorización de tutor según el caso.
5. Confirmar el pago inicial para activar el trabajo del caso.
6. Aportar documentos, responder formularios y seguir los hitos aplicables a ese servicio. La operación revisa, pide correcciones, prepara y organiza los entregables correspondientes.

El flujo es adaptable al servicio. No prometer un cuestionario, cita, revisión de abogado o entrega específica idéntica para todos.

## Qué debe entender el visitante

- Qué ayuda recibe: preparación y organización de los documentos/formularios de su servicio.
- Qué aporta él: información, documentos, respuestas y las acciones que le correspondan.
- Cómo participa: desde el celular, con siguientes pasos y seguimiento visibles.
- Por qué confiar: alcance, precio y pagos explicados; acompañamiento; prueba de confianza real.
- Qué hacer ahora: elegir el servicio y entender su oferta antes de contratar.

La tecnología se explica por su utilidad: ordenar información, asistir la preparación y mostrar avances. No atribuirle un porcentaje de precisión, reducción de plazos o superioridad frente a abogados sin evidencia.

## Estructura comercial acordada

Promesa → beneficios → elección del servicio con vídeo y entregables concretos → precio y opciones de pago → respaldo/garantía con condiciones reales → reiteración de la oferta → preguntas → urgencia únicamente verificable → contratación en ContyGo. La explicación en vídeo aparece al elegir el servicio, introduce su oferta y mantiene accesible la continuación al contrato; no se reserva únicamente para el final. Desarrollo en [la estructura de landing](contygo-estructura-landing.md).

La selección del servicio personaliza el alcance, entregables, precio y vídeo. No obligar al cliente a revisar todas las ofertas. Se mantiene la petición posterior del usuario de no presentar regalos/bonos inventados. La firma es el objetivo comercial de la landing; después viene el pago inicial requerido por la aplicación.

500+ corresponde a clientes atendidos, según confirmación del usuario, no a expedientes aprobados. La promesa de reembolso por un incumplimiento de preparación sigue necesitando condiciones precisas y concordancia con el contrato aplicable. La plantilla legacy leída contiene una cláusula de no devoluciones; la versión nueva admite plantillas publicadas en BD, así que ese archivo no demuestra por sí solo la cláusula vigente. No publicar una fecha de aumento móvil que siempre reinicia: se requiere una condición real y comprobable.

## Evaluación del hero actual

«Tu próximo paso migratorio empieza en tu celular» comunica el canal y el inicio. El párrafo se concentra en elegir, firmar y usar la app. Falta hacer visible el servicio que se compra: asistencia en la preparación, organización documental y acompañamiento. Los tres vídeos muestran acciones del cliente; los rótulos y el texto deben explicar también lo que ContyGo aporta.

## Propuesta de copy, pendiente de elección editorial

Antetítulo: Tecnología y acompañamiento, desde tu celular.

Titular: Tu trámite migratorio, preparado paso a paso.

Texto: Con la información que tú aportas, ContyGo te acompaña en la preparación de tus documentos y formularios. Contrata en línea y sigue el avance desde tu app.

CTA: Elegir mi servicio.

Prueba de confianza: Más de 500 clientes atendidos. Atención en español.

La propuesta no se ha aplicado al componente: el usuario pidió una valoración y confirmar la comprensión del negocio.

## Fuentes primarias de esta revisión

Rutas relativas al repositorio entregado:

- `docs/sot/docs/00-vision/00-producto.md`: propuesta de producto y actualización del posicionamiento del 11 de septiembre.
- `src/frontend/i18n/messages/es.json`, `cliente.welcome`: preparación con datos aportados por el cliente y acompañamiento.
- `src/app/(cliente)/welcome/page.tsx`: contenido y perfil de registro configurables.
- `src/shared/contracting-flow.ts`: pasos adaptativos, precio y opciones de cuotas.
- `src/app/(cliente)/servicios/[slug]/crear-caso/page.tsx`: montaje del recorrido real de autoservicio.
- `src/app/(cliente)/servicios/[slug]/contract-gate.ts`: cuenta/contacto verificado y caso existente.
- `src/backend/modules/cases/service.ts`, `contractServiceAsClient` y activación por pago inicial: validación del servidor.
- `src/shared/constants/onboarding-milestones.ts`: firma y pago inicial.
- `src/backend/modules/ai-engine/service.ts`: extracción y generación documental.
- `src/backend/modules/client-deliverables/service.ts`: publicación de entregables del expediente/evaluación.
- `src/frontend/features/cliente/camino/camino-screen.tsx`: avance según requisitos reales de cada fase.
- `src/backend/modules/contracts/contract-boilerplate.ts`: naturaleza del servicio y cláusula legacy de devoluciones.
- `docs/historial/2026-09-11-registro-utah-pr3a-firma-y-mi-contrato.md`: firma, divulgación y copia del contrato.
