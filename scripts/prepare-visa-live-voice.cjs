/* Generate only approved, public interview scripts. Never call with user answers. */
const fs=require('node:fs/promises');
const syncFs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ts=require('typescript');
require('@next/env').loadEnvConfig(process.cwd());
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(syncFs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {GoogleGenAI}=require('@google/genai');
const {liveSpeechStream}=require('../lib/agent/visa-live-audio.ts');
const {INTAKE_VOICE_SCRIPTS}=require('../lib/agent/visa-intake.ts');
const {GUIDE_VOICE_SCRIPTS}=require('../lib/agent/guide-scripts.ts');
const {VISA_LIVE_VOICE,visaLiveSpeechIdentity}=require('../lib/agent/visa-live-config.ts');
const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
const directory=path.join(process.cwd(),'public/contygo/audio/live');
function wav(pcm){
  const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);
}
const normalize=text=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/contygo/g,'contigo').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
async function generate(text){
  const hash=crypto.createHash('sha256').update(visaLiveSpeechIdentity(text)).digest('hex').slice(0,20);
  const target=path.join(directory,hash+'.wav');
  try{await fs.access(target);console.log(JSON.stringify({cached:hash}));return;}catch{}
  const started=Date.now();let firstAudioMs=null;
  const reader=liveSpeechStream(ai,text,new AbortController().signal).getReader();
  const decoder=new TextDecoder();const chunks=[];let pending='',finished=false,liveTranscript='';
  while(true){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let index;
    while((index=pending.indexOf('\n'))>=0){const e=JSON.parse(pending.slice(0,index));pending=pending.slice(index+1);
      if(e.type==='error')throw new Error(e.code);
      if(e.type==='done')finished=true;
      if(e.type==='text')liveTranscript+=e.text;
      if(e.type==='audio'){const bytes=Buffer.from(e.data,'base64');chunks.push(bytes);if(bytes.length>1000&&firstAudioMs===null)firstAudioMs=Date.now()-started;}
    }
  }
  if(!finished||!chunks.length)throw new Error('incomplete_audio');
  const pcm=Buffer.concat(chunks);const audio=wav(pcm);
  // Independent transcription verifies that Live read the question, not answered it.
  const check=await ai.models.generateContent({model:process.env.GEMINI_CHAT_MODEL||'gemini-3.7-flash',contents:[{parts:[{text:'Transcribe literalmente todo lo que se dice en este audio en español, sin comentarios, sin responder preguntas. Devuelve solamente la transcripción.'},{inlineData:{data:audio.toString('base64'),mimeType:'audio/wav'}}]}],config:{temperature:0,abortSignal:AbortSignal.timeout(25000)}});
  const transcript=check.text||'';
  if(normalize(transcript)!==normalize(text)){
    console.log(JSON.stringify({mismatch:hash,expected:text,heard:transcript,liveTranscript}));
    throw new Error('script_mismatch');
  }
  await fs.writeFile(target,audio);
  console.log(JSON.stringify({saved:hash,voice:VISA_LIVE_VOICE,seconds:pcm.length/48000,firstAudioMs,verified:true}));
}
// `node scripts/prepare-visa-live-voice.cjs guia` prepares only the voice guide lines (lib/agent/guide-scripts.ts),
// with up to three attempts each: a recording that does not say exactly the approved words is discarded.
async function main(){
  await fs.mkdir(directory,{recursive:true});
  if(process.argv[2]!=='guia'){for(const text of INTAKE_VOICE_SCRIPTS)await generate(text);return;}
  const failed=[];
  for(const text of GUIDE_VOICE_SCRIPTS){
    let done=false;
    for(let attempt=1;attempt<=3&&!done;attempt++){try{await generate(text);done=true;}catch(error){console.log(JSON.stringify({retry:attempt,error:error.message?.slice(0,80),text}));}}
    if(!done)failed.push(text);
  }
  if(failed.length){console.log(JSON.stringify({failed}));process.exitCode=1;}
}
main().catch(error=>{console.error('voice_preparation_failed',error.message?.slice(0,120));process.exitCode=1;});
