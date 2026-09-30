/* ============================================================
   POST /api/agent/voice-token — token efímero para la llamada de voz
   El navegador abre la Live API de Gemini con este token (un solo uso,
   caduca en minutos); la API key real nunca sale del servidor.
   ============================================================ */
import { Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemInstruction } from "@/lib/agent/prompt";
import { LIVE_MODEL, LIVE_VOICE, agentEnabled, clientIp, getGenAI, rateLimit } from "@/lib/agent/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!agentEnabled) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (!rateLimit(`voice:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  try {
    // Los tokens efímeros viven en la versión v1alpha del SDK.
    const ai = getGenAI("v1alpha");
    const expireTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: buildSystemInstruction("voice"),
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
        lockAdditionalFields: [],
      },
    });

    if (!token.name) {
      return NextResponse.json({ ok: false, error: "no_token" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, token: token.name, model: LIVE_MODEL, expiresAt: expireTime });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
