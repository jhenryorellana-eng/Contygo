# ContyGo — Landing y contratación digital

**Para continuar el trabajo, empezar por [la base comercial, estructura de landing y vídeos](docs/contygo-base-comercial.md).** Recoge la propuesta real, el recorrido de contratación, las fichas de los 12 servicios, la dirección audiovisual y las decisiones pendientes. Actualizada el 14 de septiembre de 2026.

La dirección actual de prueba está en `/contygo-app`; `/` conserva la versión anterior para comparación. El objetivo comercial vigente es elegir un servicio, comprender su oferta mediante información y vídeo, y continuar a la contratación digital en ContyGo. Los documentos enlazados distinguen lo implementado de lo propuesto.

## Documentación técnica e histórica de UsaLatinoPrime

El contenido siguiente conserva el contexto original del repositorio. Las referencias a WhatsApp como destino principal o a otro posicionamiento no sustituyen la dirección comercial actual indicada arriba.

Sitio web (Next.js 14 · App Router · TypeScript) con:

- **Home de marca** (`/`): quiénes somos, grid de servicios, sección de la app móvil
  (App Store / Google Play) y opiniones de clientes.
- **Una URL por servicio** (`/visa-juvenil`, `/asilo-politico`, `/apelacion-bia`, …):
  cada anuncio de Meta aterriza directo en el embudo de su servicio
  —**Video → Preguntas → Resultado**— y termina en WhatsApp.
- **Reseñas de clientes**: `/califica` (formulario que se envía al cliente) →
  moderación en `/admin` → publicación automática en la home. Backend: Supabase.
- Optimizado para **móvil**, que es donde está la mayoría de los clientes.

> Implementada a partir del diseño exportado desde Claude Design (el bundle original
> se conserva en `project/` como referencia).

## URLs de servicios (para los ads)

| Servicio | URL canónica | Alias que redirigen |
| --- | --- | --- |
| Visa Juvenil · SIJS | `/visa-juvenil` | `/visajuvenil`, `/sijs` |
| Petición I-360 | `/peticion-i-360` | `/i-360`, `/i360` |
| I-485 · Ajuste de Estatus | `/ajuste-de-estatus` | `/i-485`, `/ajustedeestatus` |
| Asilo Político | `/asilo-politico` | `/asilo`, `/asilopolitico` |
| Reforzar Asilo | `/reforzar-asilo` | `/reforzamientodeasilo`, … |
| Apelación · BIA | `/apelacion-bia` | `/apelacion`, `/apelacionbia` |
| Cambio de Corte | `/cambio-de-corte` | `/cambio-corte` |
| ITIN Number | `/itin` | `/itin-number` |
| Declaración de Impuestos | `/declaracion-de-impuestos` | `/impuestos`, `/taxes` |

Los alias devuelven **308** a la canónica (configurados en `next.config.mjs`).
Los slugs viven en `lib/services.ts` (campo `slug`).

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- Tipografías con `next/font` (Source Sans 3 / Source Serif 4)
- Estilos en CSS con sistema de tokens por tema (tema **moderno** activo)
- Sin dependencias extra ni backend — listo para **Vercel**

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:3001 (package.json fija el puerto 3001)
npm test         # pruebas sin red (node --test tests/*.test.cjs)
```

Build de producción:

```bash
npm run build
npm start        # también en el puerto 3001
```

## Configuración (variables de entorno)

- **Dónde van.** En local, en `.env.local`, que está en `.gitignore`. En Vercel, en el scope **Production** del proyecto.
- **La referencia completa** es la tabla de [docs/contygo-contratacion-api.md](docs/contygo-contratacion-api.md#variables-de-entorno): qué hace cada variable y qué pasa si falta.
- **`.env.example`** va a listar todas las variables, vacías. Si todavía no está en tu copia, usa esa tabla.

| Grupo | Variables |
| --- | --- |
| **Obligatorias en producción** | `CONTYGO_API_KEY`, `LANDING_TOKEN_SECRET` (32 caracteres o más), `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL` |
| Opcionales | `CONTYGO_CHECKOUT_ENABLED` (`0` apaga la contratación), `CONTYGO_WEBHOOK_SECRET`, los `GEMINI_*` de modelo y voz, las de Meta (abajo), las del vídeo (abajo), `AGENT_PREVIEW` |
| **Nunca en producción** | `CONTYGO_API_BASE` y `CONTYGO_ALLOW_WRITES`: sirven para el simulador o el contygo de desarrollo, y abren las escrituras |
| Legado de UsaLatinoPrime: **no se configuran** en el proyecto de ContyGo | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ADMIN_SECRET`, `ADMIN_PASSWORD` |

