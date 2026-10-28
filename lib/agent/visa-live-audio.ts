import { Modality, type GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { VISA_LIVE_INSTRUCTION, VISA_LIVE_MODEL, VISA_LIVE_VOICE, type LiveSpeechEvent } from "./visa-live-config";

/** A Live session that connects before its text is known: connecting takes ~1.6 s, so a turn of the call opens it while
    the reply is still being worked out (25-10-2026, lib/agent/voiced-reply.ts). Unused, close() lets it go. */
export function preconnectLiveSpeech(ai: GoogleGenAI) {
  let onMessage: ((message: LiveServerMessage) => void) | null = null;
  let onFailure: ((code: string) => void) | null = null;
  let failure: string | null = null;
  let released = false;
  const fail = (code: string) => { failure ??= code; onFailure?.(code); };
  const connecting: Promise<Session> = ai.live.connect({
    model: VISA_LIVE_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VISA_LIVE_VOICE } } },
      systemInstruction: VISA_LIVE_INSTRUCTION,
    },
    callbacks: {
      onmessage: message => onMessage?.(message),
      onerror: () => fail("live_unavailable"),
      onclose: () => fail("live_disconnected"),
    },
  });
  connecting.catch(() => fail("live_unavailable"));
  const close = () => {
    if (released) return;
    released = true;
    connecting.then(session => session.close(), () => undefined);
  };

  /** Node relay: delivers every PCM part immediately, never accumulates an entire turn. `head`, when given, goes first
      as its own line (the reply this speech belongs to). */
  function stream(text: string, signal: AbortSignal, head?: unknown): ReadableStream<Uint8Array> {
    let closed = false;
    let bytes = 0;
    let timer: ReturnType<typeof setTimeout>;
    let totalTimer: ReturnType<typeof setTimeout>;
    let cancel = () => {};
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        const line = (value: unknown) => { if (!closed) controller.enqueue(encoder.encode(JSON.stringify(value) + "\n")); };
        const emit = (event: LiveSpeechEvent) => line(event);
        const end = (error?: string, cancelled = false, closeController = true) => {
          if (closed) return;
          if (!cancelled) emit(error ? { type: "error", code: error } : { type: "done" });
          closed = true;
          onMessage = null; onFailure = null;
          clearTimeout(timer); clearTimeout(totalTimer);
          signal.removeEventListener("abort", abort);
          if (closeController) controller.close();
          close();
        };
        const abort = () => end(undefined, true);
        cancel = () => end(undefined, true, false);
        if (head !== undefined) line(head);
        if (signal.aborted || released) { closed = true; controller.close(); close(); return; }
        if (failure) { end(failure); return; }
        signal.addEventListener("abort", abort, { once: true });
        timer = setTimeout(() => end("live_timeout"), 15_000);
        totalTimer = setTimeout(() => end("live_timeout"), 60_000);
        onFailure = code => end(code);
        onMessage = message => {
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
        };
        connecting.then(session => {
          if (closed) return;
          session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: JSON.stringify({ texto_a_leer: text }) }] }],
            turnComplete: true,
          });
        }, () => end("live_unavailable"));
      },
      cancel() { cancel(); },
    });
  }

  return { stream, close };
}

/** Speech for a text already known (/api/agent/visa-live-speech). */
export function liveSpeechStream(ai: GoogleGenAI, text: string, signal: AbortSignal): ReadableStream<Uint8Array> {
  return preconnectLiveSpeech(ai).stream(text, signal);
}
