const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../components/contygo/juvenil/useVisaVoice.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const readerContext={exports:{},TextDecoder,atob};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/contygo/juvenil/liveSpeechReader.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,readerContext);
const flush = () => new Promise(resolve => setImmediate(resolve));
const response = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Deterministic hook/browser doubles: no microphone, network, browser or real timers.
function harness(options = {}) {
  const slots = [], effects = [], contexts = [], requests = [];
  const frames = new Map(), timers = new Map();
  let cursor = 0, mounted = true, staleUpdates = 0, sequence = 0;
  const unchanged = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => {
        if (!mounted) staleUpdates += 1;
        slots[index] = typeof value === 'function' ? value(slots[index]) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || !unchanged(slots[index].deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!slots[index] || !unchanged(slots[index].deps, deps)) {
        const previous = slots[index];
        slots[index] = { deps, cleanup: null };
        effects.push(() => {
          previous?.cleanup?.();
          slots[index].cleanup = callback();
        });
      }
    },
  };
  class AudioContext {
    constructor() {
      this.state = options.state || 'running';
      this.currentTime = 0;
      this.sources = [];
      this.resumeCalls = 0;
      this.decodeCalls = 0;
      contexts.push(this);
    }
    resume() {
      this.resumeCalls += 1;
      if (options.resume) return options.resume(this);
      this.state = 'running';
      return Promise.resolve();
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
    decodeAudioData() {
      this.decodeCalls += 1;
      return options.decode ? options.decode() : Promise.resolve({ duration: 4 });
    }
    createBufferSource() {
      const source = {
        onended: null, connect() {}, disconnect() {},
        start(at) { source.started = true; source.at=at; }, stop() { source.stopped = true; },
      };
      this.sources.push(source);
      return source;
    }
    createBuffer(channels,length,sampleRate){const values=Array.from({length:channels},()=>new Float32Array(length));return{length,sampleRate,numberOfChannels:channels,duration:length/sampleRate,getChannelData:index=>values[index]};}
    createAnalyser() {
      return { fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(values) { values.fill(140); } };
    }
    get destination() { return {}; }
  }
  const context = {
    exports: {},
    require(name) { if(name==='./liveSpeechReader')return readerContext.exports;assert.equal(name, 'react'); return react; },
    window: { AudioContext }, AbortController, ArrayBuffer, Uint8Array,
    fetch(url, init) {
      const request = { url, ...init, text: JSON.parse(init.body).text };
      requests.push(request);
      return new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        Promise.resolve(options.fetch ? options.fetch(request) : response()).then(resolve, reject);
      });
    },
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, ms) { const id = ++sequence; timers.set(id, { callback, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(compiled, context);
  const closingContext={...context,exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/contygo/juvenil/closingSpeech.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,closingContext);
  const render = (warmupText=null) => {
    cursor = 0;
    const value = context.exports.useVisaVoice();
    if(options.closingWarmup)closingContext.exports.useClosingSpeechWarmup(value,warmupText);
    while (effects.length) effects.shift()();
    return value;
  };
  return {
    render, contexts, requests, frames, timers,
    get staleUpdates() { return staleUpdates; },
    unmount() {
      mounted = false;
      slots.forEach(slot => slot?.cleanup?.());
    },
  };
}

test('nombre: agrupa las letras, cancela la preparación anterior y conserva la voz entre pasos',async()=>{
  const pending=deferred();
  const h=harness({closingWarmup:true,fetch:r=>r.text==='An'?pending.promise:response()});
  const runWarmup=()=>{const [id,timer]=[...h.timers].find(([,timer])=>timer.ms===400);h.timers.delete(id);timer.callback();};
  h.render('A');h.render('An');
  assert.equal(h.requests.length,0,'No se genera una voz por cada tecla');
  assert.equal([...h.timers.values()].filter(timer=>timer.ms===400).length,1);
  runWarmup();await flush();assert.equal(h.requests.length,1);
  h.render('Ana');assert.equal(h.requests[0].signal.aborted,true,'No sigue generando el nombre anterior');
  runWarmup();await flush();
  assert.deepEqual(h.requests.map(r=>r.text),['An','Ana']);
  assert.equal(h.contexts[0].sources.length,0,'La precarga durante el chat no habla');
  // Same dialog owner remains mounted while its chat is replaced by video/closing.
  const closing=h.render('Ana');
  const playing=closing.speak('Ana');
  assert.equal(h.contexts[0].sources.length,1,'El audio preparado arranca sin esperar red');
  await playing;assert.equal(h.requests.length,2,'Cambiar de paso no vuelve a generar la voz');
  h.unmount();assert.equal(h.staleUpdates,0);
});

test('cerrar antes del debounce no envía el nombre ni deja temporizadores',async()=>{
  const h=harness({closingWarmup:true});h.render('Ana');h.unmount();await flush();
  assert.equal(h.requests.length,0);assert.equal(h.timers.size,0);
});

test('prefetch deduplica texto, decodifica sin resume y speak usa el audio inmediatamente', async () => {
  const h = harness({ state: 'suspended' });
  const voice = h.render();
  await Promise.all([voice.prefetch(' Hola '), voice.prefetch('Hola')]);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].cache, 'no-store');
  assert.equal(h.contexts[0].decodeCalls, 1);
  assert.equal(h.contexts[0].resumeCalls, 0);
  assert.equal(h.contexts[0].sources.length, 0);
  assert.equal(h.render().status, 'idle');
  assert.equal(h.render().progress, 1);
  h.contexts[0].state = 'running';
  const playing = voice.speak('Hola');
  assert.equal(h.contexts[0].sources[0].started, true, 'cache hit starts without awaiting network');
  await playing;
  assert.equal(h.requests.length, 1);
  h.contexts[0].currentTime = 2;
  h.frames.values().next().value(100);
  assert.equal(h.render().progress, 0.5);
  assert(h.render().level > 0);
  voice.stop();
  await voice.speak('Hola');
  assert.equal(h.requests.length, 1, 'stop keeps the decoded cache');
  h.unmount();
});