**Cuándo escribe en contygo la contratación:**
- solo cuando Vercel marca el despliegue como producción (`VERCEL_ENV=production`), así que los Preview nunca crean leads, clientes ni contratos;
- en local, solo con `CONTYGO_API_BASE` apuntando a otro contygo o con `CONTYGO_ALLOW_WRITES=1`.

En Vercel, una variable nueva o cambiada solo se aplica al siguiente despliegue.

El número de WhatsApp **no** es una variable. Es la constante única `WHATSAPP_DISPLAY` / `WHATSAPP_DIGITS` de `lib/config.ts`: +1 (385) 392-7656, el bot de ventas.

Las del video:

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `NEXT_PUBLIC_VIDEO_URL` | Ruta del video demo dentro de `/public` | `/videos/demo.mp4` |
| `NEXT_PUBLIC_VIDEO_POSTER` | Imagen de portada del video (opcional) | _(vacío)_ |

## Cómo subir el video

1. Coloca tu archivo en `public/videos/` (p. ej. `public/videos/demo.mp4`).
2. Asegúrate de que `NEXT_PUBLIC_VIDEO_URL` apunte a él (`/videos/demo.mp4` por defecto).
3. Mientras no exista el archivo, el paso de video muestra un placeholder elegante.

> Para videos pesados, considera alojarlos en un CDN/servicio de video y usar la URL externa.

## Despliegue en Vercel

1. Sube el repositorio a GitHub/GitLab.
2. En Vercel: **Add New → Project**, importa el repo (framework detectado: Next.js).
3. Añade las variables de entorno en el scope **Production**: las obligatorias de la tabla de arriba. `CONTYGO_API_KEY` va **solo** en Production.
4. **Deploy**. Si cambias una variable después, vuelve a desplegar.
5. Antes de anunciarlo, sigue el humo de producción de [docs/contygo-contratacion-api.md](docs/contygo-contratacion-api.md). Para apagar la contratación en una emergencia, sigue su runbook.

## Estructura

```
app/
  layout.tsx           Tipografías, metadatos, tema (data-style="moderno")
  page.tsx             Home de marca (hero, servicios, app, opiniones, footer)
  [slug]/page.tsx      Página de cada servicio → <ServiceFunnel />
  califica/page.tsx    Formulario de reseña para clientes
  admin/page.tsx       Panel de moderación de reseñas (contraseña)
  api/reviews/         POST reseña (queda pendiente)
  api/admin/           Login + listar/aprobar/rechazar reseñas
  sitemap.ts           Sitemap con todas las URLs de servicio
  globals.css          Sistema de estilos + rediseño móvil
components/
  ServiceFunnel.tsx    Embudo por servicio (video → quiz → resultado)
  SiteHeader.tsx       Barra superior compartida
  home/                Secciones de la home (hero, servicios, app, reseñas, footer)
  reviews/ admin/      Formulario de reseña y panel admin
lib/                   Servicios (+slug), reseñas (Supabase REST), auth admin, meta
supabase/setup.sql     Esquema + RLS + funciones de moderación (ejecutar una vez)
public/                logo.png y carpeta videos/
project/               Bundle de diseño original (referencia, no se compila)
```

## Reseñas de clientes (Supabase)

> **Legado de UsaLatinoPrime.** En el proyecto de Vercel de ContyGo **no** se configuran
> `SUPABASE_*` ni `ADMIN_PASSWORD`. Sin ellas, las reseñas se ocultan y el CRM y el panel
> quedan sin configurar.

Flujo: el cliente entra a **`/califica`** (link que le envías por WhatsApp) → deja
estrellas + comentario → queda **pendiente** → en **`/admin`** la apruebas o rechazas →
las aprobadas aparecen en la home al instante (revalidación automática).

Para activarlo:

1. Crea un proyecto en Supabase.
2. Abre el **SQL Editor**, pega `supabase/setup.sql` **sustituyendo
   `REEMPLAZA_ESTE_SECRETO`** por una cadena aleatoria larga, y ejecútalo.
