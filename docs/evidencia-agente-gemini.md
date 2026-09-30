# Evidencia — Agente de chat y voz con Gemini

Fecha: 2026-08-06 · Fuentes: documentación oficial de Google (nivel A).

## Decisión

| Función | Modelo | Por qué |
|---|---|---|
| Chat escrito (dudas) | `gemini-3.7-flash` | Último Flash **estable**, con **nivel gratuito**, pensado para texto/agentes. Alternativa más barata: `gemini-3.5-flash-lite` (0,30 $/1M entrada · 2,50 $/1M salida). |
| Llamada de voz en tiempo real | `gemini-3.1-flash-live-preview` (Live API) | Único camino oficial para **voz bidireccional en tiempo real** (audio nativo, interrupciones/barge-in, 70 idiomas incl. español). Estado: **Preview**. Alternativa: `gemini-2.5-flash-native-audio-preview-12-2025`. |

## Arquitectura (según docs)

- La API key **nunca** va al navegador. Chat: ruta de servidor Next.js → Gemini. Voz: el servidor crea un **token efímero** (`authTokens.create`, `uses: 1`, `expireTime` ≤ 30 min, `liveConnectConstraints` fijando modelo y config) y el navegador abre el WebSocket de la Live API con ese token como `apiKey`.
- Audio Live: entrada PCM 16-bit 16 kHz, salida PCM 24 kHz. Sesiones solo-audio limitadas a **15 min**; reconexión con `sessionResumption` cada ~10 min.
- Precio audio (2.5 native audio, referencia): 3 $/1M tokens de audio de entrada · 12 $/1M de salida. Verificar precio de 3.1 Live en la página de precios antes de escalar.

## Fuentes

- Modelos: https://ai.google.dev/gemini-api/docs/models
- Live API: https://ai.google.dev/gemini-api/docs/live · guía: https://ai.google.dev/gemini-api/docs/live-guide
- Tokens efímeros: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
- Precios: https://ai.google.dev/gemini-api/docs/pricing
- SDK JS (`@google/genai`): https://googleapis.github.io/js-genai/

## Apuestas (sin fuente)

- Que el tráfico de TikTok prefiera hablar antes que escribir: **APUESTA**, medir con eventos.
- Llamadas telefónicas reales (PSTN) quedarían para una fase posterior (Twilio u otro); la Live API cubre la "llamada" dentro de la web.