test('precargar mientras habla no cambia estado, progreso ni detiene la voz actual', async () => {
  const h = harness();
  const voice = h.render();
  await voice.speak('Actual');
  h.contexts[0].currentTime = 1;
  h.frames.values().next().value(100);
  const before = h.render();
  await voice.prefetch('Siguiente');
  const after = h.render();
  assert.equal(after.status, 'speaking');
  assert.equal(after.progress, before.progress);
  assert.equal(after.level, before.level);
  assert.equal(h.contexts[0].sources.length, 1);
  assert.equal(h.contexts[0].sources[0].stopped, undefined);
  h.unmount();
});

test('speak comparte prefetch pendiente; stop conserva la preparación y evita reproducción tardía', async () => {
  const pending = deferred();
  const h = harness({ fetch: () => pending.promise });
  const voice = h.render();
  const warming = voice.prefetch('Pregunta');
  await flush();
  const playing = voice.speak('Pregunta');
  voice.stop();
  assert.equal(h.requests[0].signal.aborted, false);
  pending.resolve(response());
  await Promise.all([warming, playing]);
  assert.equal(h.requests.length, 1);
  assert.equal(h.contexts[0].sources.length, 0);
  assert.equal(h.render().status, 'idle');
  await voice.speak('Pregunta');
  assert.equal(h.contexts[0].sources.length, 1);
  assert.equal(h.requests.length, 1);
  h.unmount();
});

test('una respuesta nueva cancela la solicitud anterior; repetición pendiente se deduplica', async () => {
  const pending = deferred();
  const h = harness({ fetch: request => request.text === 'Anterior' ? pending.promise : response() });
  const voice = h.render();
  const previous = voice.speak('Anterior');
  await flush();
  const duplicate = voice.speak('Anterior');
  assert.equal(h.requests[0].signal.aborted, false);
  await voice.speak('Actual');
  await Promise.all([previous, duplicate]);
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[0].signal.aborted, true);
  assert.equal(h.contexts[0].sources.length, 1);
  assert.equal(h.render().status, 'speaking');
  h.unmount();
});

