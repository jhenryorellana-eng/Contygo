import type { LiveSpeechEvent } from "@/lib/agent/visa-live-config";

/** PCM16 LE → WebAudio. Each event can start playing without waiting for EOF. */
export async function readLiveSpeech(response: Response, context: AudioContext, signal: AbortSignal, onChunk: (audio: AudioBuffer) => void, onTranscript?: (text:string,seconds:number)=>void): Promise<AudioBuffer> {
  const reader=response.body?.getReader();
  if(!reader)throw new Error("Empty live stream");
  const decoder=new TextDecoder();
  const chunks:AudioBuffer[]=[];
  let pending="",samples=0,done=false;
  const abort=()=>{void reader.cancel().catch(()=>undefined);};
  signal.addEventListener("abort",abort,{once:true});
  function event(line:string){
    if(!line.trim())return;
    if(done)throw new Error("Data after live completion");
    const value=JSON.parse(line) as LiveSpeechEvent;
    if(value.type==="error")throw new Error("Live speech unavailable");
    if(value.type==="done"){done=true;return;}
    if(value.type==="text"){if(typeof value.text==="string")onTranscript?.(value.text,samples/24000);return;}
    if(value.type!=="audio"||value.sampleRate!==24000||typeof value.data!=="string"||value.data.length>1_000_000||value.data.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value.data))throw new Error("Invalid live audio");
    const raw=atob(value.data);
    if(raw.length%2)throw new Error("Invalid PCM length");
    if(!raw.length)return;
    samples+=raw.length/2;
    if(samples>24000*90)throw new Error("Live audio too long");
    const audio=context.createBuffer(1,raw.length/2,24000);
    const channel=audio.getChannelData(0);
    for(let i=0;i<channel.length;i++){
      const value=raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8);
      channel[i]=(value>=32768?value-65536:value)/32768;
    }
    chunks.push(audio);onChunk(audio);
  }
  try{
    while(true){
      if(signal.aborted)throw new Error("Speech cancelled");
      const chunk=await reader.read();
      if(signal.aborted)throw new Error("Speech cancelled");
      pending+=chunk.done?decoder.decode():decoder.decode(chunk.value,{stream:true});
      if(pending.length>1_100_000)throw new Error("Live event too large");
      let newline:number;
      while((newline=pending.indexOf("\n"))>=0){event(pending.slice(0,newline));pending=pending.slice(newline+1);}
      if(chunk.done)break;
    }
    if(pending.trim())event(pending);
    if(!done||samples<50)throw new Error("Incomplete live audio");
    const combined=context.createBuffer(1,samples,24000);let offset=0;
    for(const chunk of chunks){combined.getChannelData(0).set(chunk.getChannelData(0),offset);offset+=chunk.length;}
    return combined;
  }catch(error){await reader.cancel().catch(()=>undefined);throw error;}
  finally{signal.removeEventListener("abort",abort);reader.releaseLock();}
}

/** A turn of the call that brings its own voice (lib/agent/voiced-reply.ts): the first line is the turn, the rest is
    the voice of its `speech`, handed on as a stream readLiveSpeech reads. A plain JSON reply has no voice. */
export async function readVoicedReply<T>(response: Response): Promise<{ data: T; voice?: Response }> {
  if (!response.headers.get("content-type")?.includes("application/x-ndjson") || !response.body) return { data: await response.json() as T };
  const reader = response.body.getReader();
  let buffered = new Uint8Array(0);
  try {
    while (true) {
      const newline = buffered.indexOf(10);
      if (newline >= 0) {
        const data = JSON.parse(new TextDecoder().decode(buffered.subarray(0, newline))) as T;
        const rest = buffered.subarray(newline + 1);
        const voice = new ReadableStream<Uint8Array>({
          start(controller) { if (rest.length) controller.enqueue(rest); },
          async pull(controller) { const { done, value } = await reader.read(); if (done) controller.close(); else controller.enqueue(value); },
          cancel(reason) { return reader.cancel(reason); },
        });
        return { data, voice: new Response(voice, { headers: { "Content-Type": "application/x-ndjson" } }) };
      }
      const { done, value } = await reader.read();
      if (done) throw new Error("Incomplete reply");
      const joined = new Uint8Array(buffered.length + value.length);
      joined.set(buffered); joined.set(value, buffered.length);
      buffered = joined;
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
}
