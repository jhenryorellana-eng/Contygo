# ContyGo · Contratación por API desde la landing

La persona contrata dentro del recorrido de cada servicio y firma en contygo. Nuestras rutas de servidor ponen la clave de contygo y crean el contrato por API. Después, la persona ve el enlace de firma.

- **28-09-2026:** primera integración, con la sesión guardada en el servidor.
- **29-09-2026:** pasa al diseño **«sin base de datos»** de la guía (§2 bis). La versión anterior está fuera del repositorio, en `Documents/contygo-archivo-versiones-2026-09-27/contratacion-con-sesion-en-servidor-2026-09-29/`.
- **02-10-2026:** preparada para producción en la rama `feat/contratacion-produccion`, con los commits `eb9caf2`, `98de399` y `53c1ef9` sobre `40a47b1`. Trae:
  - las preguntas nuevas del catálogo;
  - el teléfono del contrato solo +1;
  - los errores de la API bien mapeados;
  - plazos por petición y aviso a ventas;
  - precios vivos;
  - el interruptor de apagado;
  - los textos legales de ContyGo.

  **Todavía no se ha probado contra el contygo real** (ver «Cómo probar»).

**Fuentes:**

- **Guía técnica:** «API de contratación de contygo: documentación técnica para la web», estado del 25-09-2026. Se citan sus secciones (§). Copia local en `docs/fuentes-contygo/API-contratacion-contygo.2026-09-29.md`.
- **Contrato exacto de cada ruta:** el OpenAPI de producción del 29-09-2026, enviado por contygo ese día. Copia local en `docs/fuentes-contygo/openapi-motor-de-ventas.2026-09-29.yaml`.
  - Fija la `Idempotency-Key` («de 8 a 200 caracteres. Un uuid por intento de venta es lo sensato») y el `externalRef` (de 1 a 200 caracteres).
  - Es anterior a `details.fields`, `us_state` y `dateMode`. Esos datos salen de una lectura del código de contygo del 02-10-2026, de solo lectura, y se marcan con «(código de contygo, 02-10-2026)».