test('error de prefetch no modifica UI; speak reintenta y mantiene errores explícitos', async () => {
  let fails = true;
  const h = harness({ fetch: () => fails ? { ok: false } : response() });
  const voice = h.render();
  await voice.prefetch('Reintentar');
  assert.equal(h.render().status, 'idle');
  await voice.speak('Reintentar');
  assert.equal(h.render().status, 'unavailable');
  assert.equal(h.render().progress, 1);
  fails = false;
  await voice.speak('Reintentar');
  assert.equal(h.requests.length, 3);
  assert.equal(h.render().status, 'speaking');
  h.unmount();
});

test('LRU conserva ocho entradas como máximo y no expulsa la solicitud activa', async () => {
  const pending = deferred();
  const h = harness({ fetch: request => request.text === 'Activa' ? pending.promise : response() });
  const voice = h.render();
  const speaking = voice.speak('Activa');
  await flush();
  for (let i = 0; i < 8; i += 1) await voice.prefetch(`Pregunta ${i}`);
  assert.equal(h.requests[0].signal.aborted, false);
  await voice.prefetch('Pregunta 7');
  assert.equal(h.requests.length, 9);
  await voice.prefetch('Pregunta 0');
  assert.equal(h.requests.length, 10, 'oldest unused entry was evicted');
  pending.resolve(response());
  await speaking;
  assert.equal(h.render().status, 'speaking');
  h.unmount();
});

test('desmontar aborta precargas y decodificación tardía sin estados nuevos', async () => {
  const decoding = deferred();
  const network = deferred();
  const h = harness({ decode: () => decoding.promise, fetch: request => request.text === 'Red' ? network.promise : response() });
  const voice = h.render();
  const warm = [voice.prefetch('Decodificar'), voice.prefetch('Red')];
  await flush();
  h.unmount();
  assert(h.requests.every(request => request.signal.aborted));
  assert.equal(h.contexts[0].state, 'closed');
  assert.equal(h.timers.size, 0);
  decoding.resolve({ duration: 4 });
  await Promise.all(warm);
  assert.equal(h.staleUpdates, 0);
  assert.equal(h.contexts[0].sources.length, 0);
});

test('audio cacheado espera resume autorizado y autoplay bloqueado tiene espera acotada', async () => {
  const resuming = deferred();
  const h = harness({ state: 'suspended', resume: () => resuming.promise });
  const voice = h.render();
  await voice.prefetch('Saludo');
  const speaking = voice.speak('Saludo');
  assert.equal(h.render().status, 'loading');
  h.contexts[0].state = 'running';
  resuming.resolve();
  await speaking;
  assert.equal(h.render().status, 'speaking');
  assert.equal(h.requests.length, 1);
  assert.equal(h.timers.size, 0);
  h.unmount();

  const blocked = harness({ state: 'suspended', resume: () => new Promise(() => {}) });
  const blockedVoice = blocked.render();
  await blockedVoice.prefetch('Saludo');
  const attempt = blockedVoice.speak('Saludo');
  const timeout = [...blocked.timers.values()].find(timer => timer.ms === 300);
  assert(timeout);
  timeout.callback();
  await attempt;
  assert.equal(blocked.render().status, 'blocked');
  assert.equal(blocked.render().progress, 1);
  assert.equal(blocked.contexts[0].sources.length, 0);
  blocked.contexts[0].state = 'running';
  await blockedVoice.speak('Saludo');
  assert.equal(blocked.requests.length, 1, 'autoplay failure preserves prepared audio');
  blocked.unmount();
});

