# ContyGo · V8 «Lo que nos hace únicos»

Propuesta del 27 de septiembre de 2026, construida a partir de la autocrítica del recorrido V7. Se ve en **`/contygo-app/v8`**. No modifica nada anterior:

- La V6 (`/`, `/contygo-app/v5`), la V7 (`/contygo-app/v7`) y el recorrido compartido (`ServiceCinemaDialog` y `juvenil/*`) siguen funcionando igual.
- La V8 vive en `components/contygo/v8/`.
- La V8 **reutiliza sin tocar**:
  - el motor de conversación (`VisaJuvenilExperience`) y sus API;
  - el catálogo, los entregables y la oferta comercial;
  - `CertificateShowcase`.

## La tesis

ContyGo tiene tres cosas que un competidor típico no puede enseñar juntas, y **todas se pueden comprobar**:

1. **Tecnología propia** que organiza la información y prepara los documentos.
2. **Personas reales** que acompañan.
3. **Un registro oficial**: consultor de inmigración registrado ante la División de Protección al Consumidor de Utah ([Utah Code 13-49](https://le.utah.gov/xcode/Title13/Chapter49/C13-49_1800010118000101.xml), nivel A). Cualquiera puede buscarlo en el [registro público](https://services.commerce.utah.gov/dcp-registrations/).

Además, los **precios están publicados** y **el contrato se lee antes de pagar**. En un sector donde la gente llega con miedo al fraude (USCIS advierte sobre los «notarios»), lo que se puede verificar convence más que cualquier superlativo. Por eso la V8 lleva la prueba al primer pantallazo: el documento del registro y la pantalla real de la plataforma, juntos.

## Sobre «la primera empresa que automatizó los procesos migratorios en EE. UU.»

El propietario lo plantea como su diferencial principal, y la V8 lo tiene preparado. Pero **no se publica sin prueba**. Es una afirmación de superioridad («la primera»), y en EE. UU. la publicidad debe ser veraz y tener respaldo. Si alguien la discute, sin evidencia es insostenible, y en este sector un fallo de credibilidad cuesta muy caro.

- El texto está en `lib/contygo-v8-claims.ts` (`V8_CLAIMS.pioneer`) con `verified: null`.
- Se mostrará sobre el titular en cuanto se rellene `verified` con quién lo confirmó, cuándo y la evidencia: fecha de lanzamiento de la plataforma y comparación documentada.
- **Recomendación:** revisión por un abogado de publicidad antes de activarla. Mientras tanto, «tecnología propia + registro verificable» ya es único y no necesita defensa.
- Lo mismo aplica a «+500 clientes atendidos». El propietario lo confirmó el 14 de septiembre, así que está marcado como verificado y aparece en la franja de cifras. Nunca se presenta como casos aprobados.

## Landing V8

Orden:
1. **Hero:** «La tecnología prepara tu trámite. Nosotros te acompañamos.», con el sello del registro, el documento de Utah y la app real.
2. **Cifras:** 12 servicios con precio, honorarios desde $50, +500 clientes atendidos y 100 % en español.
3. **Lo que nos hace distintos.**
4. **Servicios con «desde $…»** en cada tarjeta y fila.
5. **Así avanzas:** las tres escenas humanas del hero de septiembre.
6. **Registro.**
7. **Todo por escrito:** precio, contrato y garantía.
8. **Preguntas:** se añaden «¿Cuánto cuesta?» y «¿Qué es un consultor registrado?».
9. **Cierre** sobre la escultura de papel.

Criterios:

- **Honestidad como marca.** «Somos consultores, no abogados», en la sección de diferencias y no escondido en el pie. **APUESTA:** decirlo claro genera más confianza que ocultarlo.
- **El hilo verde nace en el sello del registro:** la confianza es el punto de partida. Cruza las tres escenas y termina en la punta del check de la escultura (89 %, 6,3 % de `hero-*.webp`, medido igual en claro y oscuro). Al llegar aparece «La curva es tu historia. El check, tu siguiente paso.». El logo no se duplica.
- **Nada se repite en bucle.** Sólo el scroll mueve el hilo, y las piezas se despliegan una vez al aparecer.
- **Tipografía:** 12 px para etiquetas, 14 px para texto secundario y 16–18 px para lectura. Temas claro y oscuro como en la V7.

## Recorrido V8 (`components/contygo/v8/journey/`)

Resuelve uno por uno los puntos de la autocrítica:

| Problema de la V7 | Solución V8 |
|---|---|
| Espectáculo acumulado, tono de fiesta en temas delicados | Sin cohetes ni avión. La «y» aparece **sólo dos veces**: la escribe un hilo al terminar la guía («Siempre contigo. Paso a paso.») y firma la línea del contrato en «Tu plan». |
| Fondo siempre en movimiento; WCAG 2.2.2 | `ThreadsField`: casi quieto mientras se lee (velocidad 0,1), se mueve 1,8 s sólo al cambiar de paso y **se detiene del todo** con el botón de pausa (preferencia recordada) o con movimiento reducido. No reacciona a la voz. |
| Vídeo sin control | `FilmV8`: reproducir y pausar, retroceder 10 s, línea de tiempo arrastrable, subtítulos y «Ir a las preguntas» / «Ver mi plan» siempre visibles. |
| Nadie sabe cuánto falta | Barra «1 de 4 · La guía» con segmentos que se pueden tocar para ir a cualquier paso. En escritorio, con nombres. |
| El botón del contrato llega tras 4–8 minutos | «Ver precio» / «Precio y contrato» visible desde el primer segundo, y cualquier paso es accesible. |
| Falta precio, alcance y garantía junto al CTA | `PlanV8`: tarjeta de contrato (en escritorio queda fija al hacer scroll) con precio, plan, nota de tasas si el catálogo la indica, «Ir a mi contrato» y «Habla con una persona». Al lado: qué preparamos, cómo empiezas, lo que aportas, ten en cuenta, garantía por escrito y quién responde, con los enlaces al registro. |
| Modo claro de segunda | El recorrido es **siempre «cine»**: marino de marca, que es el tono para el que están hechos los vídeos. Se monta en un portal fuera de la landing, así el tema claro de la página no lo alcanza. |
| Sin medición | `metrics.ts` emite `contygo:journey` y `dataLayer` con el tiempo hasta cada paso, el paso de salida y los clics en contrato y ayuda. **No** llama al Pixel de Meta, para no contaminar la cuenta de anuncios con pruebas locales; se conecta cuando se decida la herramienta. |

Detalles de producto:
- El chat abre con el saludo ya escrito. No arranca una voz sola tras el vídeo, y la voz se incorpora desde la siguiente pregunta.
- El chat se monta dentro del mismo toque que termina la guía, así iOS permite su audio.
- El nombre personaliza el plan («Mariana, este es tu plan.»).
- La guía muestra «en preparación» cuando un servicio no tiene vídeo.

## Comprobaciones

- TypeScript y ESLint (V8) sin errores. `npm test`: 64 de 64 aprobadas.
- `/`, `/contygo-app/v5`, `/contygo-app/v7`, `/contygo-app/v8` y `/contygo-motion/visa-transicion` responden 200.
- Landing a 1440 × 900 y 390 × 664, en claro y en oscuro: el hilo llega al check y los tres pasos se encienden. Sin desbordamiento horizontal.
- Recorrido con **toques táctiles reales emulados** (390 × 664):
  - guía → momento «y» → chat → Apelación respondida → nombre (16 px, sin zoom) → portal → segundo vídeo → plan «Mariana, este es tu plan.»;
  - «Ir a mi contrato» apunta a `contygo.app/servicios/apelacion-bia`.
- La salida del vídeo cabe entera en 1440 × 900, 1280 × 720, 390 × 664 y 375 × 560.
- **No comprobado:** Safari real en iPhone (lo prueba el propietario por la red local), rendimiento en gama baja, lector de pantalla y conversión real.

## Decisiones pendientes del propietario

1. Evidencia y revisión legal de «la primera empresa…» para activar la frase.
2. ¿La V8 sustituye a la raíz `/`? Hoy sigue siendo la V6.
3. Subtítulos `.vtt` del segundo vídeo, Apelación y Reforzamiento.
4. Herramienta de medición: Pixel, GA4 u otra, conectada a `contygo:journey`.
5. Fotos reales del equipo y testimonios con consentimiento, para reforzar «Personas reales».