3. Configura las variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_ADMIN_SECRET` con esa misma cadena, `ADMIN_PASSWORD`).
4. Sin estas variables la web funciona igual: la sección de opiniones se oculta y
   `/califica` muestra "muy pronto". No hace falta la `service_role` key: la
   moderación usa funciones SQL protegidas por el secreto.

## Sección de la app móvil

> **Desactualizado (comprobado el 02-10-2026).** Ningún archivo del código lee hoy
> `NEXT_PUBLIC_APPSTORE_URL` ni `NEXT_PUBLIC_PLAYSTORE_URL`.
> `components/home/AppSection.tsx` enlaza directamente a ContyGo. No hace falta configurarlas.

La home incluía la sección **"Nuestra aplicación"**, con badges de App Store y
Google Play. Mientras `NEXT_PUBLIC_APPSTORE_URL` / `NEXT_PUBLIC_PLAYSTORE_URL`
estuvieran vacías, los badges se mostraban como **"Próximamente"**; al llenarlas,
se convertían en enlaces de descarga.

## Pagos (fase siguiente)

El sitio está pensado para incorporar el cobro de servicios: cada servicio ya tiene
página propia (donde vivirá su CTA de pago) y la base de Supabase podrá guardar
clientes/órdenes. Pendiente de definir proveedor (p. ej. Stripe) y precios.

## Meta Pixel + Conversions API (CAPI)

La landing está instrumentada para **Meta Ads** (campañas de Ventas / lead-gen) con
**Pixel** (navegador) + **Conversions API** (servidor) y **deduplicación por `event_id`**.

**Pixel ID:** `1489091455876816`.

### Eventos que se envían

| Paso del embudo | Evento Meta | Canal |
| --- | --- | --- |
| Carga de la página (y cada navegación interna) | `PageView` | Navegador |
| Aterrizar en la página de un servicio | `ViewContent` | Navegador |
| Terminar el video | `VideoCompleted` (custom) | Navegador |
| Ver un resultado que califica | `EvaluationCompleted` (custom) | Navegador |
| **Clic al CTA de WhatsApp (resultado)** | **`Lead`** ← conversión clave | **Navegador + CAPI (deduplicado)** |
| Clic al WhatsApp del header | `Contact` | Navegador |

> La campaña de Ventas debe **optimizar por `Lead`**. El resto son señales de embudo
> y audiencias de remarketing. Esta landing no recolecta email/teléfono, así que el
> matching server-side usa `fbp`/`fbc`/IP/User-Agent + un `external_id` de primera
> parte (cookie `ulp_vid`).

### Variables de entorno (Meta)

Copia `.env.example` → `.env.local` (local) o configúralas en Vercel:

| Variable | Ámbito | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` | Público | Pixel ID. Tiene fallback en el código. |
| `FACEBOOK_CONVERSION_API_TOKEN` | **Secreto** | Token de la CAPI. Sin él, el CAPI hace _no-op_ seguro. |
| `FACEBOOK_GRAPH_API_VERSION` | Servidor | Opcional (default `v23.0`). |
| `FACEBOOK_TEST_EVENT_CODE` | Servidor | Solo QA. **Vacío en producción.** |
| `NEXT_PUBLIC_META_REQUIRE_CONSENT` | Público | `"1"` activa el banner opt-in (GDPR). Vacío = disparo directo (EE.UU.). |

### Cómo obtener el token de la CAPI

1. **business.facebook.com** → **Events Manager** (Administrador de eventos).
2. Selecciona el dataset/Pixel `1489091455876816`.
3. **Settings / Configuración** → **Conversions API** → **Generate access token**.
4. Copia el token (`EAA...`) en `FACEBOOK_CONVERSION_API_TOKEN`. **Es secreto** — no lo subas a git.
5. Para QA: pestaña **Test Events** → copia el `test_event_code` en `FACEBOOK_TEST_EVENT_CODE`.

### Verificación

- **Meta Pixel Helper** (extensión Chrome): debe detectar el Pixel y `PageView` una vez,
  `ViewContent` al elegir servicio, y `Lead` con `eventID` al clicar WhatsApp.
- **Test Events** (Events Manager): con `FACEBOOK_TEST_EVENT_CODE`, el `Lead` debe llegar
  **Browser + Server** y **deduplicarse** a un solo evento.

### Archivos relevantes

- `components/meta/MetaPixel.tsx` — snippet base del Pixel (montado en `app/layout.tsx`).
- `components/meta/ConsentBanner.tsx` — banner opt-in (Variante B, inactivo por defecto).
- `lib/meta/events.ts` — nombres de evento y Pixel ID compartidos.
- `lib/meta/pixel-client.ts` — helpers de navegador (cookies, track, beacon a CAPI).
- `lib/meta/capi.ts` — helper server-side (hashing + envío a Graph API).
- `app/api/meta/route.ts` — endpoint `POST /api/meta` que reenvía el evento a la CAPI.

## Cambiar de tema

El diseño incluye tres temas. Cambia el atributo `data-style` del `<html>` en
`app/layout.tsx` por `"clasico"`, `"institucional"` o `"moderno"`.

## Prime — asesor virtual (chat + llamada de voz)

Widget "Pregúntale a Prime" en la home y en `/califica` (no aparece en los embudos
`/slug` para no competir con el botón "Continuar"). Móvil: pantalla completa;
escritorio: tarjeta flotante.

- **Escribir**: `POST /api/agent/chat` → Gemini `gemini-3.7-flash` con streaming.
  El modelo conoce los 9 servicios (se le inyectan desde `lib/services.ts`) y puede
  devolver marcadores `{{svc:slug}}` (tarjeta al servicio) y `{{whatsapp}}` (pase a humano).