function liveResponse(){
  let controller,cancelled=false;
  const body=new ReadableStream({start(value){controller=value;},cancel(){cancelled=true;}});
  const encoder=new TextEncoder();
  return {response:{ok:true,headers:new Headers({'content-type':'application/x-ndjson'}),body},
    event(value){controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'));},
    raw(value){controller.enqueue(encoder.encode(value));}, close(){controller.close();},get cancelled(){return cancelled;}};
}
test('saludo empieza sin esperar al CTA; continúa con pausa natural y gesto en el reloj de audio',async()=>{
  const pending=deferred();let decoded=0,cues=0;
  const buffer=()=>{const pcm=new Float32Array(1000);pcm.fill(.2,100,800);return{duration:1,length:1000,sampleRate:1000,numberOfChannels:1,getChannelData:()=>pcm};};
  const h=harness({decode:()=>++decoded===1?buffer():pending.promise});const voice=h.render();
  const playing=voice.speak('Mensaje',{continuation:'Toca aquí',onContinuation:()=>cues++});
  await flush();assert.equal(h.contexts[0].sources.length,1,'El saludo ya suena mientras se prepara el CTA');
  assert.equal(h.render().status,'speaking');
  pending.resolve(buffer());await playing;
  assert.equal(h.requests.length,2);assert.equal(h.contexts[0].sources.length,2);
  const [first,next]=h.contexts[0].sources;
  assert.equal(first.at,0);
  assert(Math.abs(next.at-first.buffer.duration-.22)<.001,'220 ms de respiración además del margen de los fonemas');
  assert(Math.abs(next.at+.08-.78-.44)<.001,'440 ms entre fin e inicio de voz, sin solapamiento');
  h.contexts[0].currentTime=next.at-.01;h.frames.values().next().value(100);assert.equal(cues,0);
  h.contexts[0].currentTime=next.at+.01;h.frames.values().next().value(200);assert.equal(cues,1);
  h.frames.values().next().value(300);assert.equal(cues,1);assert.equal(h.requests.length,2,'No se pide ni inicia otro audio al llegar al CTA');
  voice.stop();h.unmount();
});
test('cancelar mientras se prepara la segunda voz no permite reproducción tardía',async()=>{
  const pending=deferred();let decoded=0;
  const buffer=()=>({duration:1,length:1000,sampleRate:1000,numberOfChannels:1,getChannelData:()=>new Float32Array(1000).fill(.2)});
  const h=harness({decode:()=>++decoded===1?buffer():pending.promise});const voice=h.render();
  const playing=voice.speak('Mensaje',{continuation:'CTA'});await flush();voice.stop();pending.resolve(buffer());await playing;
  assert.equal(h.contexts[0].sources.length,1);assert(h.contexts[0].sources[0].stopped);assert.equal(h.render().status,'idle');h.unmount();
});
test('eventos de voz comienzan con audio y completan una sola vez; cancelar no llama al cierre',async()=>{
  const h=harness();const voice=h.render();let starts=0,ends=0;
  await voice.speak('Invitación',{onStart:()=>starts++,onComplete:()=>ends++});
  assert.equal(starts,1);assert.equal(ends,0);
  const end=h.contexts[0].sources[0].onended;end();end();
  assert.equal(ends,1,'Una finalización natural no se duplica');
  await voice.speak('Interrumpida',{onStart:()=>starts++,onComplete:()=>ends++});
  const cancelledEnd=h.contexts[0].sources[1].onended;voice.stop();cancelledEnd();
  assert.equal(starts,2);assert.equal(ends,1,'Detener no inicia otra invitación');h.unmount();
});
const pcmEvent=()=>({type:'audio',sampleRate:24000,data:Buffer.alloc(4800,16).toString('base64')});

test('una sola locución conserva la señal del CTA al precargar y no genera una segunda voz',async()=>{
  const live=liveResponse();const h=harness({fetch:()=>live.response});const voice=h.render();let cues=0;
  const script='Tu historia sigue. ContyGo. Toca Revisar mi contrato y descubre cómo vamos a acompañarte.';
  const warming=voice.prefetch(script);await flush();
  live.event(pcmEvent());live.event({type:'text',text:'Tu historia sigue. '});
  live.event(pcmEvent());live.event({type:'text',text:'ContyGo. Toca Revisar mi contrato y descubre cómo vamos a acompañarte.'});
  live.event({type:'done'});live.close();await warming;
  await voice.speak(script,{cuePhrase:'Toca Revisar mi contrato',onCue:()=>cues++});
  assert.equal(h.requests.length,1,'Todo el guion se genera en una única petición');
  assert.equal(h.contexts[0].sources.length,1,'Una misma grabación completa, sin empalmes');
  h.contexts[0].currentTime=.1;h.frames.values().next().value(100);assert.equal(cues,0);
  h.contexts[0].currentTime=.15;h.frames.values().next().value(200);assert.equal(cues,1);
  h.frames.values().next().value(300);assert.equal(cues,1);
  voice.stop();assert(h.contexts[0].sources[0].stopped);h.unmount();
});

test('saludo Live reproduce el primer fragmento aunque el CTA siga pendiente',async()=>{
  const live=liveResponse(),pending=deferred();let finished=0;
  const h=harness({fetch:r=>r.text==='Saludo'?live.response:response(),decode:()=>pending.promise});
  const voice=h.render();const playing=voice.speak('Saludo',{continuation:'CTA',onComplete:()=>finished++});
  await flush();live.event(pcmEvent());await flush();
  assert.equal(h.contexts[0].sources.length,1);
  assert.equal(h.render().status,'speaking');
  live.event({type:'done'});live.close();await flush();
  h.contexts[0].currentTime=.1;h.contexts[0].sources[0].onended();
  assert.equal(finished,0,'El cierre no termina mientras falta programar el CTA');
  pending.resolve(h.contexts[0].createBuffer(1,2400,24000));await playing;
  assert.equal(h.contexts[0].sources.length,2);
  assert.equal(h.contexts[0].sources[1].at,.32);
  h.contexts[0].sources[1].onended();assert.equal(finished,1);h.unmount();
});

test('Live empieza antes de EOF y programa todos los fragmentos contiguos en el reloj de audio',async()=>{
  const live=liveResponse();const h=harness({fetch:()=>live.response});const voice=h.render();
  const playing=voice.speak('Esta es una respuesta en tiempo real.');await flush();
  live.event(pcmEvent());await flush();
  assert.equal(h.render().status,'speaking');
  assert.equal(h.contexts[0].sources.length,1,'No espera a turnComplete ni a EOF');
  live.event(pcmEvent());await flush();
  assert.equal(h.contexts[0].sources[1].at,.1,'Segundo fragmento continúa el primero');
  live.event({type:'done'});live.close();await playing;
  assert.equal(h.render().status,'speaking','EOF no corta audio aún encolado');
  h.contexts[0].sources[0].onended();assert.equal(h.render().status,'speaking');
  h.contexts[0].sources[1].onended();assert.equal(h.render().status,'idle');
  assert.equal(h.render().progress,1);h.unmount();
});

test('un clic nuevo detiene cada fuente Live y cancela la lectura anterior',async()=>{
  const live=liveResponse();const h=harness({fetch:r=>r.text==='Anterior'?live.response:response()});const voice=h.render();
  const previous=voice.speak('Anterior');await flush();live.event(pcmEvent());live.event(pcmEvent());await flush();
  await voice.speak('Actual');await previous;
  assert(live.cancelled);assert.equal(h.contexts[0].sources.length,3);
  assert(h.contexts[0].sources.slice(0,2).every(source=>source.stopped&&source.onended===null));
  assert.equal(h.contexts[0].sources[2].stopped,undefined);assert.equal(h.render().status,'speaking');h.unmount();
});

test('Live conserva eventos divididos entre paquetes y rechaza audio truncado',async()=>{
  const live=liveResponse();const h=harness({fetch:()=>live.response});const voice=h.render();
  const playing=voice.speak('Hola');await flush();
  const encoded=JSON.stringify(pcmEvent())+'\n';live.raw(encoded.slice(0,37));await flush();assert.equal(h.contexts[0].sources.length,0);
  live.raw(encoded.slice(37));await flush();assert.equal(h.contexts[0].sources.length,1);
  live.close();await playing;assert.equal(h.render().status,'unavailable');assert(h.contexts[0].sources[0].stopped);h.unmount();
});

test('Live silenciar o desmontar no permite fragmentos tardíos ni actualizaciones fuera del chat',async()=>{
  for(const action of ['mute','unmount']){
    const live=liveResponse();const h=harness({fetch:()=>live.response});const voice=h.render();
    const playing=voice.speak('Una pregunta');await flush();live.event(pcmEvent());await flush();
    if(action==='mute')voice.toggleMute();else h.unmount();
    await playing;assert(live.cancelled);assert(h.contexts[0].sources[0].stopped);assert.equal(h.staleUpdates,0);
    if(action==='mute'){assert.equal(h.render().muted,true);assert.equal(h.render().status,'idle');h.unmount();}
  }
});
