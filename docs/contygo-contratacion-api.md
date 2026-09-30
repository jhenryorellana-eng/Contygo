# ContyGo · Contratación por API desde la landing

La persona contrata dentro del recorrido de cada servicio y firma en contygo. Nuestras rutas de servidor ponen la clave de contygo y crean el contrato por API. Después, la persona ve el enlace de firma.

- **28-09-2026:** primera integración, con la sesión guardada en el servidor.
- **29-09-2026:** pasa al diseño **«sin base de datos»** de la guía (§2 bis). La versión anterior está en `Documents/contygo-archivo-versiones-2026-09-27/contratacion-con-sesion-en-servidor-2026-09-29/`.

**Fuentes (nivel A: la documentación del propio proveedor):**

- **Guía técnica:** «API de contratación de contygo: documentación técnica para la web», estado del 25-09-2026. Se citan sus secciones (§). Copia en `docs/fuentes-contygo/API-contratacion-contygo.2026-09-29.md`.
- **Contrato exacto de cada ruta:** el OpenAPI que está en producción el 29-09-2026, enviado por contygo ese día. Copia en `docs/fuentes-contygo/openapi-motor-de-ventas.2026-09-29.yaml`. Frente a la versión del 28-09 solo cambian dos cosas, y las dos ya están aplicadas:
  - el consentimiento web es válido (`consent.channel: "web"`);
  - `kind` (`yes_no` o `date`) es obligatorio en cada pregunta del catálogo (`required: [id, kind, prompt]`).

  El mismo contrato fija también la `Idempotency-Key` («de 8 a 200 caracteres. Un uuid por intento de venta es lo sensato») y el `externalRef` (de 1 a 200 caracteres).
