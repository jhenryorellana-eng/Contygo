# Evidencia — CRM interno de USA Latino Prime

Fecha: 3 de septiembre de 2026. Búsqueda propia en la web (no Gemini Notebook).
Nivel de las fuentes: **B** = informe sectorial o prensa técnica · **C** = producto o
competidor (útil, no neutral). No hay fuentes **A** (norma o paper) para este tema; donde
la decisión se apoya en criterio propio se marca como **APUESTA**.

## Decisiones y en qué se apoyan

### 1. La velocidad de respuesta manda → el CRM empuja "sin contactar" arriba de todo
- El estudio de InsideSales/MIT (2007) sobre gestión de respuesta a leads encontró que
  contactar en 5 minutos frente a 30 multiplica por 21 la probabilidad de calificar al
  lead, y la de simplemente contactarlo cae 100 veces. Se cita a menudo como "Harvard";
  en realidad la auditoría de HBR (2011, 2.241 empresas) es otra: 42 horas de respuesta
  media, y 7 veces más probabilidad de calificar si se responde en la primera hora. **(B)**
  Fuentes: [AInora, recopilación de estudios](https://ainora.lt/blog/lead-response-time-statistics-every-study-2026) ·
  [Workato, estudio de 114 empresas](https://www.workato.com/the-connector/lead-response-time-study/) ·
  [LeanData](https://www.leandata.com/blog/the-modern-rules-of-lead-response-time/)
- **Cómo se aplica:** la pestaña "Hoy" abre con los contactos nuevos ordenados por tiempo
  de espera; cada ficha guarda `first_contact_at` para medir minutos hasta el primer
  contacto por asesora; el reparto de leads ya es inmediato (turno en el clic).

### 2. Los CRM fracasan por la carga de tecleo → captura automática y un toque por acción
- Entre el 30 % y el 70 % de las implantaciones de CRM fracasan según cómo se defina;
  la razón más citada al abandonar es la carga de entrada manual: 32 % de los
  vendedores pasan más de una hora al día tecleando en el CRM y 73 % de los responsables
  dicen que crear un registro tarda demasiado. **(B)**
  Fuentes: [Wave Connect, estadísticas CRM](https://wavecnct.com/blogs/crm-statistics) ·
  [Clari](https://www.clari.com/blog/why-your-sales-teams-crm-adoption-is-low/) ·
  [Affinity](https://www.affinity.co/blog/crm-adoption-rates)
- **Cómo se aplica:** el contacto se crea solo desde el cuestionario de la web (nombre y
  WhatsApp al final del embudo), con las respuestas y el servicio ya dentro; el clic a
  WhatsApp se anota solo en el historial; cambiar de etapa es un toque (o arrastrar);
  el diseño es móvil primero porque las asesoras atienden desde el celular.

### 3. Etapas del sector: por estado del caso, no un embudo de ventas genérico
- Los CRM legales y de inmigración (Lawmatics, Clio Grow, Law Ruler, Docketwise)
  organizan la captación como un pipeline visual por estado (consulta agendada,
  documentos pendientes, "todavía no"), convierten el lead en cliente sin volver a
  cargar datos y reportan tasas de conversión y origen del lead. Docketwise, el más
  usado en inmigración, no incluye CRM: se combina con Clio Grow o Lawmatics. **(C)**
  Fuentes: [Docketwise, CRM para despachos](https://www.docketwise.com/blog/crm-for-law-firms/) ·
  [Lawmatics, inmigración](https://www.lawmatics.com/practice-areas/immigration-law-software/) ·
  [Law Ruler](https://www.lawruler.com/solutions/immigration-law-software/) ·
  [Hughey LLC, Lawmatics vs Clio Grow](https://hugheyllc.com/blog/lawmatics-vs-clio-grow/) ·
  [Big Mode, Clio vs Docketwise](https://www.bigmodeconsulting.com/compare/clio-vs-docketwise)
- **Cómo se aplica:** etapas fijas y pocas, en el lenguaje de la empresa:
  Nuevo → Contactado → Calificado → Pagado → En trámite → Cerrado, más Perdido con
  motivo. Tablero por etapa, ficha única por persona (no se duplica por teléfono) y
  conversión por asesora, servicio y origen.

### 4. Seguimiento con fecha, sin automatizar mensajes (APUESTA)
- Las plataformas del sector venden secuencias automáticas de correo y SMS
  (Lawmatics más que Clio Grow). **(C)** Aquí el canal es WhatsApp personal de cada
  asesora, así que no automatizamos mensajes: el CRM programa el próximo paso con
  fecha, lo muestra en "Hoy" y abre el chat con un toque. **APUESTA:** para dos o tres
  asesoras, un recordatorio visible rinde más que una secuencia automática y evita
  el riesgo de sonar a robot en un tema sensible.

## Lo que queda fuera (y por qué)
- Integración con la WhatsApp Business Platform (entrada automática de chats): cara y
  con verificación ante Meta; se revisa cuando el equipo pase de tres asesoras.
- Documentos y formularios migratorios: eso es gestión de casos (tipo Docketwise), no CRM.
