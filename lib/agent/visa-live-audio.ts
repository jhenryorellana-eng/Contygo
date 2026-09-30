import { Modality, type GoogleGenAI, type Session } from "@google/genai";
import { VISA_LIVE_INSTRUCTION, VISA_LIVE_MODEL, VISA_LIVE_VOICE, type LiveSpeechEvent } from "./visa-live-config";

/** Node relay: delivers every PCM part immediately, never accumulates an entire turn. */
export function liveSpeechStream(ai: GoogleGenAI, text: string, signal: AbortSignal): ReadableStream<Uint8Array> {
  let session: Session | undefined;
  let closed = false;
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout>;
  let totalTimer: ReturnType<typeof setTimeout>;
  let cancel = () => {};
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: LiveSpeechEvent) => { if (!closed) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
      const end = (error?: string, cancelled = false, closeController = true) => {
        if (closed) return;
        if (!cancelled) emit(error ? { type: "error", code: error } : { type: "done" });
        closed = true;
        clearTimeout(timer); clearTimeout(totalTimer);
        signal.removeEventListener("abort", abort);
        if (closeController) controller.close();
        session?.close();
      };
      const abort = () => end(undefined, true);
      cancel = () => end(undefined, true, false);
      if (signal.aborted) { closed = true; controller.close(); return; }
      signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => end("live_timeout"), 15_000);
      totalTimer = setTimeout(() => end("live_timeout"), 60_000);
      void ai.live.connect({
        model: VISA_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VISA_LIVE_VOICE } } },
          systemInstruction: VISA_LIVE_INSTRUCTION,
        },
        callbacks: {
          onmessage(message) {
            if (closed) return;
            const content = message.serverContent;
            // 3.8 can deliver multiple parts in one message. Never use only parts[0].
            for (const part of content?.modelTurn?.parts ?? []) {
              if (!part.inlineData?.data || part.thought) continue;
              const { data, mimeType } = part.inlineData;
              const mime = mimeType?.toLowerCase().replace(/\s/g, "") ?? "";
              if (!/^audio\/(?:pcm|l16);/.test(mime) || !/(?:^|;)rate=24000(?:;|$)/.test(mime) ||
                  /(?:^|;)channels=(?!1(?:;|$))/.test(mime) || data.length > 1_000_000 ||
                  data.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) { end("invalid_audio"); return; }
              const pcm = Buffer.from(data, "base64");
              bytes += pcm.length;
              if (pcm.length % 2 || pcm.toString("base64") !== data || bytes > 24_000 * 2 * 90) { end("invalid_audio"); return; }
              emit({ type: "audio", data, sampleRate: 24000 });
              clearTimeout(timer);
              timer = setTimeout(() => end("live_timeout"), 10_000);
            }
            if (content?.outputTranscription?.text) emit({ type: "text", text: content.outputTranscription.text });
            if (content?.interrupted) { end("live_interrupted"); return; }
            // One-shot speech is complete once all content is generated. Live can
            // postpone turnComplete until presumed playback ends; waiting for it
            // caused false idle timeouts on longer greetings. Web Audio owns playback.
            if (content?.generationComplete || content?.turnComplete) end(bytes > 100 ? undefined : "empty_audio");
          },
          onerror: () => end("live_unavailable"),
          onclose: () => { if (!closed) end("live_disconnected"); },
        },
      }).then(connected => {
        session = connected;
        if (closed) { connected.close(); return; }
        connected.sendClientContent({
          turns: [{ role: "user", parts: [{ text: JSON.stringify({ texto_a_leer: text }) }] }],
          turnComplete: true,
        });
      }).catch(() => end("live_unavailable"));
    },
    cancel() { cancel(); },
  });
}
