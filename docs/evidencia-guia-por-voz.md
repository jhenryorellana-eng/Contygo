# Evidencia · Guía por voz del recorrido y contrato guiado (28-09-2026)

Por qué el recorrido de servicio tiene una guía por voz, cómo está hecha y qué se dejó pendiente.
Los clientes tienen de 40 a 60 años y usan poco la tecnología. El dueño pidió una voz que diga qué
llenar y que señale dónde.

## Fuentes verificadas hoy (nivel A: documentación oficial de Google)

| Afirmación | Fuente |
|---|---|
| `gemini-3.8-live` es el modelo estable y recomendado de la Live API. `gemini-3.1-flash-live-preview` es una vista previa antigua: «We recommend updating to Gemini 3.8 Live» | https://ai.google.dev/gemini-api/docs/models |
| TTS estables: `gemini-3.8-flash-tts` y `gemini-3.8-flash-lite-tts`. `gemini-3.1-flash-tts-preview` es una vista previa antigua | https://ai.google.dev/gemini-api/docs/models |
| La Live API admite llamadas a funciones. El cliente recibe `toolCall` y responde con `sendToolResponse`; no hay respuesta automática | https://ai.google.dev/gemini-api/docs/live-api/tools |
| Llamadas asíncronas (`NON_BLOCKING`, con programación `INTERRUPT` / `WHEN_IDLE` / `SILENT`) en Gemini 3.8 Live; en 3.1 Flash Live solo son secuenciales | https://ai.google.dev/gemini-api/docs/live-api/tools |
| Gemini 3.8 Live: sesiones de 15 min (solo audio), contexto de 128k, transcripción de entrada y salida, 99 idiomas | https://ai.google.dev/gemini-api/docs/live-api/capabilities |
| Para conectar desde el navegador se recomiendan tokens efímeros en vez de la clave | https://ai.google.dev/gemini-api/docs/live |

Comprobado también contra la API real el mismo día (`models.get`): existen `gemini-3.8-live`,
`gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts` y `gemini-3.7-flash` (el chat actual), y se
emitió sin error un token efímero para `gemini-3.8-live` con la configuración de `voice-token`.

## Decisiones

**1. Guía por voz, capa 1 (hecha).**

- **Frases fijas y aprobadas** (`lib/agent/guide-scripts.ts`). Cada tramo señala el campo que se ilumina mientras se dice.
- **Voz grabada de antemano** con la voz del recorrido: `gemini-3.8-live`, «Laomedeia», con `scripts/prepare-visa-live-voice.cjs guia`.
  - Cada grabación se verifica transcribiéndola y comparándola con el texto; si no coincide, se descarta.
  - Suena al instante y sin costo por visita.
- **No manda ningún dato de la persona a la IA.** Es texto fijo.
- **Funciona sin sonido**: la burbuja escribe lo mismo, palabra a palabra.
- **Resaltado aproximado:** la voz no devuelve tiempos por palabra, así que el campo iluminado se calcula por proporción de palabras (APUESTA razonable, igual que la invitación).
- **Dónde:** pantalla de contacto («Para seguir, dinos tu nombre y tu número de contacto»), cada paso del contrato, código y firma.
- **Pantalla de contacto: solo audio (dueño, 29-09).** Conserva su diseño original, con los cohetes, y sin burbuja de texto ni resaltado. La guía solo habla. La burbuja escrita y el resaltado quedan en el contrato.

**2. Contrato guiado (hecho).**

- **Una pregunta por pantalla:** nombre → contacto → dirección → personas → paquete → revisar.
- **Tamaños:** letra de 17-18 px y campos de 60 px.
- **Navegación:** «Continuar» pegado abajo; los errores solo del paso actual; resumen con «Cambiar».
- **Qué no cambia:** la lógica de la API (código por correo, CAPTCHA, firma).

**3. Teléfono con país (hecho).**

- **Estados Unidos (+1) por defecto**, 24 países y selector nativo del celular.
- **Formato del valor:** sale como `+<código><número>`, que `normalizePhone` ya acepta.

**4. Modelos.**

- **Voz en vivo:** `LIVE_MODEL` pasa a `gemini-3.8-live` (en el código y en `.env.local`).
- **Voz de respaldo:** `TTS_MODEL` pasa a `gemini-3.8-flash-tts`.
- **Pendiente en Vercel:** cambiar `GEMINI_LIVE_MODEL` en las variables de producción.

**5. Capa 2: «llenar hablando» (pendiente de decisión del dueño).**

Con Gemini 3.8 Live y llamadas a funciones, la persona hablaría y la IA llamaría funciones de la página:

- `resaltar_campo(campo)`: ilumina un campo;
- `escribir_campo(campo, valor)`: lo llena, y la persona confirma en pantalla;
- `siguiente_paso()`: avanza al paso siguiente.

Es técnicamente posible (fuentes de arriba), pero implica mandar por voz a Google datos personales,
incluidos los de menores. Hace falta decidir, y avisar en pantalla antes de abrir el micrófono.
Recomendación: solo para nombre, dirección y ciudad; el correo se escribe (dictar un correo falla
mucho); siempre con confirmación visible antes de guardar.
