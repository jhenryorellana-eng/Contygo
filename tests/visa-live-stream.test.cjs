const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);
const {liveSpeechStream}=require('../lib/agent/visa-live-audio.ts');
function provider(){
  let callbacks;const sent=[];let closes=0;
  const session={close(){closes++;callbacks.onclose();},sendClientContent(value){sent.push(value);}};
  return {ai:{live:{connect:async(args)=>{callbacks=args.callbacks;return session;}}},get callbacks(){return callbacks;},get closes(){return closes;},sent};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const part={inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(200,16).toString('base64')}};

test('el relay entrega todas las partes y termina la sesión sin guardar respuestas',async()=>{
  const p=provider();const reader=liveSpeechStream(p.ai,'Pregunta pública',new AbortController().signal).getReader();await flush();
  assert.equal(p.sent[0].turnComplete,true);
  p.callbacks.onmessage({serverContent:{modelTurn:{parts:[part,part]},turnComplete:true}});
  const events=[];while(true){const result=await reader.read();if(result.done)break;events.push(JSON.parse(new TextDecoder().decode(result.value)));}
  assert.deepEqual(events.map(e=>e.type),['audio','audio','done']);assert.equal(p.closes,1);
});
test('abortar durante read pendiente lo resuelve y cierra la sesión una sola vez',async()=>{
  const p=provider(),abort=new AbortController();const reader=liveSpeechStream(p.ai,'Hola',abort.signal).getReader();await flush();
  const pending=reader.read();abort.abort();assert.equal((await pending).done,true);assert.equal(p.closes,1);
  p.callbacks.onmessage({serverContent:{modelTurn:{parts:[part]}}});assert.equal((await reader.read()).done,true);
});

test('generationComplete entrega el último audio sin esperar la reproducción supuesta por Gemini',async()=>{
  const p=provider();const reader=liveSpeechStream(p.ai,'Saludo público largo',new AbortController().signal).getReader();await flush();
  p.callbacks.onmessage({serverContent:{modelTurn:{parts:[part,part]},generationComplete:true}});
  const events=[];while(true){const result=await reader.read();if(result.done)break;events.push(JSON.parse(new TextDecoder().decode(result.value)));}
  assert.deepEqual(events.map(e=>e.type),['audio','audio','done']);assert.equal(p.closes,1);
  p.callbacks.onmessage({serverContent:{turnComplete:true}});
  assert.equal((await reader.read()).done,true);assert.equal(p.closes,1);
});

test('generationComplete sin audio no se presenta como locución válida',async()=>{
  const p=provider();const reader=liveSpeechStream(p.ai,'Saludo',new AbortController().signal).getReader();await flush();
  p.callbacks.onmessage({serverContent:{generationComplete:true}});
  assert.deepEqual(JSON.parse(new TextDecoder().decode((await reader.read()).value)),{type:'error',code:'empty_audio'});
  assert.equal((await reader.read()).done,true);assert.equal(p.closes,1);
});
test('cancelar consumidor cierra sesión y EOF prematuro se comunica como error',async()=>{
  let p=provider();let reader=liveSpeechStream(p.ai,'Hola',new AbortController().signal).getReader();await flush();await reader.cancel();assert.equal(p.closes,1);
  p=provider();reader=liveSpeechStream(p.ai,'Hola',new AbortController().signal).getReader();await flush();p.callbacks.onclose();
  assert.equal(JSON.parse(new TextDecoder().decode((await reader.read()).value)).type,'error');assert.equal((await reader.read()).done,true);
});
