const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (mod, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    mod._compile(output, filename);
  };
}
require.extensions['.css'] = (mod) => { mod.exports = {}; };

const { SERVICES } = require('../lib/services.ts');
const { CONTYGO_SERVICES } = require('../lib/contygo-catalog.ts');
const { CONTYGO_DELIVERABLES } = require('../lib/contygo-deliverables.ts');
const { getContygoServiceUrl, getSelfServiceUrl, getServicePresentationUrl } = require('../lib/contygo.ts');
const { getServicePresentation } = require('../lib/contygo-presentation.ts');
const ServicePresentation = require('../components/contygo/ServicePresentation.tsx').default;
const DirectContractEntry = require('../components/DirectContractEntry.tsx').default;
const SharedClosing = require('../components/contygo/juvenil/PaperPlaneClosing.tsx').default;
const { getRebuildPlatformFilm, getRebuildServiceFilm } = require('../lib/contygo-rebuild-media.ts');
const { closingScript, closingAction } = require('../components/contygo/juvenil/closingSpeech.ts');
const ResultSlide = require('../components/ResultSlide.tsx').default;
const load = Module._load;
Module._load = function (request, ...args) {
  if (request === 'next/navigation') return { useRouter: () => ({ push() {} }) };
  return load.call(this, request, ...args);
};
const ServiceFunnel = require('../components/ServiceFunnel.tsx').default;
Module._load = load;
const destinations = {
  'visa-juvenil': 'visa-juvenil-basico', 'i-360': 'i-360', 'i-485': 'i-485',
  asilo: 'asilo-politico', 'reforzar-asilo': 'reforzar-asilo', apelacion: 'apelacion',
  'cambio-corte': 'cambio-de-corte', itin: 'itin-number', impuestos: 'taxes',
  'evaluacion-asilo': 'evaluacion-asilo', reapertura: 'reapertura-in-absentia', llc: 'llc-florida',
};

test('los doce servicios usan el cierre aprobado, su nombre, vídeo y destino propio',()=>{
  for(const service of CONTYGO_SERVICES){
    const film=getRebuildPlatformFilm(service.id);
    const markup=renderToStaticMarkup(React.createElement(SharedClosing,{autoPlay:true,service,film,displayName:'Ana'}));
    assert(markup.includes(`data-service-id="${service.id}"`),service.id);
    assert(markup.includes(`href="https://contygo.app/servicios/${destinations[service.id]}"`),service.id);
    assert(markup.includes('Ana, tu próximo paso merece claridad y compañía.'),service.id);
    assert(markup.includes(`src="${film.src}"`),service.id);
    assert(fs.existsSync(path.join(root,'public',film.src)),service.id);
    assert(markup.includes(closingAction(service.id)),service.id);
    assert(!markup.includes('PRUEBA DEL CIERRE'),service.id);
    assert(!markup.includes('Probar solo la transición'),service.id);
    const script=closingScript('Ana',service.id);
    assert.equal(script.match(/Toca /g)?.length,1,service.id);
    if(service.id==='evaluacion-asilo')assert(!script.includes('contrato'),'Evaluación conserva su propio alcance');
  }
});

test('el clip provisional del segundo paso no sustituye los vídeos introductorios aprobados',()=>{
  const intros=['visa-juvenil','apelacion','reforzar-asilo'].map(id=>getRebuildServiceFilm(id).src);
  assert.equal(new Set(intros).size,3);
  for(const id of ['visa-juvenil','apelacion','reforzar-asilo']){
    const intro=getRebuildServiceFilm(id),second=getRebuildPlatformFilm(id);
    assert(fs.existsSync(path.join(root,'public',intro.src)));
    assert.notEqual(intro.src,second.src);
    assert.equal(second.provisional,true);
  }
});

test('los doce servicios públicos enlazan a su ficha específica en ContyGo', () => {
  assert.deepEqual(CONTYGO_SERVICES.map(service => service.id).sort(), Object.keys(destinations).sort());
  for (const [id, slug] of Object.entries(destinations)) {
    assert.equal(getContygoServiceUrl(id), `https://contygo.app/servicios/${slug}`, id);
    assert.equal(getServicePresentationUrl(id), `/servicios/${slug}`, id);
  }
  for (const id of ['unknown', '__proto__', 'constructor', 'toString']) {
    assert.equal(getContygoServiceUrl(id), null);
    assert.equal(getServicePresentationUrl(id), null);
  }
});