- **Llamar**: `POST /api/agent/voice-token` crea un token efímero (un uso, 15 min) y el
  navegador abre la **Live API** (`GEMINI_LIVE_MODEL`, por defecto `gemini-3.8-live`) con voz bidireccional,
  interrupciones y transcripción en vivo. La API key nunca sale del servidor.
- Sin `GEMINI_API_KEY` el widget **no se muestra** en producción. Para verlo en modo vista
  previa (responde invitando a WhatsApp) pon `AGENT_PREVIEW="1"`.
- Eventos del Pixel: `AgentChat`, `AgentCall` (custom) y `Contact` al pasar a WhatsApp.
- Decisiones y fuentes: `docs/evidencia-agente-gemini.md`.

## Reparto de leads entre asesoras (WhatsApp) — LEGADO, desactivado para el destino

> Desde octubre de 2026 la landing tiene **un solo número de WhatsApp** (`lib/config.ts`,
> +1 (385) 392-7656, el bot de ventas). `/ir/whatsapp` sigue funcionando pero **siempre**
> redirige a ese número: ya no consulta asesoras ni fija la cookie `ulp_adv`. Lo que sigue
> describe el reparto anterior (ULP) y se conserva solo como referencia.

Los botones antiguos de WhatsApp apuntan a `/ir/whatsapp` (ver `lib/wa-route.ts`). Antes, el
servidor decidía a qué asesora iba la persona y redirigía a `wa.me`:

1. Si ya tiene asesora asignada (cookie `ulp_adv`, 30 días) y sigue activa → la misma.
2. Si no → la siguiente por **turno ponderado** según los "turnos" de cada asesora (RPC `ulp_assign_advisor`, bloqueo de fila): con 4/4/2 salen 4, 4 y 2 de cada 10 leads.
   La asignación ocurre en el **primer clic real**, no en la visita: ambas reciben la misma
   cantidad de personas que de verdad escriben.
3. Sin Supabase o sin asesoras activas → el número general de `lib/config.ts`.

Cada clic se registra en `ulp_leads` (`source=auto` = lead nuevo, `sticky` = la misma
persona volviendo a tocar). Panel en `/admin` → "Asesoras y leads": añadir/editar/pausar
asesoras, reparto de 30 días, leads con fecha y hora. Esquema: `supabase/advisors.sql`.
Prime nunca dicta un número: ofrece el botón, que pasa por el mismo reparto.

## CRM interno (contactos, etapas, equipo)

Dos paneles con la misma sesión (`lib/session.ts`):

- **`/admin` — panel del dueño** (cuentas con rol `owner`, p. ej. usuario `henry`): Resumen
  del negocio (rendimiento por asesora, por servicio, cobrado), Contactos de todo el equipo,
  Leads y asesoras, Reseñas, Equipo (crear accesos) y Mi cuenta (cambiar contraseña).
  Si el campo usuario se deja vacío, `ADMIN_PASSWORD` funciona como clave maestra de emergencia.
  (Legado de UsaLatinoPrime: en el proyecto de ContyGo no se configura; ver «Configuración».)
- **`/equipo` — panel de las asesoras** (rol `advisor`): solo sus contactos y su cuenta.

- **Contactos**: vista *Hoy* (sin contactar ordenados por espera + seguimientos vencidos y
  de hoy), *Tablero* por etapa (arrastrar para cambiar) y *Lista* con búsqueda.
- **Ficha**: WhatsApp y llamada con un toque, etapa (Nuevo → Contactado → Calificado →
  Pagado → En trámite → Cerrado, o Perdido con motivo), próximo paso con fecha, servicio,
  asesora, monto, notas, respuestas del cuestionario e historial de actividad.
- **Captura automática**: al final del embudo la persona deja nombre y WhatsApp
  (`/api/contacts/capture`); el contacto nace con sus respuestas, asignado a la misma
  asesora que recibirá su WhatsApp, y el clic queda anotado en su historial.
- Datos en Supabase (`supabase/crm.sql`): `ulp_team_users`, `ulp_contacts`,
  `ulp_activities`. Sesión firmada en `lib/session.ts`. Evidencia: `docs/evidencia-crm.md`.

## Actualización de seguimiento y permisos

Las instrucciones de reconstrucción, pruebas y despliegue coordinado están en
[supabase/README.md](supabase/README.md). La web actualizada utiliza
`ulp_assign_advisor_secure` y `ulp_record_lead`, con secreto de servidor,
cookies firmadas y registro transaccional del clic y su historial.
La asignación de asesora al completar el formulario no cuenta como un clic a
WhatsApp; el clic del cliente tampoco cuenta como respuesta de la asesora.
