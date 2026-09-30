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