test('las nueve rutas de evaluación muestran contratación antes del video y permiten ir a preguntas', () => {
  for (const service of SERVICES) {
    const markup = renderToStaticMarkup(React.createElement(ServiceFunnel, { serviceId: service.id }));
    const href = `https://contygo.app/servicios/${destinations[service.id]}`;
    assert.ok(markup.includes(`href="${href}" target="_blank" rel="noopener noreferrer"`), service.id);
    assert.ok(markup.indexOf('Iniciar contratación') < markup.indexOf('video slide-anim'), service.id);
    assert.ok(markup.includes('Prefiero responder unas preguntas'), service.id);
    const navigation = markup.match(/<nav class="navbar">([\s\S]*?)<\/nav>/)?.[1];
    const nextButton = navigation?.match(/<button[^>]*>Ir a preguntas/);
    assert.ok(nextButton, `Falta la salida directa a preguntas: ${service.id}`);
    assert.ok(!nextButton[0].includes('disabled'), `Video obligatorio: ${service.id}`);
  }
});

test('la entrada directa muestra el nombre y nunca un precio fijo (el precio llega vivo del catálogo)', () => {
  const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  for (const service of CONTYGO_SERVICES) {
    const markup = renderToStaticMarkup(React.createElement(DirectContractEntry, { serviceId: service.id, onChooseQuestions() {} }));
    assert.ok(markup.includes(service.name), service.id);
    assert.ok(!markup.includes(dollars.format(service.price)) && !markup.includes('Desde'), service.id);
    assert.ok(markup.includes('confirma tu correo'), service.id);
    assert.ok(!markup.includes('<form'), service.id);
  }
  assert.equal(renderToStaticMarkup(React.createElement(DirectContractEntry, { serviceId: 'unknown', onChooseQuestions() {} })), '');
});

function render(service, tone) {
  return renderToStaticMarkup(React.createElement(ResultSlide, {
    service, result: { tone, message: 'Resultado de ejemplo' }, answers: {},
    isActive: false, onRestart() {}, onTryOthers() {},
  }));
}

test('los nueve servicios ofrecen su contrato correcto antes de pedir datos de contacto', () => {
  assert.equal(SERVICES.length, 9);
  for (const service of SERVICES) {
    const markup = render(service, 'success');
    const href = `https://contygo.app/servicios/${destinations[service.id]}`;
    assert.ok(destinations[service.id], `Falta un destino para ${service.id}`);
    assert.ok(markup.includes(`href="${href}" target="_blank" rel="noopener noreferrer"`), service.id);
    assert.ok(markup.indexOf('Crear mi contrato') < markup.indexOf('<form'), service.id);
    assert.ok(markup.includes('Prefiero escribir sin dejar mis datos'), 'La asistencia sigue disponible');
  }
});

test('la apelación urgente permite contratar y los resultados pendientes de revisión no ofrecen compra', () => {
  const appeal = SERVICES.find(s => s.id === 'apelacion');
  const urgent = appeal.evaluate({ dias: '20-30' }, appeal);
  assert.equal(urgent.tone, 'urgent');
  assert.ok(render(appeal, urgent.tone).includes('https://contygo.app/servicios/apelacion'));
  for (const service of SERVICES) {
    assert.ok(!render(service, 'contact').includes('Crear mi contrato'));
    assert.ok(render(service, 'contact').includes('Escribirnos por WhatsApp'));
    assert.ok(!render(service, 'denied').includes('Crear mi contrato'));
  }
});

test('un servicio desconocido o un resultado no calificado nunca produce un destino de compra', () => {
  for (const id of ['unknown', '__proto__', 'constructor']) assert.equal(getSelfServiceUrl(id, 'success'), null);
  assert.equal(getSelfServiceUrl('visa-juvenil', 'denied'), null);
  assert.equal(getSelfServiceUrl('i-485', 'contact'), null);
});

test('los doce servicios pasan por presentación antes de enlazar al contrato correcto, sin cuestionario', () => {
  for (const service of CONTYGO_SERVICES) {
    const markup = renderToStaticMarkup(React.createElement(ServicePresentation, { service }));
    const presentation = getServicePresentation(service.id);
    assert.ok(markup.indexOf('Presentación del servicio') < markup.indexOf('Crear mi contrato en ContyGo'), service.id);
    assert.ok(markup.includes(`href="https://contygo.app/servicios/${destinations[service.id]}"`), service.id);
    assert.ok(!markup.includes('<form'), service.id);
    if (presentation) {
      assert.ok(fs.existsSync(path.join(root, 'public', presentation.src)), service.id);
      assert.ok(markup.includes(`src="${presentation.src}"`), service.id);
    } else {
      assert.ok(markup.includes('todavía no está disponible'), service.id);
      assert.ok(!markup.includes('<video'), service.id);
    }
  }
});