- **Catálogo real:** `GET /catalog`, leído el 29-09-2026 (solo lectura; 13 servicios). Copia en `scripts/fixtures/contygo-catalog-2026-09-29.json`.
- **Cloudflare Turnstile**, verificado en la web el 28-09-2026:
  - [validación en servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/);
  - [renderizado explícito](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/);
  - [claves de prueba](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

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
| `POST /api/contratar/servicio` | `GET /catalog`, en caché 5 min | Solo el servicio: paquetes, personas y preguntas con su `kind` |
| `POST /api/agent/service-intake` | `GET /catalog` y `POST /eligibility/evaluate` al terminar | Las respuestas viajan en cada turno y vuelven al navegador |
| `POST /api/contratar/lead` | `PUT /leads/{externalRef}` | El veredicto para ventas lo da contygo, no la UI |
| `POST /api/contratar/iniciar` | `POST /eligibility/evaluate` y `POST /contracts` (1.ª llamada) | **CAPTCHA (Turnstile).** Reenvía la clave de la UI. Devuelve `verificationId`, cuerpo y ticket |
| `POST /api/contratar/confirmar` | `POST /contracts` (2.ª llamada) | Solo con un ticket válido. Reenvía la clave de la UI. Con 201, devuelve el token del contrato |
| `POST /api/contratar/estado` | `GET /contracts/{id}` | Solo con el token firmado; si no cuadra, 404. Caché de 60 s |
| `POST /api/contratar/reenviar` | `POST /contracts/{id}/link` | Solo con el token firmado. Reenvía la clave de la UI |
| `POST /api/webhooks/contygo` | — | **Apagada** sin `CONTYGO_WEBHOOK_SECRET` (404) |

Los nombres de las rutas no son los de la tabla de la guía (`/api/contygo/…`), que son un ejemplo. Estado y reenvío van por `POST` con el token en el cuerpo, no en la URL (`?t=…`). Así el token no queda en los registros de peticiones: con él se puede pedir un enlace de firma nuevo.

### El token del contrato, sin base de datos (guía §2 bis)

`contractId + "." + HMAC_SHA256(LANDING_TOKEN_SECRET, contractId)`, en base64url (`lib/contygo-api/tokens.ts`). `/estado` y `/reenviar` recalculan el HMAC; si no coincide, responden 404 sin llamar a contygo.

### El ticket de la verificación (pieza nuestra, misma técnica)

La guía dice que la UI guarda el cuerpo exacto y se lo manda a la ruta de servidor, que «solo añade la clave y reenvía». Sin nada más, `/confirmar` sería un proxy abierto a `POST /contracts`. Cualquiera podría gastar nuestros cupos de contygo: 60 altas con código por hora y 5 llamadas por hora por destino (§8).

- **Qué es:** al enviar el código, el servidor firma `exp.HMAC(secreto, "ticket|exp|verificationId|sha256(cuerpo)")`, que caduca a los 30 minutos (el código vale 15).
- **Qué comprueba `/confirmar`:** solo canjea códigos de altas que pasaron por el CAPTCHA, y con el cuerpo byte a byte igual.
- **Si el ticket falla** (cuerpo cambiado, ticket ajeno o caducado), la UI empieza otra vez por la 1.ª llamada. Es lo que pide la guía cuando la persona corrige un dato tras recibir el código (§4, paso 4).

Así se evita también un fallo real del diseño anterior. Reconstruir el cuerpo en la 2.ª llamada podía cambiar `consent.at` si el reloj del teléfono iba adelantado, y contygo lo habría rechazado como `VERIFICATION_INVALID` («o cambió algún dato del cuerpo», §4).

**`LANDING_TOKEN_SECRET` es obligatorio en producción** (32 caracteres o más). Sin él, `/iniciar` responde 503 **antes** de enviar el código, porque no se podría canjear. En desarrollo, sin secreto propio, se deriva uno de la clave de contygo.

## El recorrido

| Momento | Qué pasa | Llamada a contygo |
|---|---|---|
| El chat se abre (tras el vídeo 1) | El bot hace las preguntas del **catálogo**; cada una dice con `kind` si es de sí/no o de fecha | `GET /catalog` |
| La persona responde | Gemini solo interpreta texto o voz de la pregunta actual | — |
| Última respuesta | contygo evalúa; el navegador guarda respuestas y veredicto | `POST /eligibility/evaluate` con `answers[{questionId, value}]` |
| Pantalla del nombre | Nombre y teléfono, los dos opcionales. Si están los dos, se registra el lead | `PUT /leads/web-<uuid>`, `source: "web"`, URL y UTM |
| Botón «Revisar mi contrato» del cierre | Abre la ficha guiada: nombre, contacto, dirección, personas, paquete y revisar | — |
| «Enviar mi código» | CAPTCHA y límite propio; se repite la elegibilidad, se actualiza el lead y se hace la 1.ª llamada | `POST /contracts` → `409 CLIENT_VERIFICATION_REQUIRED` |
| Código | El **mismo cuerpo** guardado más `verificationId` y `verificationCode`, con una clave nueva por intento | `POST /contracts` → `201` con `signingUrl` |
| Firma | Botón «Firmar mi contrato», que abre contygo | — |
| Después | `/contratar/gracias`: estado y reenvío del enlace | `GET /contracts/{id}` · `POST /contracts/{id}/link` |

Si la elegibilidad es negativa, el recorrido continúa: el segundo vídeo sigue disponible. Al llegar a la ficha se explica que el trámite no aplica y se ofrece un asesor. No se contrata.

## Claves de idempotencia (guía §8 y §10)

La UI genera una clave con `crypto.randomUUID()` para cada intento y la ruta la reenvía tal cual; el servidor solo acepta UUID v4. En la red local (`http://192.168…`), donde `randomUUID` no existe, se genera el mismo UUID v4 con `getRandomValues`.

| Qué pasa | Clave del siguiente intento |
|---|---|
| Corte de red, `IN_PROGRESS` o 503 (`RETRY_LATER`, `busy`) | **La misma**, con el mismo cuerpo: contygo responde lo mismo y no crea nada dos veces |
| Un código nuevo, un reenvío nuevo o «Enviar otro código» | Nueva |
| 429 (`destination`/`general`) | Nueva, y sin bucles: se muestra el mensaje y se respeta `Retry-After` |
| `IDEMPOTENCY_MISMATCH` (`conflict`) | Nueva |

## Archivos

**Servidor** (`lib/contygo-api/`):

- `client.ts`: una función por endpoint. Reintenta con la misma clave, nunca reintenta un 429 y no escribe en contygo desde desarrollo.
- `catalog.ts`: catálogo en caché, casado con la landing por `slug`.
- `checkout.ts`: validación, cuerpo estricto, `kind` de cada pregunta y traducción de cada respuesta a una pantalla.
- `flow.ts`: el alta en dos pasos, sin estado.
- `tokens.ts`: token del contrato y ticket de la verificación.
- `lead.ts`, `server.ts` (origen, lectura acotada, límites en memoria y Turnstile) y `webhook.ts` (HMAC).
- `terms.ts`: texto de aceptación versionado.
- `messages.ts`: textos de la §5.
- `browser.ts`: lo que guarda el navegador.

**Rutas:** `app/api/agent/service-intake`, `app/api/contratar/{servicio,lead,iniciar,confirmar,estado,reenviar}` y `app/api/webhooks/contygo`.

**Interfaz:**

- `components/contygo/contract/ContractCheckout.tsx`: la ficha, el código y la firma. Recibe del recorrido las respuestas, el veredicto, el nombre, el teléfono y el `externalRef`.
- `ContractThanks.tsx` y `app/contratar/gracias`.
- Cambios en `VisaJuvenilExperience`, que genera el `externalRef` al empezar y registra el lead, y en `ServiceCinemaDialog`.

**Pruebas:**

- `tests/contygo-api.test.cjs`, `tests/contygo-contratacion.test.cjs`, `tests/contygo-navegador.test.cjs` y `tests/service-intake.test.cjs`.
- El banco común `tests/helpers/contygo-harness.cjs`.
- El simulador `scripts/contygo-mock-server.cjs`.

Ya no hay base de datos. Se retiraron `store.ts` y `supabase/contygo-contratacion.sql`, que nunca llegó a aplicarse; los dos están en la carpeta de archivo.

## Decisiones

- **La clave solo vive en el servidor** (`CONTYGO_API_KEY`), sin prefijo `NEXT_PUBLIC_`. La API no tiene CORS a propósito (§2).
- **El tipo de cada pregunta lo dice `kind`** (`yes_no` → booleano, `date` → `"YYYY-MM-DD"`, §4 paso 0). Deja de ser una APUESTA.
  - En el OpenAPI de producción es obligatorio.
  - Deducirlo del texto fallaba en el catálogo real: la pregunta de I-485 «¿La fecha de prioridad del I-360 está vigente en el Visa Bulletin (EB-4)?» es de sí/no.
  - El texto solo se usa como defensa, si una respuesta llegara sin `kind`.
- **La `signingUrl` nunca se guarda ni se registra.** Solo viaja en la respuesta al navegador de la persona, y solo si es `https` y de contygo. El modelo de IA solo ve la pregunta y la respuesta de elegibilidad.
- **«¡Ya eres cliente nuestro!» solo aparece con `clientCreated: false`, en el 201 posterior al código.** La 1.ª respuesta es idéntica para cualquiera (§3.3). `CLIENT_NEEDS_HUMAN` usa siempre el mismo texto neutro.
- **Nunca se envían importes.** El cuerpo solo lleva los campos del OpenAPI y un test comprueba las claves.
- **`consent.channel` es siempre `"web"`**, el único valor válido con una clave web (§9).
- **El rol `lead` no se pide.** Lo ocupa el propio cliente (`clientPartyMode` por defecto). Las demás personas salen de `partyRoles`, respetando `isRequired` y `cardinality`.
- **Límites propios, en la memoria de cada instancia:**

  | Acción | Límite |
  |---|---|
  | «Enviar mi código» | 10 por hora por IP, y CAPTCHA en cada envío |
  | Confirmar el código | 30 por hora por IP; 8 cada 15 min por verificación (contygo corta en 5) |
  | Lead | 20 por hora por IP |
  | Estado | 40 cada 10 min por IP; contygo, 1 por minuto por contrato (caché) |
  | Reenvío del enlace | 10 por hora por IP; 3 por hora por contrato (contygo permite 5) |

  Sin base de datos no hay contadores compartidos: en Vercel cada instancia tiene los suyos. Son un freno de buena fe, no un contador exacto. Los frenos duros son el CAPTCHA, el ticket firmado y los límites de contygo.
- **Webhooks: opcionales y apagados** (§2 bis). Sin base de datos no hay nada que actualizar: la página de «gracias» consulta el estado y ventas lo ve todo en contygo.
  - La ruta existe para cuando se quieran métricas.
  - Con `CONTYGO_WEBHOOK_SECRET` verifica la firma sobre el cuerpo crudo y la ventana de ±300 s, deduplica por `X-Event-Id` y registra solo el tipo.
- **Seguro de desarrollo:** fuera de producción, contra el contygo real, solo se lee (catálogo y elegibilidad). Para escribir hay que definir `CONTYGO_ALLOW_WRITES=1`, y solo en la prueba coordinada: en producción **cada alta crea un cliente, un caso y un contrato reales**.

## APUESTAS (sin respaldo todavía)

- **Texto de la casilla de aceptación** (`terms.ts`, versión `terminos-web-2026-09-28`). Es un borrador pendiente de revisión legal. Si cambia una palabra, cambia la versión: un test compara la huella del texto.
- **Duración del ticket (30 min).** Es nuestra. Se basa en que el código vale 15 minutos (§4); si contygo lo alarga, hay que subirla.

## Discrepancias entre la guía y el OpenAPI (para avisar a contygo)

1. **`CONSENT_CHANNEL_MISMATCH`: resuelta.** El OpenAPI de producción (29-09) ya dice que un principal `web` solo puede mandar `"web"`, «la casilla de aceptación de su formulario; desde el 2026-09-25».
2. **`NO_SALES_OWNER`.** La guía dice 409 y el OpenAPI, 422. Se tratan igual.
3. **Límites de alta.** La guía da 60 por hora y 300 al día. El OpenAPI da 30 por minuto y 300 por hora por clave.
4. **Primera llamada.** Según el OpenAPI, un cliente nuevo recibe 201 sin código (así funciona WhatsApp). Según la guía, en la web siempre llega primero el 409. El código acepta los dos casos.
5. **Ruta del enlace de firma.** La guía usa `/firma/…` y el ejemplo del 201 del OpenAPI, `/firmar/…`. No se depende de la ruta; solo se exige `https` y el dominio de contygo.
6. **El catálogo real no trae cuotas** en ningún paquete. La ficha muestra la opción de pago solo si existe.

## Checklist de la guía (§11)

- [x] La clave vive solo en una variable de entorno del servidor, nunca en el navegador ni en git (`.env.local` está en `.gitignore`).
- [x] CAPTCHA (Turnstile) y límites propios delante del botón «Contratar». Los límites son por IP y por verificación, porque sin base de datos no hay sesión.
- [x] Texto de aceptación versionado, en `consent.textVersion`. `consent.at` es el momento en que se marcó la casilla, nunca en el futuro.
- [x] 1.ª llamada → código → 2.ª llamada con el mismo cuerpo, `verificationId`, `verificationCode` y una clave nueva.
- [x] «Ya eres cliente» solo después del código.
- [x] `CLIENT_NEEDS_HUMAN` con el mismo texto neutro.
- [x] La `signingUrl` fuera de logs, de `sessionStorage` y del modelo de IA.
- [x] Ante un corte se repite con la misma clave; ante un 429 se respeta `Retry-After` y no se reintenta en bucle.
- [x] Sin base de datos:
  - el proxy no guarda nada;
  - `/estado` y `/reenviar` solo aceptan el token firmado del contrato;
  - la UI borra su `sessionStorage` al terminar.
- [ ] (Solo si se activan webhooks.) El receptor ya verifica la firma y la ventana de ±300 s y deduplica por `X-Event-Id`. Hoy están apagados.
- [ ] **Prueba completa coordinada con contygo** (alta → código → firma). Está pendiente: necesita la web publicada. En producción **cada alta crea un cliente, un caso y un contrato reales**.

**Variables para producción (Vercel):**

- `CONTYGO_API_KEY`;
- `LANDING_TOKEN_SECRET` (nueva: 32 caracteres o más, al azar);
- `TURNSTILE_SECRET_KEY` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY`;
- `CONTYGO_WEBHOOK_SECRET`, solo si se activan los webhooks.

Ya no hacen falta `CONTYGO_SESSION_STORE`, `CONTYGO_SESSION_SECRET` ni las tablas de Supabase.

## Cómo probar

- **Tests:** `npm test` corre 95 pruebas sin red, con contygo y Turnstile simulados.
- **Recorrido completo sin tocar producción:**
  1. Ejecuta `node scripts/contygo-mock-server.cjs`.
  2. Arranca la web con `CONTYGO_API_BASE=http://127.0.0.1:3999 npm run dev`.
  3. Para ver el CAPTCHA, añade las claves de prueba de Turnstile.
  4. El código válido es `481920`.

  Comprobado el 29-09-2026 en la vista previa de producción, en celular (390×844, claro) y escritorio (1440×900, oscuro):
  - el recorrido: vídeo → preguntas → nombre y teléfono → cierre → ficha → código incorrecto («te quedan 4 intentos») → código correcto → firma → gracias → reenvío;
  - que el simulador recibió claves UUID distintas por intento, el mismo cuerpo en las dos llamadas y el mismo `externalRef` en el lead y en el alta;
  - que no quedaron cookies ni `localStorage`, y que al firmar el navegador borró la ficha;
  - que un token falsificado lleva a «No encontramos un contrato».
- **Clave real:**

  ```
  curl -s https://contygo.app/api/integrations/v1/me -H "Authorization: Bearer $CONTYGO_API_KEY"
  ```

  Responde 200 con `"channel":"web"`, organización UsaLatinoPrime (comprobado el 28-09-2026).

## Qué queda fuera del recorrido

La entrevista anterior de Visa Juvenil (`/api/agent/visa-intake`, `VisaStatePicker` y las reglas por estado) ya no la usa el recorrido. El código sigue en el proyecto y sus tests pasan. Se puede archivar cuando se decida.