- **`docs/fuentes-contygo/` no está en git a propósito** (`.gitignore`). Es documentación interna de contygo y este repositorio es público. Pídela al dueño.
- **Catálogo real:** `GET /catalog`, leído el 29-09-2026 en solo lectura (13 servicios). Copia en `scripts/fixtures/contygo-catalog-2026-09-29.json`. Es anterior a las preguntas `us_state` y `future_event`.
- **Cloudflare Turnstile**, verificado en la web el 28-09-2026 y el 02-10-2026:
  - [validación en servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/);
  - [renderizado explícito](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/);
  - [claves de prueba](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## Por qué parecía atascado en el código por correo

**La landing no necesita Resend.** El código lo genera y lo envía contygo:

- En el canal web, la 1.ª llamada a `POST /contracts` siempre responde `409 CLIENT_VERIFICATION_REQUIRED`.
- Contygo encola entonces un trabajo en QStash, que manda el código con el Resend de contygo, desde contygo.app.
- Contygo solo guarda el hash del código, así que la landing nunca lo ve.
- La 2.ª llamada solo admite `verificationId` y `verificationCode`. No hay forma de que la landing certifique el correo por su cuenta.

**En producción el envío funciona.** El 02-10-2026, un alta real del bot de WhatsApp siguió el camino 409 → correo enviado («resend: transactional email sent») → 201. Se vio en los logs de Vercel de contygo, en una revisión de solo lectura.

**Lo que de verdad lo frenaba:**

1. **En desarrollo, las escrituras estaban bloqueadas.**
   - Con `npm run dev` contra el contygo real y sin `CONTYGO_ALLOW_WRITES=1`, la landing devuelve `DEV_WRITES_DISABLED` justo al pulsar «Enviar mi código».
   - En `40a47b1` eso se mostraba como «No pudimos completar tu solicitud. Un asesor te contactará».
   - Hoy se muestra la pantalla «no disponible en línea» (`UNAVAILABLE_ONLINE`), con WhatsApp.
2. **El simulador no envía correos.** `scripts/contygo-mock-server.cjs` acepta un código fijo, `481920`. Hasta hoy, el único recorrido completo probado era contra el simulador.
3. **En Vercel faltaban variables:** `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `LANDING_TOKEN_SECRET`.
   - Sin ellas, `/api/contratar/iniciar` responde 503 (`captcha_not_configured` o `landing_token_secret_missing`) antes de llegar a contygo.
   - Según los logs de Vercel (revisión del 02-10-2026), ningún despliegue de la landing llamó nunca a `/api/contratar/*`.

**Ojo con el síntoma.**
- Hoy, un 503 de nuestra propia ruta se ve en la ficha como «No pudimos confirmarlo todavía. Inténtalo de nuevo en unos segundos»: se trata como `busy`. Si sale una y otra vez, revisa la configuración de Vercel, no contygo.
- `captcha_not_configured` no deja ninguna línea en el log: solo aparece en la respuesta de la ruta.

## Arquitectura: una landing sin base de datos (guía §2 bis)

«No necesitas base de datos, ni IA, ni guardar nada de la persona». La web tiene dos piezas.

**1. La UI (el navegador) guarda el estado del flujo**, en `sessionStorage`, nunca en `localStorage`:

- **En `sessionStorage`** (`lib/contygo-api/browser.ts`):
  - los datos de la ficha;
  - el `verificationId`, el **cuerpo exacto** de la 1.ª llamada y su ticket firmado.
- **Solo en memoria:**
  - la `Idempotency-Key` de cada intento, generada con `crypto.randomUUID()`;
  - el `signingUrl`, que no se guarda nunca.
- **Al firmar, la ficha se borra.** Solo queda el token firmado del contrato, sin datos personales, para la página de «gracias». Esa página lo borra cuando el contrato ya no espera nada más: firmado y pagado, o cancelado.
- **El `externalRef` lo genera la UI al empezar la conversación:** `web-<uuid>`. Es el mismo en el lead y en el alta.

**2. Las rutas `/api/contratar/*` son un proxy sin estado.** Añaden la clave, validan y reenvían. No leen ni escriben ninguna base de datos ni ponen cookies.

| Ruta de la web | Llama a contygo | Además |
|---|---|---|
| `POST /api/contratar/servicio` | `GET /catalog`: caché de 5 min, o de hasta 1 h si contygo no responde | Devuelve el servicio (paquetes, personas y preguntas con `kind`, `dateMode`, `minNotice` y `options`), además de `checkoutEnabled`, el texto de la casilla y la site key de Turnstile |
| `GET /api/contratar/precios` | `GET /catalog` | El precio «desde» y los paquetes de cada servicio. Es público, con caché de CDN de 5 min. Sin catálogo responde 503 y la UI oculta los precios |
| `POST /api/agent/service-intake` | `GET /catalog`, y `POST /eligibility/evaluate` al terminar | Las respuestas viajan en cada turno y vuelven al navegador. Devuelve `escalate: true` si hay una pregunta que la web no sabe responder |
| `POST /api/contratar/lead` | `PUT /leads/{externalRef}` | El veredicto para ventas lo da contygo, no la UI. Exige un token de Turnstile con la acción `lead` (`captchaToken`; invisible en el navegador) |
| `POST /api/contratar/iniciar` | `POST /eligibility/evaluate`, `PUT /leads/{externalRef}` y `POST /contracts` (1.ª llamada) | Pasa por el interruptor, el **CAPTCHA (Turnstile)** y el límite propio. Reenvía la clave de la UI. Devuelve `verificationId`, cuerpo y ticket |
| `POST /api/contratar/confirmar` | `POST /contracts` (2.ª llamada) | Solo funciona con un ticket válido. Reenvía la clave de la UI. Con 201, devuelve el token del contrato |
| `POST /api/contratar/estado` | `GET /contracts/{id}` | Solo con el token firmado; si no cuadra, 404. Caché de 60 s |
| `POST /api/contratar/reenviar` | `POST /contracts/{id}/link` | Solo con el token firmado. Reenvía la clave de la UI |
| `POST /api/webhooks/contygo` | — | **Apagada** sin `CONTYGO_WEBHOOK_SECRET` (404) |

Los nombres de las rutas no son los de la tabla de la guía (`/api/contygo/…`), que son un ejemplo. Estado y reenvío van por `POST` con el token en el cuerpo, no en la URL (`?t=…`). Así el token no queda en los registros de peticiones, y eso importa porque con él se puede pedir un enlace de firma nuevo.

### El token del contrato, sin base de datos (guía §2 bis)

`contractId + "." + HMAC_SHA256(LANDING_TOKEN_SECRET, contractId)`, en base64url (`lib/contygo-api/tokens.ts`). `/estado` y `/reenviar` recalculan el HMAC; si no coincide, responden 404 sin llamar a contygo.

### El ticket de la verificación (pieza nuestra, misma técnica)

La guía dice que la UI guarda el cuerpo exacto y se lo manda a la ruta de servidor, que «solo añade la clave y reenvía». Sin nada más, `/confirmar` sería un proxy abierto a `POST /contracts`, y cualquiera podría gastar nuestros cupos de contygo.

- **Qué es:** al enviar el código, el servidor firma `exp.HMAC(secreto, "ticket|exp|verificationId|sha256(cuerpo)")`. Caduca a los 30 minutos; el código vale 15.
- **Qué comprueba `/confirmar`:** solo canjea códigos de altas que pasaron por el CAPTCHA, y con el cuerpo idéntico byte a byte.
- **Si el ticket falla** (cuerpo cambiado, ticket ajeno o caducado), la UI empieza otra vez por la 1.ª llamada. Es lo que pide la guía cuando la persona corrige un dato tras recibir el código (§4, paso 4).

Esto evita también un fallo real del diseño anterior. Reconstruir el cuerpo en la 2.ª llamada podía cambiar `consent.at` si el reloj del teléfono iba adelantado. Contygo lo habría rechazado como `VERIFICATION_INVALID`.

**`LANDING_TOKEN_SECRET` es obligatorio en producción** (32 caracteres o más).
- Sin él, o si es más corto, `/iniciar` responde 503 `landing_token_secret_missing` **antes** de enviar el código, porque no se podría canjear. `/estado` y `/reenviar` tampoco funcionan.
- En desarrollo, sin secreto propio, se deriva uno de la clave de contygo.

## Lo que la landing da por hecho de la API de contygo

### Preguntas del catálogo: `kind` y `dateMode`

| `kind` | Qué se envía | Cómo se pregunta en el chat |
|---|---|---|
| `yes_no` | Un booleano | Botones Sí / No |
| `date` | `"YYYY-MM-DD"` | Depende de `dateMode`:<br>• `past`, `birthdate` o sin `dateMode`: fecha hasta hoy (`max` = hoy).<br>• `future_event`: fecha desde hoy (`min` = hoy, `max` = 2100-12-31), con aviso de `minNotice` |
| `us_state` | El código de 2 letras de `options` (`"TX"`) | Botón «Elegir mi estado» con las `options` del catálogo. También vale el rótulo de la opción, por ejemplo «Texas» |
| cualquier otro | — | No se adivina. Se escala a WhatsApp:<br>• el chat devuelve `escalate`;<br>• la ficha se bloquea;<br>• `/iniciar` responde `HUMAN` con el código `UNKNOWN_QUESTION_KIND` |

- **Texto libre o voz.** Gemini solo interpreta la respuesta a la pregunta en curso; «vivo en Texas» da `TX`. La elegibilidad la decide `POST /eligibility/evaluate`, nunca el modelo.
- **`minNotice`** es solo informativo: quien decide es contygo. Su forma no está documentada. El chat lee `message.es`, `days` o `minDays` y, si no encuentra ninguno, muestra un aviso genérico. **Pendiente:** confirmarla con un `GET /catalog` de solo lectura. El `{days: 30}` del simulador es una suposición.
- **Motivos de descarte.** `disqualified[].reason` (`answer`, `deadline_passed`, `event_too_close`, `age_limit_passed`…) se traduce a un texto neutro, sin «no aplica» y sin prometer un asesor.
- **`principalFallbackWhenEmpty`** de `partyRoles` está tipado y llega a la ficha, pero la ficha todavía no lo usa.

### Formas de pago: `plans[].paymentOptions` (campo aditivo)

contygo publica en cada paquete del `GET /catalog` el desglose de cuotas calculado por su propio motor. `installmentOptions` **no cambia** (el bot de WhatsApp y las landings viejas lo leen); la landing nueva pinta `paymentOptions`.

```ts
interface CatalogPaymentBreakdownDto {
  totalCents: number;                   // base + extraPartyPriceCents × personas adicionales
  downpaymentCents: number;             // = totalCents si installmentCount === 1
  installmentCount: number;             // INCLUYE el anticipo: «6» = anticipo + 5 cuotas
  installmentsAfterDownpayment: number; // installmentCount - 1
  perInstallmentCents: number;          // 0 si installmentCount === 1
  lastInstallmentCents: number;         // 0 si installmentCount === 1; la última absorbe el resto de centavos
}
interface CatalogPaymentOptionDto extends CatalogPaymentBreakdownDto { // números base = 0 personas adicionales
  installmentOptionId: string | null;   // null ⇒ plan por defecto del paquete (sin opciones activas)
  isDefault: boolean;                   // la que usa POST /contracts si se omite installmentOptionId
  frequency: "weekly" | "monthly";
  byExtraParties?: Array<CatalogPaymentBreakdownDto & { extraPartyCount: number }>; // k = 1..maxRows; solo con extraPartyPriceCents > 0 y roles
}
```

**Reglas que la landing respeta:**
- **`installmentCount` incluye el anticipo.** El texto es «Cuota inicial $D, luego {count−1} pagos mensuales de $P»; nunca «{count} pagos» además del anticipo. «el último de $L» solo si `L ≠ P`. `installmentCount === 1` → «Pago único» + total.
- **La landing nunca calcula dinero.** Solo elige la fila: k=0 → los números base de la opción; k>0 → la fila `byExtraParties` con `extraPartyCount === k`. k es el número de personas de la ficha (`parties.length`, igual que `resolveContractedMoney` en contygo). Con `extraPartyPriceCents = 0` valen los números base. Si no hay fila (k mayor que las publicadas) la tarjeta muestra la forma sin importes y «Tu contrato mostrará tu plan de pagos exacto.».
- **Orden = el del administrador, sin insignias.** Se preselecciona la `isDefault` (si ninguna, la primera). Con una sola opción, tarjeta informativa sin radio; con varias, `radiogroup`. Cambiar de paquete reinicia la selección a la de ese paquete.
- **`POST /contracts` no cambia:** solo viaja `installmentOptionId`, y **se omite cuando el id es `null`** (null es un 400). Nunca se envían montos. `/iniciar` acepta ids presentes en `paymentOptions` o, en un catálogo antiguo, en `installmentOptions`.
- **API antigua** (sin `paymentOptions` o `[]`, p. ej. precio 0): se conserva la nota «El plan de pagos aparece en tu contrato antes de firmar.» y no se muestran las `installmentOptions` crudas.
- **Borrador restaurado** (`lib/contygo-api/payment-options.ts` → `reconcileSelection`): paquete que ya no existe → el primero; opción inválida o ausente → la por defecto; id `null` → `""`.
- **Normalizador** (`normalizeCatalog`, antes de cachear): listas ausentes → `[]`, opciones o filas con forma inválida se descartan. Un paquete sin `installmentOptions` ya no tumba `/servicio`.
- Los precios «desde» (`priceSummary`, B7) no cambian.

**El simulador publica** (`scripts/contygo-mock-server.cjs`, no con `MOCK_PLAIN_CATALOG=1`): `visa-juvenil-basico` con 3 opciones (6 mensuales por defecto, 8 mensuales con resto de centavos, 11 semanales); `taxes` Individual (una opción por defecto con id `null`) y Familiar (+$50 por persona adicional, `byExtraParties` k=1..10); `llc-florida` con dos paquetes, solo «Constitución» con opciones (3 mensuales y pago único). El resto sale con `paymentOptions: []` (API antigua).

### Teléfono del contrato: solo +1

- **Lo que hace contygo.** Rechaza un teléfono que no sea +1 en la 1.ª llamada, antes de enviar ningún código: responde 400 `INVALID_REQUEST` con `details.fields[{path: "client.phoneE164", reason: "unsupported_country"}]`. Los leads sí aceptan teléfonos internacionales.
- **Cómo lo normaliza la landing** (`normalizeContractPhone`, con el mismo criterio que el bot):
  - quita espacios, puntos, guiones y paréntesis;
  - cambia `00` por `+`;
  - lee diez dígitos sin prefijo como +1;
  - solo acepta `+1` más diez dígitos con reglas NANP (el código de área y la central empiezan por 2-9).
- **El texto de error es único:** «Necesitamos un teléfono de EE. UU. para tu cuenta.» (`PHONE_US_MESSAGE`).
- **En la ficha:**
  - el paso «Contacto» tiene el +1 fijo, sin selector de país;
  - si el teléfono del paso del nombre no es +1, el campo empieza vacío con ese aviso;
  - un número extranjero pegado se conserva entero y se marca, en vez de recortarse a un número de EE. UU. falso.
- **El teléfono del lead** (`normalizePhone`) sigue aceptando números internacionales.

### Errores por campo: `details.fields`

- **Dos formas.** El 400 `INVALID_REQUEST` trae `details.fields` así:
  - `{path, code}` cuando falla la validación del esquema;
  - `{path, reason}` cuando falla la identidad, con `reason` `invalid`, `reserved_domain` o `unsupported_country`.
- **Traducción a la ficha** (`mapInvalidFields`):
  - `client.email` → `email`;
  - `client.phoneE164` → `phone`;
  - `client.address.zip` → `address.zip`;
  - `parties.N.campo` queda igual;
  - lo que empieza por `consent` → `consent`.

  La ficha vuelve al paso del primer campo con error. `reserved_domain` muestra «Usa otro correo.», sin explicar por qué.
- **Si ningún path corresponde a la ficha**, el resultado es `ERROR` con el código `INVALID_REQUEST`.
- **En la 2.ª llamada**, un `INVALID` pasa a `RESTART`: el cuerpo ya pasó nuestra validación, así que algo cambió.

### Alta en dos llamadas

1. **1.ª llamada** (`/iniciar`): el cuerpo, sin `verificationId`.
   - En el canal web contygo responde siempre `409 CLIENT_VERIFICATION_REQUIRED`, con `verificationId`, `maskedEmail` y `expiresAt`, y envía un código de 6 dígitos que vale 15 minutos.
   - Esa respuesta es igual para cualquier persona: no revela si ya es cliente.
   - Según el OpenAPI, un canal que no exige código podría responder 201 directamente. El código de la landing acepta los dos casos.
2. **2.ª llamada** (`/confirmar`): el **mismo cuerpo, byte a byte**, más `verificationId` y `verificationCode`, con una `Idempotency-Key` nueva.
   - Contygo calcula el hash del cuerpo sin esos dos campos. Si cambia cualquier dato, responde `VERIFICATION_INVALID` y gasta un intento.
   - Por eso el servidor ata el cuerpo al ticket y la UI lo guarda tal cual.
   - El 02-10-2026 el bot perdió así un intento en producción.
3. **201** con `clientCreated`, `caseNumber`, `contractId` y `signingUrl`. La ruta real del enlace es `/firma/…`.
   - Solo se muestra un `signingUrl` `https` del mismo host que la API.
   - Excepción para el ensayo en desarrollo: se acepta `http` si la API está en `localhost` o `127.0.0.1` y no estamos en producción.

Cada código admite 5 intentos: `VERIFICATION_INVALID` trae `attemptsLeft`. Con `VERIFICATION_EXPIRED` se empieza otra vez.

### Claves de idempotencia (guía §8 y §10)

La UI genera una clave con `crypto.randomUUID()` para cada intento y la ruta la reenvía tal cual. El servidor solo acepta UUID v4. En la red local (`http://192.168…`), donde `randomUUID` no existe, se genera el mismo UUID v4 con `getRandomValues`.

| Qué pasa | Clave del siguiente intento | Por qué |
|---|---|---|
| 1.ª llamada cortada (red o timeout): `RETRY_LATER` con motivo `fresh_key` | **Nueva**. La UI avisa de que vale el código más reciente | Contygo no guarda el 409 de la 1.ª llamada. Con la misma clave respondería `IN_PROGRESS` hasta 120 s y después emitiría otro código que invalida el anterior (código de contygo, 02-10-2026) |
| 2.ª llamada: corte, timeout, 500, 503 o `IN_PROGRESS` | **La misma**, con los mismos bytes. El servidor ya reintenta dentro del plazo; si el fallo sigue, responde `busy` | Contygo no guarda los 5xx y retoma desde el cliente ya creado |
| 503 o `IN_PROGRESS` en la 1.ª llamada, o plazo agotado antes de enviar nada (`busy`) | La misma | No hay nada nuevo que repetir |
| Nuestra ruta responde 502, 503 o 504, o algo que no es JSON | La misma (`busy`) | No sabemos si llegó a contygo |
| Un código distinto, «Enviar otro código» o «Corregir» | Nueva | Es otro intento |
| 429 `DESTINATION_RATE_LIMITED` (`destination`) o `VERIFICATION_RATE_LIMITED` (`verification`) | Nueva, sin bucles; se respeta `Retry-After` | No se creó nada |
| 429 `RATE_LIMITED` (`general`) | Nueva, y con un código nuevo | Ese 429 se guarda con la clave: repetirla devuelve el mismo 429 (código de contygo, 02-10-2026) |
| `IDEMPOTENCY_MISMATCH` (`conflict`) | Nueva | Esa clave ya no sirve |
| Reenvío del enlace | Una por reenvío. Se repite la misma tras un corte, un 503 o `IN_PROGRESS` | — |

### Un cliente web que vuelve: `CLIENT_NEEDS_HUMAN`

- **Qué pasa.** Una cuenta creada desde la web queda con el teléfono «reclamado». Si esa persona vuelve a contratar, por la web o por el bot, contygo responde `CLIENT_NEEDS_HUMAN` hasta que un operador adopte el teléfono.
  - No recibe `clientCreated: false`, aunque la guía del 25-09 lo prometa (código de contygo, 02-10-2026).
  - La landing lo trata igual en las dos llamadas.
- **Requisito para desbloquearlo.** Adoptar el teléfono exige el correo verificado. El cambio de contygo que sella el correo al canjear el código no está desplegado (ver «Lo que depende de contygo»).
- **Techo diario de códigos.** Cuando un correo lo supera, contygo también responde `409 CLIENT_NEEDS_HUMAN`, no 429.
- **En el humo de producción**, no reutilices el correo ni el teléfono de una prueba anterior.

#### Decisión del 03-10-2026: reconocer al cliente y corregir el teléfono (`FIX_CONTACT`)

Contrato compartido con x-legal (la landing lo implementa; el lado servidor es otro cambio):

- **Cliente reconocido (regla de x-legal tras la revisión de seguridad del 03-10-2026).** x-legal enlaza solo, con 201 y `clientCreated: false`, **únicamente** una cuenta que la landing o el bot crearon, cuando llegan el mismo correo y el mismo teléfono con los que nació y su contraseña inicial **nadie la ha cambiado todavía**. Cualquier otra cuenta (la contraseña ya cambió, el correo o el teléfono no son los de nacimiento, la creó el equipo o `/registro`) responde `409 CLIENT_NEEDS_HUMAN` con `{ resolution: "existing_client" }`: la persona sale por WhatsApp y el equipo adopta el teléfono; a partir de ahí, los contratos siguientes sí se enlazan solos. Así quien reclama un teléfono ajeno desde la web no puede quedarse con el contrato de otra persona, y una cuenta cuya contraseña inicial es el teléfono deja de servir en cuanto su dueño la cambia. La landing muestra «Te reconocimos: añadimos este servicio a tu cuenta de ContyGo.» (en la pantalla final y en `/contratar/gracias`). La nota de la contraseña inicial solo sale con `clientCreated: true`.
- **Pista segura, solo canal web y solo tras un código válido.** El 409 `CLIENT_NEEDS_HUMAN` puede traer `error.details`:
  - `{ resolution: "email_has_account", phoneHint?: "NN" }`: el correo probado es el de acceso de una cuenta y el teléfono escrito no es el suyo. `phoneHint` son los 2 últimos dígitos del teléfono de esa cuenta (nunca más; se omite si no tiene).
  - `{ resolution: "phone_in_use" }`: el teléfono escrito es de una cuenta y el correo probado no es de nadie.
  - `{ resolution: "existing_client" }`: la cuenta existe pero x-legal no la enlaza sola (regla de arriba). No lleva ningún dato de la cuenta. La landing la convierte en `EXISTING_CLIENT`.
  - Cualquier otro motivo: sin `details`, como siempre. La 1.ª llamada no cambia (idéntica exista o no la persona) y el bot de WhatsApp conserva su cuerpo opaco. La repetición idempotente de un 409 guardado repite los mismos `details`.
- **`EXISTING_CLIENT`.** `mapContractResponse` lo produce con `existing_client` (una resolución que no conoce sigue en `HUMAN`). `flow.ts` lo pasa al navegador con la referencia `WEB-XXXXXX` y, como `HUMAN`, avisa a ventas con el código `EXISTING_CLIENT` (en la 1.ª y en la 2.ª llamada). Pantalla de bloqueo: «Ya eres cliente de ContyGo.» / «Para añadir este servicio a tu cuenta, escríbenos por WhatsApp y lo hacemos contigo.», con el botón de WhatsApp (único número, mensaje con el servicio y la referencia `WEB`) y el enlace «Entrar a mi cuenta» (https://contygo.app/entrar). Sin «Reintentar»: solo el equipo puede adoptar el teléfono. Es respuesta definitiva para las claves de idempotencia.
- **Lo que hace la landing con las pistas de corrección.** `mapContractResponse` convierte esas pistas en el paso `FIX_CONTACT` (`reason`: `email_has_account` | `phone_in_use`, y `phoneHint` solo si son exactamente 2 dígitos; si no, se descarta). Sin `details`, o con algo desconocido, sigue el `HUMAN` de hoy. `FIX_CONTACT` **no es un fallo**: no avisa a ventas (sin `PUT /leads` de intento) y sí lleva clave nueva.
- **Dos casos límite (DOC-76 §6.2): corregir el teléfono no puede ayudar.** `email_has_account` puede llegar con un `phoneHint` IGUAL a los 2 últimos dígitos del teléfono que la persona ya escribió (una cuenta que x-legal no reconoce sola: nacida en `/registro` o antes del PR #452), o SIN `phoneHint` (la cuenta no tiene teléfono). En ambos la landing lo trata como `HUMAN`, no como `FIX_CONTACT`: WhatsApp neutro al único número del bot con la referencia `WEB` y sí avisa a ventas, igual que cualquier `HUMAN`. Se decide en el servidor (`lib/contygo-api/flow.ts`, donde se conoce el `client.phoneE164` fijado por el ticket) en `confirmContract` y, por simetría, en `startContract`; `mapContractResponse` sigue puro. Una pista DISTINTA al teléfono escrito sigue siendo `FIX_CONTACT` sin aviso, y `phone_in_use` también.
- **Aviso accesible.** En `FIX_CONTACT` el campo «Teléfono» conserva el error con `role=alert`; el aviso de arriba usa el tono `info`, para que un lector de pantalla no anuncie dos alertas.
- **Riesgo residual aceptado por el dueño.** `phone_in_use` le dice a quien probó un correo ajeno que un teléfono está registrado. Los frenos reales son el CAPTCHA, el límite por IP y la cuota del principal web (60 por hora y 300 por día), que el sondeo consume. Lo que se filtra de más respecto de main es casi nada.

### Límites

**Los de contygo** (código de contygo, 02-10-2026):

| Cupo | Valor | Lo comparten |
|---|---|---|
| `POST /contracts` por clave | 30 por minuto y 300 por hora. Cuenta cada llamada, también los reintentos y los códigos erróneos | Todos los visitantes de la web |
| Altas con código válido | 60 por hora y 300 al día por principal | Todos los visitantes de la web |
| Por destino (la misma persona: teléfono y correo) | 5 por hora y 20 al día | La web y el bot, para la misma persona |
| Códigos por correo | 3 por hora (`VERIFICATION_RATE_LIMITED`, `Retry-After: 3600`), más un techo diario (`CLIENT_NEEDS_HUMAN`) | Todos los canales |
| Leads | 600 por hora y 5000 al día | El principal web |
| Reenvío del enlace | 5 por hora por contrato | — |
| Estado del contrato | Como mucho 1 consulta por minuto por contrato (guía §6) | — |

**Los nuestros**, en la memoria de cada instancia:

| Ruta | Límite |
|---|---|
| `/iniciar` («Enviar mi código») | 10 por hora por IP, y CAPTCHA en cada envío |
| `/confirmar` | 30 por hora por IP, y 8 cada 15 min por verificación |
| `/lead` | 20 por hora por IP, con Turnstile (acción `lead`) |
| `/servicio` | 60 cada 10 min por IP |
| `/estado` | 40 cada 10 min por IP; caché de 60 s por contrato |
| `/reenviar` | 10 por hora por IP y 3 por hora por contrato |
| `/api/agent/service-intake` | 40 cada 10 min por IP |

Sin base de datos no hay contadores compartidos: en Vercel cada instancia tiene los suyos. Son un freno de buena fe, no un contador exacto. Los frenos duros son el CAPTCHA, el ticket firmado y los límites de contygo.

**Plazos:**
- `/iniciar` y `/confirmar` tienen un presupuesto global de 50 s por petición (`maxDuration` 60), compartido por catálogo, elegibilidad, lead y alta.
- `/reenviar` tiene 25 s (`maxDuration` 30).
- Cada intento a `/contracts` tiene un timeout de 25 s, y el resto de llamadas, 15 s.
- Ningún intento empieza con menos de 2 s por delante, y las esperas entre intentos son de 3 s como mucho.

## El recorrido

| Momento | Qué pasa | Llamada a contygo |
|---|---|---|
| El chat se abre (tras el vídeo 1) | El bot hace las preguntas del **catálogo**, cada una según su `kind` | `GET /catalog` |
| La persona responde | Botones, selector de fecha o de estado. Gemini solo interpreta texto o voz de la pregunta actual | — |
| Última respuesta | Contygo evalúa; el navegador guarda respuestas y veredicto | `POST /eligibility/evaluate` con `answers[{questionId, value}]` |
| Pantalla del nombre | Nombre y teléfono, los dos opcionales; aquí el teléfono puede ser internacional. Aviso: «Al dejar tu teléfono aceptas que ContyGo te escriba por WhatsApp sobre este trámite». Si están los dos, se registra el lead | `PUT /leads/web-<uuid>`, `source: "web"`, URL y UTM |
| Botón «Revisar mi contrato» del cierre | Se abre la ficha guiada: nombre, contacto (+1), dirección, personas, paquete y revisión | `GET /catalog` (vía `/servicio`) |
| «Enviar mi código» | Interruptor, CAPTCHA y límite propio. Después se repite la elegibilidad, se actualiza el lead y se hace la 1.ª llamada | `POST /contracts` → `409 CLIENT_VERIFICATION_REQUIRED` |
| Código | El **mismo cuerpo** guardado, más `verificationId` y `verificationCode`, con una clave nueva | `POST /contracts` → `201` con `signingUrl` |
| Firma | El botón «Firmar mi contrato» abre contygo | — |
| Después | `/contratar/gracias`: estado y reenvío del enlace | `GET /contracts/{id}` · `POST /contracts/{id}/link` |
| En toda la landing | El precio «desde» y los paquetes salen del catálogo vivo; sin catálogo, no se muestra ningún precio | `GET /catalog` (vía `/precios`) |

Si la elegibilidad es negativa, el recorrido continúa: el segundo vídeo sigue disponible. Al llegar a la ficha se muestra «Con estas respuestas no podemos iniciar este servicio en línea» con WhatsApp, y no se contrata.

## Cada respuesta y lo que ve la persona

`/iniciar` y `/confirmar` responden `{ok: true, outcome}` con HTTP 200. Las excepciones son los errores de la propia ruta, más abajo. En `RETRY_LATER` llega también la cabecera `Retry-After`.

**Los textos:**
- Salen de `lib/contygo-api/messages.ts` y los decide el código, nunca el modelo de IA.
- Todo enlace de WhatsApp lleva un mensaje prellenado con el servicio y la referencia corta del intento, sin datos de la persona: «Hola, estaba contratando <servicio> en la web de ContyGo y necesito ayuda (ref. WEB-XXXXXX).».
- La referencia es `WEB-` más los 6 últimos caracteres del `externalRef`.

**El aviso a ventas.** Ante `HUMAN`, `EXISTING_CLIENT`, `UNAVAILABLE_ONLINE` y los `ERROR` no transitorios se repite `PUT /leads/{externalRef}` con este `aiSummary`: «Web · <servicio>. Intentó contratar en línea y necesita ayuda (<CÓDIGO>).».
- Solo lleva el nombre, el teléfono, el origen y ese resumen.
- Es best-effort: si falla, la persona igual ve su salida por WhatsApp.

| `step` | Cuándo sale | Qué ve la persona | Después |
|---|---|---|---|
| `INVALID` | La ficha no pasa nuestra validación, o contygo responde 400 `INVALID_REQUEST` con `details.fields` de la ficha (1.ª llamada). En `/confirmar`, solo un código que no tiene 6 dígitos | «Revisa los campos marcados.», y la ficha vuelve al paso del primer error. Para el código: «El código tiene 6 dígitos.» | Corregir y volver a enviar, con clave nueva |
| `NEEDS_ANSWERS` | Faltan respuestas válidas a las preguntas del catálogo | «Antes de contratar necesitamos tus respuestas a las preguntas del servicio.» / «Cierra y vuelve a abrir el servicio para responderlas; solo toma un momento.» | Bloqueo con WhatsApp |
| `ASK_CODE` | 409 `CLIENT_VERIFICATION_REQUIRED` | Pantalla del código: «Te enviamos un código de 6 dígitos a j***@….» / «Escríbelo aquí. Vale durante 15 minutos.». Botones «Confirmar», «Corregir» y «¿No te llegó? Enviar otro código». El campo acepta «481 920» o «481-920» | La UI guarda el cuerpo, el ticket y el `verificationId` en `sessionStorage` |
| `WRONG_CODE` | 409 `VERIFICATION_INVALID` | «El código no es correcto.» / «Te quedan N intentos.» | El mismo `verificationId`; un código distinto lleva clave nueva |
| `RESTART` | 409 `VERIFICATION_EXPIRED`; un ticket caducado, ajeno o con el cuerpo cambiado; o un `INVALID` o `ASK_CODE` inesperado en la 2.ª llamada | «El código caducó. Te enviamos uno nuevo.» | En cuanto hay un token de CAPTCHA, la UI lanza sola una 1.ª llamada nueva, con clave nueva |
| `NOT_ELIGIBLE` | La elegibilidad da `eligible: false`, o contygo responde 422 `NOT_ELIGIBLE` | «Con estas respuestas no podemos iniciar este servicio en línea.» / «¿Tienes dudas? Escríbenos por WhatsApp.» | Bloqueo con WhatsApp; se borra la ficha |
| `UNAVAILABLE` | El servicio no está en el catálogo, o contygo responde 422 `PLAN_NOT_CONTRACTABLE` (se invalida la caché del catálogo) | «Este servicio no está disponible ahora mismo.» | Bloqueo con WhatsApp; se borra la ficha |
| `UNAVAILABLE_ONLINE` | Cualquiera de estos:<br>• el interruptor (`CHECKOUT_DISABLED`);<br>• `DEV_WRITES_DISABLED`;<br>• un 401 o 403;<br>• `COMPLIANCE_INCOMPLETE` o `COMPLIANCE_EXPIRED`;<br>• `CASE_PAYMENT_PLAN_INVALID`, `CONSENT_CHANNEL_MISMATCH` o `NO_SALES_OWNER`;<br>• un 500 en la 1.ª llamada;<br>• un 401 o 403 del catálogo o de la elegibilidad | «La contratación en línea no está disponible en este momento.» / «Escríbenos por WhatsApp y te ayudamos a terminar.» | Bloqueo con WhatsApp; se borra la ficha. Deja el log `[contygo:config] <dónde> <código>` y el aviso en el lead, salvo con `CHECKOUT_DISABLED` y `DEV_WRITES_DISABLED` |
| `INVALID_PARTIES` | 422 `INVALID_PARTIES` | «Revisa las personas del expediente: falta <rol>.» | Vuelve al paso «Personas»; el código enviado se descarta |
| `SIGN` | 201 con un `signingUrl` de confianza | Con cuenta nueva: «¡Listo, <nombre>! Tu contrato está preparado.». Si ya era cliente (`clientCreated: false`): «Te reconocimos: añadimos este servicio a tu cuenta de ContyGo.» (sin la nota de la contraseña inicial). Además: botón «Firmar mi contrato» y número de caso. Con el aviso `SERVICE_ALREADY_LIVE`: «Ya tienes este trámite en curso (caso …). Abrimos uno nuevo como pediste.» | Se borra la ficha; solo queda el token del contrato para `/contratar/gracias` |
| `SIGN_LINK_PENDING` | 201 con `contractId` pero sin un `signingUrl` de confianza; por ejemplo, la repetición de un 201 | «Tu contrato está preparado (caso …).» / «Toca «Enviarme el enlace» para recibir el enlace de firma.» | El botón llama a `/reenviar` con el token |
| `HUMAN` | 409 `CLIENT_NEEDS_HUMAN` en cualquiera de las dos llamadas, o una pregunta de `kind` desconocido (`UNKNOWN_QUESTION_KIND`) | «Para terminar tu contratación, escríbenos por WhatsApp.». Nunca se explica el motivo ni se promete que alguien llamará | Bloqueo con WhatsApp y la referencia; se borra la ficha; aviso en el lead |
| `EXISTING_CLIENT` | 409 `CLIENT_NEEDS_HUMAN` con `details.resolution: "existing_client"` en cualquiera de las dos llamadas | «Ya eres cliente de ContyGo.» / «Para añadir este servicio a tu cuenta, escríbenos por WhatsApp y lo hacemos contigo.» | Bloqueo (sin «Reintentar») con WhatsApp y la referencia, y el enlace «Entrar a mi cuenta»; se borra la ficha; aviso en el lead con el código `EXISTING_CLIENT` |
| `FIX_CONTACT` | 409 `CLIENT_NEEDS_HUMAN` con `details.resolution` `email_has_account` o `phone_in_use` (solo canal web, tras el código) | Error del campo «Teléfono» y un aviso. `email_has_account`: «Este correo ya tiene una cuenta en ContyGo. Usa el teléfono de tu cuenta (termina en NN).» (sin el paréntesis si no hay pista) / «Ya tienes una cuenta con este correo.» «Escribe el teléfono que registraste y te enviaremos un código nuevo. O entra a tu cuenta.» con enlace a https://contygo.app/entrar. `phone_in_use`: «Con este correo no podemos usar este teléfono.» / «Revisa tu teléfono.» «Si ya eres cliente, usa el correo y el teléfono de tu cuenta; si no, prueba con otro teléfono o escríbenos por WhatsApp.» con el botón de WhatsApp | Vuelve al paso «Contacto» con el código descartado; al corregir y tocar «Enviar mi código» es una 1.ª llamada normal (clave y código nuevos). No avisa a ventas |
| `ERROR` | Cualquier otro código: uno desconocido, `BAD_SIGNING_URL`, `BAD_VERIFICATION` o un `INVALID_REQUEST` sin campos de la ficha | «No pudimos completar tu solicitud.» / «Puedes intentarlo de nuevo o escribirnos por WhatsApp.» | Bloqueo con «Escribir por WhatsApp» y «Reintentar», que vuelve al código (si ya se envió) o a la revisión. La ficha **no** se borra. Aviso en el lead |
| `RETRY_LATER` | Ver la tabla siguiente | Ver la tabla siguiente | La persona se queda en la misma pantalla |

**Motivos de `RETRY_LATER`:**

| `reason` | Cuándo sale | Texto | Clave |
|---|---|---|---|
| `busy` | En estos casos:<br>• `IN_PROGRESS` o 503;<br>• un 500 o un corte de la 2.ª llamada que persiste;<br>• el plazo agotado;<br>• la elegibilidad no responde;<br>• nuestra ruta responde 502, 503 o 504, o algo que no es JSON | «No pudimos confirmarlo todavía.» / «Inténtalo de nuevo en unos segundos.» | La misma |
| `fresh_key` | La 1.ª llamada se cortó sin respuesta | «No pudimos confirmarlo todavía.» / «Toca «Enviar mi código» otra vez. Si te llegan dos correos, usa el código más reciente.» | Nueva |
| `destination` | 429 `DESTINATION_RATE_LIMITED`, o un 429 de nuestros propios límites | «Por seguridad, espera unos minutos antes de intentarlo de nuevo.» / «Puedes volver a intentarlo en <tiempo según `Retry-After`>.» | Nueva |
| `verification` | 429 `VERIFICATION_RATE_LIMITED` (3 códigos por hora y correo) | «Ya te enviamos varios códigos.» / «Usa el último que recibiste, o espera una hora para pedir otro. También puedes escribirnos por WhatsApp.» | Nueva |
| `general` | 429 `RATE_LIMITED` | «Estamos recibiendo muchas solicitudes; inténtalo en unos minutos.» | Nueva, con un código nuevo |
| `conflict` | `IDEMPOTENCY_MISMATCH` | «Algo cambió mientras tanto.» / «Toca el botón otra vez para volver a intentarlo.» | Nueva |

**Respuestas de nuestras rutas sin `outcome`:**

| Respuesta | Qué ve la persona |
|---|---|
| 429 `rate_limited` (límite propio) | Lo mismo que `destination` |
| 403 `captcha_failed` o `captcha_missing` | «No pudimos confirmar que no eres un robot.» / «Espera a que se complete la verificación e inténtalo de nuevo.» |
| 503 (`captcha_not_configured`, `captcha_unavailable`, `landing_token_secret_missing`, `contygo_not_configured` o `catalog_unavailable`), 502, 504 o una página que no es JSON | Lo mismo que `busy`, con la misma clave. **Una configuración rota en Vercel se ve así, sin fin** |
| Otro error (400, 404, 413…) | Bloqueo con `ERROR` y «Reintentar» |
| Falla `/servicio` al abrir la ficha; por ejemplo, 404 `service_not_contractable` | «No pudimos cargar los datos de tu servicio.» / «Revisa tu conexión e inténtalo de nuevo.», con «Reintentar» y WhatsApp. Este texto engaña cuando el slug no existe en el catálogo (pendiente) |
| `/servicio` con `checkoutEnabled: false` (interruptor, o un 401/403 del catálogo) | La pantalla de `UNAVAILABLE_ONLINE`, desde el primer momento |

**Reenvío del enlace** (`/reenviar`; lo usan la ficha y `/contratar/gracias`):

| `step` | Qué ve la persona | Clave |
|---|---|---|
| `SIGN_LINK` | Botón «Firmar mi contrato» y «Listo: te lo enviamos también a tu correo y a tu app de ContyGo.» | — |
| `ALREADY_SIGNED` | «Tu contrato ya está firmado.» | Nueva |
| `NOT_RESENDABLE` | «Este contrato ya no se puede reenviar desde aquí.» / «Escríbenos por WhatsApp y lo revisamos contigo.» | Nueva |
| `IN_PROGRESS` | «Estamos preparando tu enlace.» / «Toca el botón otra vez en unos segundos.» | La misma |
| `UNAVAILABLE_ONLINE` | El mismo texto de «no disponible en línea» | Nueva |
| `RETRY_LATER` | `busy` (503 o un corte): texto de `busy`, con la misma clave. 429: texto de `destination`, con clave nueva | Según el motivo |
| `ERROR` | «No pudimos reenviar el enlace.» / «Inténtalo de nuevo o escríbenos por WhatsApp.» | Nueva |

**En el chat:**
- Con `escalate: true`, los controles se ocultan y aparece «Para este servicio te ayudamos por WhatsApp.» con el enlace.
- Con un 401 o 403 al evaluar, el turno lleva `unavailableOnline: true`. El chat lo guarda, y la ficha muestra «no disponible en línea» al pedir el servicio o al enviar el código.

## Variables de entorno

En desarrollo van en `.env.local`, que está en `.gitignore`. En Vercel van en el proyecto `contygo`, scope **Production**.

En Vercel, un cambio de variable solo se aplica a un despliegue nuevo: después de cambiarla, vuelve a desplegar. Las `NEXT_PUBLIC_*` además se fijan al compilar.

**Obligatorias en producción:**

| Variable | Dónde | Para qué; qué pasa si falta |
|---|---|---|
| `CONTYGO_API_KEY` | Servidor; **solo** en el scope Production | Clave `cg_live_` del principal **web**. Sin ella, las rutas de contratación responden 503 `contygo_not_configured`, el chat 503 `catalog_unavailable` y `/precios` 503 `prices_unavailable` |
| `LANDING_TOKEN_SECRET` | Servidor | 32 caracteres o más, al azar; se recomiendan 48 bytes. Firma el ticket y el token del contrato. Sin ella: 503 `landing_token_secret_missing` antes de enviar el código, y `/estado` y `/reenviar` no funcionan |
| `TURNSTILE_SECRET_KEY` | Servidor | Sin ella, con `NODE_ENV=production`, `/iniciar` responde 503 `captcha_not_configured`, sin línea de log |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Público; se fija al compilar | El widget de Turnstile, con la acción `contratar` y el hostname de landing.contygo.app. Sin ella, la UI manda el token `dev` y, con el secreto puesto, cada envío da 403 `captcha_failed` |
| `GEMINI_API_KEY` | Servidor | La voz guía y el texto libre o la voz del chat. Sin ella los botones funcionan, pero la voz responde 503 y el texto libre se queda en «Necesito confirmar tu respuesta» |
| `NEXT_PUBLIC_SITE_URL` | Público | `https://landing.contygo.app`, para metadatos y sitemap. Sin ella se usa el dominio de producción que da Vercel |

**Opcionales:**

| Variable | Para qué |
|---|---|
| `CONTYGO_CHECKOUT_ENABLED` | `0` apaga la contratación (ver el runbook). Vacía, o con cualquier otro valor, queda encendida |
| `CONTYGO_WEBHOOK_SECRET` | Enciende `/api/webhooks/contygo`. Hoy está apagada a propósito |
| `GEMINI_CHAT_MODEL`, `GEMINI_LIVE_MODEL`, `GEMINI_SERVICE_INTAKE_MODEL`, `GEMINI_VISA_INTAKE_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`, `GEMINI_VOICE` | Cambian el modelo o la voz; todas tienen un valor por defecto en el código |
| `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`, `FACEBOOK_CONVERSION_API_TOKEN` (secreto), `FACEBOOK_GRAPH_API_VERSION`, `FACEBOOK_TEST_EVENT_CODE`, `NEXT_PUBLIC_META_REQUIRE_CONSENT` | Meta Pixel y CAPI (ver el README). Sin Pixel ID se usa el de UsaLatinoPrime. Desde el 2026-10-02 el consentimiento se pide SIEMPRE: el Pixel y la CAPI solo cargan después de aceptar el banner de cookies. Solo `NEXT_PUBLIC_META_REQUIRE_CONSENT=0` lo desactiva (no lo pongas en producción) |
| `NEXT_PUBLIC_VIDEO_URL`, `NEXT_PUBLIC_VIDEO_POSTER` | Vídeo del embudo heredado |
| `AGENT_PREVIEW` | `1` muestra el widget de Prime sin Gemini, para vistas previas |
| `NEXT_DIST_DIR` | Solo en local: carpeta de build alternativa |

**Nunca en producción:**

| Variable | Por qué |
|---|---|
| `CONTYGO_API_BASE` | Apunta a otro contygo (el simulador o el de desarrollo). Con cualquier host que no sea contygo.app, la landing **puede escribir** |
| `CONTYGO_ALLOW_WRITES` | `1` deja escribir fuera de producción. Solo para una prueba coordinada, en local |

**Legado de UsaLatinoPrime; no se configuran en el proyecto de ContyGo:**

| Variable | Qué encienden |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ADMIN_SECRET`, `ADMIN_PASSWORD` | El CRM, el panel y las reseñas heredados (`/admin`, `/equipo`, `/api/crm/*`, `/api/contacts/capture`, `/califica`). Sin ellas, el CRM y el panel quedan sin configurar y las reseñas se ocultan |

**Las pone Vercel:**
- `VERCEL_ENV`: la landing solo escribe en contygo cuando vale `production`, así que **los Preview nunca crean leads, clientes ni contratos**.
- `VERCEL_PROJECT_PRODUCTION_URL` y `NODE_ENV`.

Aun así, la clave va solo en Production: un Preview con la clave sigue leyendo el catálogo y la elegibilidad del contygo real.

`.env.example` aún no existe en la rama (lo crea el dueño). `.gitignore` ya lo deja versionar. Hasta entonces, esta tabla es la referencia.

## Archivos

**Servidor** (`lib/contygo-api/`):

- `client.ts`: una función por endpoint, con plazo global y política de reintentos por llamada. Nunca reintenta un 429. Solo escribe con `VERCEL_ENV=production`, con `CONTYGO_ALLOW_WRITES=1` o contra un contygo que no es contygo.app.
- `catalog.ts`: catálogo en caché, casado con la landing por `slug`. También la vista pública de las preguntas y `priceSummary`.
- `checkout.ts`:
  - validación;
  - teléfono +1;
  - cuerpo estricto;
  - `kind` de cada pregunta;
  - `details.fields`;
  - traducción de cada respuesta a una pantalla;
  - interruptor y `publicRef`.
- `flow.ts`: el alta en dos pasos, sin estado, con plazo y aviso a ventas.
- `tokens.ts`: token del contrato y ticket de la verificación.
- `lead.ts`: lead y resumen del intento.
- `server.ts`: origen, lectura acotada, límites en memoria y Turnstile.
- `webhook.ts`: HMAC.
- `terms.ts`: texto de aceptación versionado.
- `messages.ts`: textos de cada pantalla y lectura de `/reenviar`.
- `browser.ts`: lo que guarda el navegador.
- `prices-client.ts`: precios vivos en el navegador; se piden una vez por carga de página.

**Rutas:** `app/api/agent/service-intake`, `app/api/contratar/{servicio,precios,lead,iniciar,confirmar,estado,reenviar}` y `app/api/webhooks/contygo`.

**Interfaz:**

- `components/contygo/contract/ContractCheckout.tsx`: la ficha, el código y la firma. Recibe del recorrido las respuestas, el veredicto, el nombre, el teléfono y el `externalRef`.
- `ContractThanks.tsx` y `app/contratar/gracias`.
- `components/contygo/guide/PhoneField.tsx`, con `usOnly` para el contrato.
- `components/contygo/juvenil/VisaJuvenilExperience.tsx` y `VisaStatePicker.tsx`: el chat, con selector de estado y fechas según `dateMode`.
- Precios vivos en:
  - `ContygoLanding.tsx`, `ServiceShowcase.tsx` y `Finale.tsx`;
  - `ServicePresentation.tsx` y `DirectContractEntry.tsx`;
  - `ServiceCinemaDialog.tsx`.
- `lib/config.ts`: el único número de WhatsApp y `waLink()`.

**Pruebas:**

- `tests/contygo-api.test.cjs`, `contygo-contratacion.test.cjs`, `contygo-navegador.test.cjs`, `contygo-produccion.test.cjs`, `contygo-ui.test.cjs`, `contygo-flow.test.cjs` y `service-intake.test.cjs`.
- El banco común: `tests/helpers/contygo-harness.cjs`.
- El simulador: `scripts/contygo-mock-server.cjs`.
- El CI: `.github/workflows/ci.yml`.

Ya no hay base de datos. Se retiraron `store.ts` y `supabase/contygo-contratacion.sql`, que nunca llegó a aplicarse. Los dos están en la carpeta de archivo.

## Decisiones

- **La clave solo vive en el servidor** (`CONTYGO_API_KEY`), sin prefijo `NEXT_PUBLIC_`. La API no tiene CORS a propósito (§2).
- **El tipo de cada pregunta lo dice `kind`.** Deducirlo del texto fallaba en el catálogo real: la pregunta de I-485 «¿La fecha de prioridad del I-360 está vigente en el Visa Bulletin (EB-4)?» es de sí/no.
  - El texto solo se usa como defensa, si una pregunta llegara sin `kind`.
  - Un `kind` desconocido no se adivina: se escala.
- **La `signingUrl` nunca se guarda ni se registra.** Solo viaja en la respuesta al navegador de la persona, y solo si es de confianza. El modelo de IA solo ve la pregunta y la respuesta de elegibilidad.
- **«Te reconocimos» solo aparece con `clientCreated: false`, en el 201 posterior al código.** La 1.ª respuesta es idéntica para cualquiera (§3.3). `CLIENT_NEEDS_HUMAN` usa el mismo texto neutro, salvo la pista segura de `FIX_CONTACT` (solo web, tras el código).
- **Ningún texto promete que un asesor llamará ni dice «no aplica».** Un test lo comprueba (`tests/contygo-ui.test.cjs`).
- **Nunca se envían importes.** El cuerpo solo lleva los campos del OpenAPI, y un test comprueba las claves. Los precios que se muestran salen de `GET /catalog`, nunca de listas locales.
- **`consent.channel` es siempre `"web"`**, el único valor válido con una clave web (§9).
- **El rol `lead` no se pide.** Lo ocupa el propio cliente (`clientPartyMode` por defecto). Las demás personas salen de `partyRoles`, respetando `isRequired` y `cardinality`.
- **Un solo número de WhatsApp** en toda la landing: `lib/config.ts`. `/ir/whatsapp` redirige siempre a ese número.
- **Webhooks: opcionales y apagados** (§2 bis). Sin base de datos no hay nada que actualizar: la página de «gracias» consulta el estado y ventas lo ve todo en contygo.
  - La ruta existe para cuando se quieran métricas.
  - Con `CONTYGO_WEBHOOK_SECRET`, verifica la firma sobre el cuerpo crudo y la ventana de ±300 s, deduplica por `X-Event-Id` y registra solo el tipo.
- **Seguro de escritura.** Solo se escribe en contygo con `VERCEL_ENV=production`, con `CONTYGO_ALLOW_WRITES=1` o contra un contygo que no es contygo.app. En el resto de casos solo se lee: catálogo y elegibilidad. En producción **cada alta crea un cliente, un caso y un contrato reales**.

## APUESTAS (sin respaldo todavía)

- **Texto de la casilla de aceptación** (`terms.ts`, versión `terminos-web-2026-10-03`) y los textos de `/terminos` y `/privacidad` (`lib/legal/*.ts`): la huella de `tests/contygo-api.test.cjs` cubre los tres y tocar cualquiera obliga a subir la versión.
  - Nombra a «ContyGo, marca de USA LATINO PRIME LLC» y se muestra en español o en inglés según el idioma elegido en la ficha.
  - **Aprobado por el dueño el 2026-10-03**, igual que `/terminos` y `/privacidad` (versión `terminos-web-2026-10-03`).
  - Si cambia una palabra, cambia la versión: el test «el texto de aceptación y su versión cambian juntos» (`tests/contygo-api.test.cjs`) compara la huella del texto.
  - El comentario de `terms.ts` cita `tests/contygo-checkout.test.cjs`, un archivo que no existe.
- **Duración del ticket (30 min).** Es nuestra. Se basa en que el código vale 15 minutos (§4); si contygo lo alarga, hay que subirla.
- **Forma de `minNotice`.** Ver «Preguntas del catálogo».
- **Plazo de 50 s.** Cabe en el `maxDuration` 60 de Vercel. Un contygo lento puede tardar más de 25 s de forma legítima: su propia ruta declara `maxDuration` 60. Si pasa, la persona ve `busy` y repite con la misma clave.

## Discrepancias entre la guía, el OpenAPI y el código de contygo (para avisar a contygo)

1. **`CONSENT_CHANNEL_MISMATCH`: resuelta.** El OpenAPI de producción (29-09) ya dice que un principal `web` solo puede mandar `"web"`.
2. **`NO_SALES_OWNER`.** La guía dice 409 y el OpenAPI, 422. Los dos se tratan como `UNAVAILABLE_ONLINE`.
3. **Límites.** La guía da 60 altas por hora y 300 al día, y no menciona el cupo por clave (30 por minuto y 300 por hora). El código aplica los dos (ver «Límites»).
4. **Primera llamada.** Según el OpenAPI, un cliente nuevo puede recibir 201 sin código (así funciona WhatsApp). En la web siempre llega primero el 409. El código de la landing acepta los dos casos.
5. **Ruta del enlace de firma.** El ejemplo del OpenAPI usa `/firmar/…`, pero la ruta real es `/firma/…`. La landing no depende de la ruta: solo exige que el enlace sea de confianza.
6. **Cliente web que vuelve.** La guía del 25-09 promete `clientCreated: false`, pero contygo responde `CLIENT_NEEDS_HUMAN`.
7. **Techo diario de códigos.** La guía dice 429, pero contygo responde `409 CLIENT_NEEDS_HUMAN`.
8. **«Repite la misma clave».**
   - Tras un 429: no vale para el `RATE_LIMITED` del cupo de altas, porque contygo guarda ese 429 con la clave.
   - Tras un corte en la 1.ª llamada: tampoco devuelve «la misma respuesta». Contygo no guarda ese 409, responde `IN_PROGRESS` hasta 120 s y después emite otro código.
9. **El catálogo del 29-09 no traía cuotas** en ningún paquete. La ficha muestra la opción de pago solo si existe.

## Lo que depende de contygo (PR aparte, sin mergear)

Estos cambios están en una rama de contygo (`fix/web-contract-email-and-handoff`), **sin mergear ni desplegar** a fecha 02-10-2026.

| Cambio | Estado | Mientras no esté en producción |
|---|---|---|
| Correo del código según el canal. La variante web dice «Escribe este código en la página donde estás contratando con ContyGo. Vence en 15 minutos.» | En la rama | El correo dice «díctalo al asistente… por WhatsApp o por teléfono» y habla de «tu cuenta». Puede confundir a quien contrata por la web |
| Sellar el correo como verificado al canjear el código | En la rama | La cuenta nueva recibe además un correo de «verifica tu correo», y sin verificarlo nadie puede adoptar su teléfono (ver `CLIENT_NEEDS_HUMAN`) |
| Validar plan, cuotas y personas en la 1.ª llamada | En la rama | Un plan, unas cuotas o unas personas mal configurados fallan con 500 en la 2.ª llamada, **después** de crear la cuenta. La landing repite con la misma clave y, si el fallo sigue, muestra `busy` sin fin; solo queda el enlace de ayuda de WhatsApp de la pantalla. Las ramas `INVALID_PARTIES` y `PLAN_NOT_CONTRACTABLE` no se ejercitan |
| Avisar a los admins cuando el código no sale | En la rama | Si el encolado falla, el 409 sale igual y nadie se entera |
| Marcar el lead cuando una alta web termina en `CLIENT_NEEDS_HUMAN` | **No hecho.** Necesita una decisión del dueño (cambio de esquema, o solo notificación) | La única señal es el `aiSummary` que deja la landing en el lead |
| E2E del canal web en contygo | Escrito, **no ejecutado** | — |
| Guía y OpenAPI de contygo al día | No consta como hecho | Esta página es la referencia de la landing |

## Cómo probar

### Tests

- `npm test` corre las 138 pruebas de `tests/*.test.cjs` sin red, con contygo, Turnstile y Gemini simulados.
- Según el informe de la etapa de interfaz (`53c1ef9`), quedaron en 138/138, con `npx tsc --noEmit` y `npx next build` en verde.
- El CI (`.github/workflows/ci.yml`) corre `npm test`, `npx tsc --noEmit` y `npx next build` en cada PR, con variables ficticias.

### Recorrido completo con el simulador (sin red y sin datos reales)

1. Ejecuta `node scripts/contygo-mock-server.cjs`. Escucha en `http://127.0.0.1:3999` y registra cada petición en `%TEMP%/contygo-mock.log`.
2. En `.env.local`:

   ```
   CONTYGO_API_BASE=http://127.0.0.1:3999/api/integrations/v1
   CONTYGO_API_KEY=cg_live_simulado
   ```

   En desarrollo, sin claves de Turnstile, el CAPTCHA se salta. Para verlo, añade las claves de prueba (abajo).
3. Arranca con `npm run dev` y abre `http://localhost:3001`.
4. El código válido es `481920`; cualquier otro da `VERIFICATION_INVALID` («te quedan 4 intentos»). **El simulador no envía correos.**
5. Correos mágicos, con cualquier dominio, para recorrer los caminos raros:

   | Correo | Qué responde el simulador | Pantalla |
   |---|---|---|
   | `nolink@…` | 201 sin `signingUrl` | `SIGN_LINK_PENDING` y «Enviarme el enlace» |
   | `ratelimit@…` | 429 `VERIFICATION_RATE_LIMITED` | «Ya te enviamos varios códigos…» |
   | `human@…` | 409 `CLIENT_NEEDS_HUMAN` | `HUMAN` |
   | `existing@…` | Tras el código, 409 `CLIENT_NEEDS_HUMAN` con `existing_client` | `EXISTING_CLIENT` (WhatsApp y «Entrar a mi cuenta»; aviso a ventas) |
   | `hasaccount@…` | Tras el código, 409 `CLIENT_NEEDS_HUMAN` con `email_has_account` y `phoneHint: "42"`, salvo que el teléfono termine en 42 | `FIX_CONTACT`; con el teléfono corregido, firma |
   | `hasaccountsame@…` | Tras el código, 409 `email_has_account` con `phoneHint` igual a los 2 últimos dígitos del teléfono escrito | `HUMAN` (y aviso a ventas) |
   | `hasaccountnohint@…` | Tras el código, 409 `email_has_account` sin `phoneHint` | `HUMAN` (y aviso a ventas) |
   | `phoneinuse@…` | Tras el código, 409 `CLIENT_NEEDS_HUMAN` con `phone_in_use`, salvo que el teléfono termine en 77 | `FIX_CONTACT`; con otro teléfono, firma |
   | `returning@…` | Tras el código, 201 con `clientCreated: false` | «Te reconocimos…» |
   | `error@…` | 422 con un código desconocido | `ERROR` con «Reintentar» |
   | `forbidden@…` | 403 `FORBIDDEN` | `UNAVAILABLE_ONLINE` |
   | `slow502@…` | Corta la 1.ª llamada, una sola vez por proceso | `fresh_key`; usa un dominio distinto en cada pasada |

   Un teléfono que no es +1 recibe 400 `unsupported_country`, aunque la ficha ya lo frena antes.
6. Formas de pago simuladas: ver «Formas de pago» arriba (3 opciones en `visa-juvenil-basico`, `taxes`, `llc-florida`).
   El servicio `visa-juvenil-basico` además recibe una pregunta `us_state` y otra `future_event`, solo en el simulador. `MOCK_PLAIN_CATALOG=1` las quita.
7. Para probar el interruptor: `CONTYGO_CHECKOUT_ENABLED=0` y reinicia `npm run dev`.
8. El límite de `/iniciar` es de 10 por hora por IP y vive en memoria. Reinicia el servidor entre pasadas largas.

**Comprobado el 02-10-2026** contra el simulador, en Chromium sin interfaz, a 1440 y a 390 px, según el informe de la etapa de interfaz (`53c1ef9`):
- el camino feliz: selector de estado, fecha futura, teléfono extranjero rechazado, código pegado como «481-920» y firma;
- los caminos `ratelimit@`, `slow502@`, `error@`, `nolink@`, `forbidden@` y `human@`;
- un 502 simulado, que repitió la misma clave;
- un «No» en la primera pregunta;
- el interruptor;
- los precios, con y sin catálogo.

Las capturas quedaron fuera del repositorio. No se pasó axe.

### Ensayo contra el contygo de desarrollo (sin datos reales): receta, aún no ejecutada

1. **Contygo.** Levanta contygo, en la rama del PR, en `http://localhost:3200`, contra su base de desarrollo y con `AI_E2E_STUB=1`.
   - Con eso el correo no sale: el código se escribe en `.e2e-mailbox/outbox.jsonl` de contygo.
   - Antes, comprueba que esa base tiene las migraciones de las preguntas `us_state` y `future_event`, y configura una de cada en un servicio.
2. **Clave.** En el admin local de contygo (`/admin/integraciones`), crea un principal **web** de desarrollo y su clave `cg_live_`.
3. **Landing.** En `.env.local`:

   ```
   CONTYGO_API_BASE=http://localhost:3200/api/integrations/v1
   CONTYGO_API_KEY=<clave cg_live_ de desarrollo>
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
   ```

   Las claves de prueba de Turnstile siempre pasan y valen en localhost. **Nunca en producción:** la secreta acepta cualquier token.
4. **Recorrido** con `npm run dev`: servicio → elegibilidad → ficha → código leído del buzón → 201 → abrir el `signingUrl` (`http://localhost:3200/firma/…`) → gracias → reenvío.
5. **Caminos negativos:**
   - código erróneo;
   - teléfono no +1: error en el campo, sin enviar código;
   - interruptor apagado;
   - un 500 en la 2.ª llamada, que se repite con la misma clave.

**Por qué funciona.** Con `CONTYGO_API_BASE` en un host que no es contygo.app, la landing escribe. Además, un `signingUrl` `http` solo se acepta si la API está en `localhost` o `127.0.0.1` y no estamos en producción. Con `next build` + `next start`, ese enlace termina en `SIGN_LINK_PENDING`.

### Humo en producción (una sola alta real): pendiente

**Antes:**
- El PR de contygo está desplegado y esta rama, mergeada.
- Turnstile, las variables y la clave web están listos (ver el checklist).
- Al abrir la ficha en landing.contygo.app, `/api/contratar/servicio` responde con `checkoutEnabled: true` y un `captchaSiteKey` distinto de `null`. `/api/agent/service-intake` responde 200.
- Se ha hecho un `GET /catalog` de solo lectura para comprobar:
  - que existen los 12 slugs de la landing;
  - que los planes son contratables;
  - qué servicios tienen `us_state` o `future_event`, y la forma real de `minNotice`.

**Durante:**
1. Un alta en landing.contygo.app con un correo nuevo del equipo (un alias) y un teléfono +1 del equipo. **Crea un cliente, un caso y un contrato reales.**
2. En los logs de contygo: 409 → trabajo del correo con 200 («resend: transactional email sent») → 201, sin ningún `VERIFICATION_INVALID`.
3. Comprobar tres cosas:
   - que el correo llega, con la variante web si el PR de contygo ya está desplegado;
   - que se abre la firma;
   - que `/contratar/gracias` muestra el estado.

   Reenvía el enlace una vez.
4. No se paga.

**Después:**
- Cancela el contrato y el caso desde el admin de contygo.
- No reutilices ese correo ni ese teléfono: darían `CLIENT_NEEDS_HUMAN`.

### Clave real (solo lectura)

```
curl -s https://contygo.app/api/integrations/v1/me -H "Authorization: Bearer $CONTYGO_API_KEY"
```

Responde 200 con `"channel":"web"` y la organización UsaLatinoPrime (comprobado el 28-09-2026). `/me` no devuelve las capacidades, así que no confirma que «Contratos» esté encendida. Eso se mira en `/admin/integraciones`.

## RUNBOOK · Apagado de emergencia

**Cuándo:** hay que parar las altas. Por ejemplo, ante un plan o un precio mal configurados, un abuso, un incidente en contygo o un texto legal retirado.

1. **Quitar «Contratos» al principal web en contygo. Efecto inmediato.**
   - Dónde: `/admin/integraciones` → el principal **web** → quitar «Contratos».
   - Desde la petición siguiente, `POST /contracts` responde 403 `FORBIDDEN`.
   - La ficha muestra «La contratación en línea no está disponible en este momento», con WhatsApp.
   - El log de Vercel registra `[contygo:config] contract-1 FORBIDDEN`, o `contract-2` si la persona ya tenía un código.
   - El chat, los precios y los leads siguen funcionando.
2. **Apagar la contratación en la landing: `CONTYGO_CHECKOUT_ENABLED=0` en Vercel y redesplegar.**
   - Va en el proyecto `contygo`, scope Production. La variable solo se aplica a un despliegue nuevo.
   - Desde ese despliegue, `/servicio` devuelve `checkoutEnabled: false` y la ficha ofrece WhatsApp desde el primer momento.
   - `/iniciar` responde `UNAVAILABLE_ONLINE` con el código `CHECKOUT_DISABLED`, sin pasar por el CAPTCHA ni llamar a contygo.
   - **El interruptor no corta `/confirmar` ni `/reenviar`.** Quien ya recibió un código todavía puede canjearlo. Por eso el paso 1 va primero.

**Comprobar:**
- la ficha de cualquier servicio muestra el aviso;
- en los logs de contygo no entran `POST /contracts` nuevos.

**Último recurso:** revocar la clave web en `/admin/integraciones`. Apaga todo, también el chat, que depende del catálogo, y los precios.

**Volver a encender:**
1. Quita la variable, o ponla a `1`, y redespliega.
2. Vuelve a activar «Contratos».
3. Comprueba que la ficha vuelve a cargar los paquetes.

## Checklist

**Lo que prueban el código y los tests** (guía §11 y preparación para producción):

- [x] La clave vive solo en una variable de entorno del servidor, nunca en el navegador ni en git (`.env*` está en `.gitignore`).
- [x] CAPTCHA (Turnstile) y límites propios delante de «Enviar mi código».
  - Test: «CAPTCHA, clave de la UI y límite propio por IP delante del envío del código».
- [x] Texto de aceptación versionado en `consent.textVersion` (`terminos-web-2026-10-03`), en español o inglés según el idioma. `consent.at` nunca va en el futuro (`tests/contygo-api.test.cjs`). El texto sigue pendiente de aprobación legal (abajo).
- [x] 1.ª llamada → código → 2.ª llamada con el mismo cuerpo byte a byte, `verificationId`, código y una clave nueva.
  - Tests de `tests/contygo-contratacion.test.cjs`: «Contratar en dos pasos sin estado…» y «solo se canjea un código con el cuerpo y el sobre que firmó este servidor».
- [x] «Te reconocimos» solo con `clientCreated: false` en el 201 posterior al código; antes del código nada distingue a un cliente, y `CLIENT_NEEDS_HUMAN` usa texto neutro salvo la pista segura de `FIX_CONTACT` (y `HUMAN` si la pista no puede ayudar) (`contygo-contratacion` y `contygo-ui`).
- [x] La `signingUrl` queda fuera de los logs, de `sessionStorage` y del modelo de IA (`browser.ts`, `client.ts`, `tests/contygo-navegador.test.cjs`).
- [x] Claves de idempotencia según la llamada:
  - 1.ª llamada cortada: clave nueva.
  - 2.ª llamada: la misma clave y los mismos bytes ante un corte, un 503, un 500 o `IN_PROGRESS`.
  - 429: sin bucles.
  - Tests B3 y B4 de `tests/contygo-produccion.test.cjs` y `tests/contygo-api.test.cjs`.
- [x] Preguntas `us_state` y `dateMode`; un `kind` desconocido escala (B1).
- [x] Teléfono del contrato solo +1 (B2 y `contygo-ui`).
- [x] `details.fields` se convierte en errores por campo (B3).
- [x] Errores de configuración → `UNAVAILABLE_ONLINE`, con log de formato fijo y aviso sin PII en el lead (B3 y B5).
- [x] Plazo global por petición (B4).
- [x] Los Preview nunca escriben (`VERCEL_ENV`), y existe el interruptor `CONTYGO_CHECKOUT_ENABLED` (B10).
- [x] Precios del catálogo vivo, nunca de listas locales (B7, `contygo-ui` y `contygo-flow`).
- [x] Sin base de datos:
  - el proxy no guarda nada;
  - `/estado` y `/reenviar` solo aceptan el token firmado del contrato;
  - la UI borra su `sessionStorage` al terminar.
- [x] Formas de pago: la ficha pinta `paymentOptions` de contygo, preselecciona la `isDefault`, omite el id cuando es `null` y nunca calcula dinero (`tests/contygo-formas-de-pago.test.cjs`). Depende del PR de contygo que publica el campo.
- [x] CI con tests, tipos y build en cada PR (`.github/workflows/ci.yml`).

**Pendiente.** Nada de esto está hecho:

- [ ] **Prueba real de punta a punta.** Primero el ensayo contra el contygo de desarrollo y después el humo en producción (ver «Cómo probar»). Hasta hoy todo se probó con fetch simulado o con el simulador.
- [x] **Aprobación de `/terminos`, `/privacidad` y del texto de la casilla**: aprobados por el dueño el 2026-10-03 (versión `terminos-web-2026-10-03`). El contacto es solo el WhatsApp único y contygo.app.
- [ ] **Turnstile y variables en Vercel** (proyecto `contygo`, scope Production):
  - un widget de Cloudflare con la acción `contratar` y el hostname de landing.contygo.app;
  - `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `LANDING_TOKEN_SECRET` (48 bytes al azar), `GEMINI_API_KEY` y `NEXT_PUBLIC_SITE_URL`;
  - comprobar que **no** existen `CONTYGO_API_BASE`, `CONTYGO_ALLOW_WRITES`, `SUPABASE_*` ni `ADMIN_PASSWORD`;
  - redesplegar;
  - borrar el proyecto de Vercel duplicado de la landing.
- [ ] **Rotación de la clave web.**
  - En `/admin/integraciones`, confirmar que hay **un solo** principal web.
  - Encendidas: «Contratos», «Catálogo», «Leads» y «Enlaces». Apagados: webhooks y conversaciones.
  - Emitir una clave nueva, ponerla solo en el proyecto `contygo` (Production) y revocar la anterior, que estuvo en dos proyectos.
- [ ] `.env.example` con todas las variables (lo crea el dueño).
- [ ] La forma real de `minNotice` y la revisión de solo lectura del catálogo de producción.
- [ ] El PR de contygo, desplegado (ver «Lo que depende de contygo»).
- [ ] Webhooks, solo si se activan. El receptor ya verifica la firma y la ventana de ±300 s y deduplica por `X-Event-Id`. Hoy están apagados.

## Qué queda fuera del recorrido

- **La entrevista original de Visa Juvenil** vuelve al recorrido desde el 09-10-2026: `/api/agent/service-intake` hace primero sus preguntas (vive en EE. UU., fecha de nacimiento, estado, pruebas y, sin pruebas, testigos; claves `visa.*`) y después las del catálogo, que el contrato exige. Las claves `visa.*` no salen hacia contygo: el contrato y el lead solo envían las del catálogo. Si contygo no dice que no, la orientación final es la original, con las reglas por estado. La ruta antigua `/api/agent/visa-intake` sigue sin usarse.
- **`/servicios/[slug]`** sigue enlazando a `contygo.app/servicios/<slug>` y no llega a esta ficha. **`/[slug]`** (el link de cada servicio, destino de los anuncios) abre desde octubre de 2026 la guía de la landing, que termina en esta ficha; ya no muestra el embudo antiguo.
- **No hay eventos de conversión** (Pixel o CAPI) en el envío del código ni en la firma.
- **Las rutas heredadas de UsaLatinoPrime** (CRM, panel y reseñas) siguen en el código. Sin sus variables quedan apagadas.
