'use strict';

const app = document.getElementById('app');
const query = new URLSearchParams(window.location.search);
const sheetMode = query.get('sheet') === '1';
if (sheetMode) document.body.classList.add('is-sheet');
let production;
let currentStyle = 0;
let currentVideo = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch (_) { return null; }
}
function action(label, url, primary = false, download = false) {
  const href = safeUrl(url);
  if (!href) return null;
  const anchor = el('a', 'button' + (primary ? ' primary' : ''), label);
  anchor.href = href;
  if (download) anchor.download = '';
  else { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
  return anchor;
}
function mark() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44'); svg.setAttribute('fill', 'none'); svg.setAttribute('aria-hidden', 'true');
  [['M20 26c-3 8-6 11-12 11', 'currentColor'], ['m10 18 11 12L37 8', '#1dce64']].forEach(([d, color]) => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d); path.setAttribute('stroke', color); path.setAttribute('stroke-width', '5'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); svg.append(path);
  });
  return svg;
}
function brand(className) {
  const node = el('span', className); node.append(mark(), document.createTextNode('ContyGo')); return node;
}
function missing(parent, text) {
  parent.dataset.loaded = 'error';
  const message = el('div', 'missing-image', text); message.setAttribute('role', 'img'); message.setAttribute('aria-label', text); parent.append(message);
}
function image(src, alt, host, className = '') {
  const url = safeUrl(src);
  if (!url) { missing(host, 'Imagen pendiente'); return null; }
  const img = el('img', className); img.alt = alt; img.decoding = 'async'; img.loading = sheetMode ? 'eager' : 'lazy';
  host.dataset.loaded = 'pending';
  img.addEventListener('load', () => { host.dataset.loaded = 'ready'; }, { once: true });
  img.addEventListener('error', () => { img.remove(); missing(host, 'Imagen no disponible'); }, { once: true });
  img.src = url; return img;
}
function phone(frame) {
  const requestedZoom = Number(frame.zoom);
  const zoomValue = Number.isFinite(requestedZoom) ? Math.min(2, Math.max(1, requestedZoom)) : 1;
  const position = ['top', 'center', 'bottom'].includes(frame.position) ? frame.position : 'center';
  if (zoomValue >= 1.35) {
    const detail = el('div', 'screen-detail');
    detail.style.setProperty('--zoom', String(zoomValue)); detail.style.setProperty('--position', position);
    // The wide detail already enlarges the screen; additional zoom preserves the focal area.
    detail.style.setProperty('--detail-zoom', String(zoomValue / 1.35));
    const screenshot = image(frame.screen, 'Detalle de una captura real de ContyGo', detail);
    if (screenshot) detail.append(screenshot);
    return detail;
  }
  const scene = el('div', 'phone-scene'); const zoom = el('div', 'phone-zoom');
  zoom.style.setProperty('--zoom', String(zoomValue)); zoom.style.setProperty('--position', position);
  const device = el('div', 'phone'); const screen = el('div', 'phone-screen');
  const screenshot = image(frame.screen, 'Captura real de ContyGo', screen);
  if (screenshot) screen.append(screenshot);
  device.append(screen); zoom.append(device); scene.append(zoom); return scene;
}
function editorialPair(frame) {
  if (frame.kind !== 'type' || !/tarjetas/i.test(frame.motion || '')) return null;
  const parts = String(frame.headline || '').split(/\s*(→|\+)\s*/);
  if (parts.length !== 3 || !parts[0] || !parts[2]) return null;
  const diagram = el('div', 'editorial-pair');
  diagram.setAttribute('role', 'img'); diagram.setAttribute('aria-label', frame.headline);
  [parts[0], parts[2]].forEach((label, index) => {
    if (index) { const connector = el('span', 'pair-connector', parts[1] === '→' ? '↓' : '+'); connector.setAttribute('aria-hidden', 'true'); diagram.append(connector); }
    const card = el('div', 'pair-card'); card.append(el('span', 'pair-number', String(index + 1).padStart(2, '0')), el('strong', '', label)); diagram.append(card);
  });
  return diagram;
}
function frameCard(frame) {
  const card = el('figure', 'frame');
  const kind = ['art', 'ui', 'type'].includes(frame.kind) ? frame.kind : 'type';
  const hasCopy = !!(frame.eyebrow || frame.headline || frame.subline);
  const pair = editorialPair(frame);
  const visual = el('div', 'visual kind-' + kind + (frame.dark ? ' dark' : '') + (hasCopy ? ' has-copy' : '') + (frame.screen && kind === 'type' ? ' has-phone' : '') + (pair ? ' has-diagram' : ''));
  if (kind === 'art') {
    const url = safeUrl(frame.asset);
    if (url) {
      const art = el('div', 'art-image');
      art.style.backgroundImage = 'url(' + JSON.stringify(url) + ')';
      art.style.backgroundPosition = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'][Number.isInteger(frame.cell) && frame.cell >= 0 && frame.cell <= 3 ? frame.cell : 0];
      const probe = image(url, '', visual, 'art-probe');
      if (probe) { probe.setAttribute('aria-hidden', 'true'); art.append(probe); }
      art.setAttribute('role', 'img'); art.setAttribute('aria-label', frame.title || 'Viñeta del storyboard'); visual.append(art);
    } else missing(visual, 'Ilustración pendiente');
  }
  if (kind === 'ui' || (kind === 'type' && frame.screen)) visual.append(phone(frame));
  if (pair) { visual.append(pair); if (frame.subline) visual.append(el('span', 'diagram-subline', frame.subline)); }
  else if (kind === 'type') { const layers = el('div', 'type-layers'); layers.setAttribute('aria-hidden', 'true'); layers.append(el('i'), el('i'), el('i')); visual.append(layers); }
  if (kind !== 'art' || hasCopy) visual.append(brand('frame-brand'));
  if (hasCopy) {
    const copy = el('div', 'frame-copy');
    if (frame.eyebrow) copy.append(el('span', 'frame-eyebrow', frame.eyebrow));
    if (frame.headline && !pair) copy.append(el('strong', 'frame-headline', frame.headline));
    if (frame.subline && !pair) copy.append(el('span', 'frame-subline', frame.subline));
    visual.append(copy);
  }
  const caption = el('figcaption', 'caption'); const line = el('div', 'caption-line');
  line.append(el('span', 'frame-time', frame.time), el('h3', '', frame.title)); caption.append(line, el('p', '', frame.motion));
  if (frame.voiceLine) { const voice = el('p', 'frame-voice'); voice.append(el('span', '', 'VO'), document.createTextNode(frame.voiceLine)); caption.append(voice); }
  caption.append(el('span', 'frame-kind', { ui: 'Captura real', type: 'Gráfica editorial', art: 'Escena dirigida' }[kind]));
  card.append(visual, caption); return card;
}
function frameGrid(board) {
  const grid = el('div', 'frames');
  (board.frames || []).forEach(frame => grid.append(frameCard(frame)));
  return grid;
}
function sheetHeader(style, board) {
  const header = el('header', 'sheet-header');
  const meta = el('p', 'sheet-meta'); meta.append(el('span', '', style.name), el('span', '', board.duration), el('span', '', board.ratio));
  header.append(el('h1', '', board.title), meta); return header;
}
function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo preparar un recurso local.')); reader.readAsDataURL(blob);
  });
}
function waitForImage(img) {
  return new Promise((resolve, reject) => {
    let timer;
    const clear = () => { clearTimeout(timer); img.removeEventListener('load', loaded); img.removeEventListener('error', failed); };
    const loaded = () => { clear(); img.naturalWidth ? resolve() : reject(new Error('Una imagen no pudo decodificarse.')); };
    const failed = () => { clear(); reject(new Error('Una imagen no pudo cargarse para la exportación.')); };
    if (img.complete) { loaded(); return; }
    img.addEventListener('load', loaded, { once: true }); img.addEventListener('error', failed, { once: true });
    timer = setTimeout(() => { clear(); reject(new Error('La imagen tardó demasiado en prepararse. Vuelve a intentarlo.')); }, 30000);
  });
}
async function exportSheet(board) {
  const style = production.styles.find(item => item.boards.some(candidate => candidate.id === board.id));
  if (!style) throw new Error('No se encontró esta plancha.');
  const width = 1200;
  const cssUrl = new URL('./storyboard.css', window.location.href).href;
  const fontUrls = ['/fonts/nunito-latin-variable.woff2', '/fonts/nunito-sans-latin-variable.woff2'].map(path => new URL(path, window.location.href).href);
  const assets = board.frames.flatMap(frame => [frame.asset, frame.screen]).filter(Boolean).map(safeUrl);
  if (assets.some(url => !url || new URL(url).origin !== window.location.origin)) throw new Error('La exportación sólo admite los recursos locales de esta plancha.');
  const allowed = new Set([cssUrl, ...fontUrls, ...assets]);
  const resources = new Map();
  async function localResponse(url) {
    const resolved = new URL(url, window.location.href).href;
    if (new URL(resolved).origin !== window.location.origin || !allowed.has(resolved)) throw new Error('La plancha contiene un recurso que no está autorizado para la exportación local.');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(resolved, { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok || new URL(response.url).origin !== window.location.origin) throw new Error('Falta un recurso local: ' + new URL(resolved).pathname.split('/').pop());
      return response;
    } finally { clearTimeout(timer); }
  }
  function embedded(url) {
    if (url.startsWith('data:')) return Promise.resolve(url);
    const resolved = new URL(url, cssUrl).href;
    if (!resources.has(resolved)) resources.set(resolved, localResponse(resolved).then(response => response.blob()).then(readBlob));
    return resources.get(resolved);
  }
  async function embeddedCss(value) {
    const expression = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g;
    const matches = [...value.matchAll(expression)];
    const replacements = await Promise.all(matches.map(async match => {
      const source = (match[1] || match[2] || match[3] || '').trim();
      return [match[0], 'url("' + await embedded(source) + '")'];
    }));
    let result = value; replacements.forEach(([from, to]) => { result = result.split(from).join(to); }); return result;
  }
  const css = await embeddedCss(await (await localResponse(cssUrl)).text());
  await Promise.all(assets.map(embedded));
  const frame = el('iframe'); frame.className = 'export-layout'; frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true'); frame.title = 'Preparación de la plancha';
  // A separate 1200 px layout also fixes media queries when exporting on a phone.
  frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:1200px;height:1000px;border:0;pointer-events:none;z-index:-1000;';
  document.body.append(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('El navegador no permite preparar la plancha.');
    doc.documentElement.lang = 'es'; doc.documentElement.style.overflow = 'hidden'; doc.body.className = 'is-sheet';
    const styleNode = doc.createElement('style'); styleNode.textContent = css; doc.head.append(styleNode);
    const page = doc.createElement('main'); page.className = 'page'; page.append(sheetHeader(style, board), frameGrid(board));
    // Embed URLs before the offscreen document lays out or requests its images.
    await Promise.all([...page.querySelectorAll('[style]')].map(async node => { node.style.cssText = await embeddedCss(node.style.cssText); }));
    await Promise.all([...page.querySelectorAll('img')].map(async img => {
      img.loading = 'eager'; img.removeAttribute('srcset'); img.src = await embedded(img.src);
    }));
    doc.body.append(page);
    await Promise.all([...page.querySelectorAll('img')].map(waitForImage));
    if (doc.fonts) {
      await Promise.all([doc.fonts.load('800 34px "ContyGo Nunito"'), doc.fonts.load('400 14px "ContyGo Nunito Sans"')]);
      await doc.fonts.ready;
    }
    page.getBoundingClientRect();
    const height = Math.ceil(Math.max(page.scrollHeight, page.getBoundingClientRect().height));
    if (!height || height > 16000) throw new Error('La altura de la plancha no permite esta exportación.');
    const clone = page.cloneNode(true);
    const originals = [page, ...page.querySelectorAll('*')]; const copies = [clone, ...clone.querySelectorAll('*')];
    await Promise.all(originals.map(async (original, index) => {
      const computed = frame.contentWindow.getComputedStyle(original); const copied = copies[index];
      for (let index = 0; index < computed.length; index++) { const property = computed[index]; copied.style.setProperty(property, computed.getPropertyValue(property)); }
      copied.style.animation = 'none'; copied.style.transition = 'none';
      copied.style.cssText = await embeddedCss(copied.style.cssText);
      copied.removeAttribute('id');
    }));
    const svgNs = 'http://www.w3.org/2000/svg'; const htmlNs = 'http://www.w3.org/1999/xhtml';
    const svg = document.createElementNS(svgNs, 'svg'); svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height)); svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const foreign = document.createElementNS(svgNs, 'foreignObject'); foreign.setAttribute('x', '0'); foreign.setAttribute('y', '0'); foreign.setAttribute('width', '100%'); foreign.setAttribute('height', '100%');
    const root = document.createElementNS(htmlNs, 'div'); root.className = 'is-sheet'; root.style.cssText = `width:${width}px;height:${height}px;background:white;overflow:hidden;`;
    const exportStyle = document.createElementNS(htmlNs, 'style'); exportStyle.textContent = css;
    root.append(exportStyle, clone); foreign.append(root); svg.append(foreign);
    const source = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    const raster = new Image(); raster.decoding = 'sync'; raster.src = source; await waitForImage(raster);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d'); if (!context) throw new Error('El navegador no permite crear el PNG.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); context.drawImage(raster, 0, 0);
    const blob = await new Promise((resolve, reject) => {
      try { canvas.toBlob(value => value ? resolve(value) : reject(new Error('El navegador no pudo convertir la plancha a PNG.')), 'image/png'); }
      catch (_) { reject(new Error('El navegador rechazó la rasterización de la plancha.')); }
    });
    canvas.width = 0; canvas.height = 0;
    return { blob, width, height };
  } finally { frame.remove(); }
}
function exportButton(board, status) {
  const button = el('button', 'button primary export-button', 'Exportar PNG'); button.type = 'button';
  button.addEventListener('click', async () => {
    const controls = [...document.querySelectorAll('.style-button, .video-button, .export-button')]; controls.forEach(control => { control.disabled = true; });
    button.textContent = 'Preparando PNG…'; status.textContent = 'Preparando la plancha a 1200 px con imágenes y fuentes locales.'; status.dataset.error = 'false';
    try {
      const result = await exportSheet(board);
      const filename = 'contygo-' + board.id + '-storyboard.png';
      const url = URL.createObjectURL(result.blob); const anchor = el('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      status.textContent = `PNG preparado: ${filename} · ${result.width} × ${result.height} px.`;
    } catch (error) {
      status.dataset.error = 'true'; status.textContent = 'No se pudo exportar. ' + (error instanceof Error ? error.message : 'El navegador rechazó la operación.') + ' Puedes volver a intentarlo.';
    } finally { controls.forEach(control => { control.disabled = false; }); button.textContent = 'Exportar PNG'; }
  });
  return button;
}
function copyAction(text, textElement, status) {
  const button = el('button', 'button', 'Copiar texto'); button.type = 'button';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = 'Texto copiado.';
    } catch (_) {
      if (textElement instanceof HTMLTextAreaElement) { textElement.focus(); textElement.select(); textElement.setSelectionRange(0, textElement.value.length); }
      else { const range = document.createRange(); range.selectNodeContents(textElement); const selection = window.getSelection(); if (selection) { selection.removeAllRanges(); selection.addRange(range); } }
      status.textContent = 'Texto seleccionado. Copia con Ctrl+C, ⌘C o la opción Copiar de tu dispositivo.';
    } finally { button.disabled = false; }
  });
  return button;
}
function statusNode() { const status = el('p', 'copy-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); return status; }
function prompts(board) {
  if (!Array.isArray(board.prompts) || !board.prompts.length) return null;
  const root = el('div', 'prompts'); const details = el('details', 'details');
  details.append(el('summary', '', 'Prompts de esta plancha'));
  const list = el('div', 'prompt-list');
  board.prompts.forEach(prompt => {
    const card = el('section', 'prompt-card'); card.append(el('h3', '', prompt.title), el('p', 'prompt-duration', prompt.duration));
    const area = el('textarea', 'prompt-text'); area.value = prompt.text || ''; area.readOnly = true; area.spellcheck = false; area.setAttribute('aria-label', prompt.title || 'Prompt');
    const status = statusNode(); const actions = el('div', 'copy-actions'); actions.append(copyAction(area.value, area, status)); card.append(area, actions, status); list.append(card);
  });
  details.append(list); root.append(details); return root;
}
function downloadText(text, filename) {
  const button = el('button', 'button', 'Descargar TXT'); button.type = 'button';
  button.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = el('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return button;
}
function voices(data) {
  const section = el('section', 'shared-section'); section.setAttribute('aria-labelledby', 'voices-title'); const title = el('h2', 'section-heading', 'Locuciones'); title.id = 'voices-title'; section.append(title);
  const grid = el('div', 'voice-grid');
  [['service', 'Vídeo 1 · Servicio', 'voice-service.txt'], ['closing', 'Vídeo 2 · Cierre', 'voice-closing.txt']].forEach(([key, label, filename]) => {
    const text = typeof data.voice?.[key] === 'string' ? data.voice[key] : '';
    const card = el('section', 'voice-card'); const content = el('p', 'voice-text', text || 'Locución pendiente.'); card.append(el('h3', '', label), content);
    if (text) { const actions = el('div', 'copy-actions'); const status = statusNode(); actions.append(copyAction(text, content, status), downloadText(text, filename)); card.append(actions, status); }
    grid.append(card);
  });
  section.append(grid); if (data.voice?.direction) section.append(el('p', 'voice-direction', data.voice.direction)); return section;
}
function references(data) {
  if (!Array.isArray(data.references) || !data.references.length) return null;
  const root = el('details', 'details shared-section'); root.append(el('summary', '', 'Referencias de dirección'));
  const grid = el('div', 'reference-grid');
  data.references.forEach(ref => {
    const card = el('article', 'reference'); const visual = el('div', 'reference-image'); const img = image(ref.image, ref.title || 'Referencia visual', visual); if (img) visual.append(img);
    const copy = el('div', 'reference-copy'); copy.append(el('h3', '', ref.title), el('p', '', ref.note));
    const pin = safeUrl(ref.pin); if (pin) { const anchor = el('a', '', 'Ver pin de referencia ↗'); anchor.href = pin; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; copy.append(anchor); }
    card.append(visual, copy); grid.append(card);
  }); root.append(grid); return root;
}
function getCurrent() {
  const style = production.styles[currentStyle];
  const board = style.boards[currentVideo] || style.boards[0]; return { style, board };
}
function updateAddress(board) {
  const url = new URL(window.location.href); url.searchParams.set('board', board.id); window.history.replaceState({}, '', url);
}
function boardPanel() {
  const { style, board } = getCurrent();
  const host = document.getElementById('board-host'); host.replaceChildren();
  document.getElementById('style-description').textContent = style.description || '';
  document.querySelectorAll('.style-button').forEach((button, index) => button.setAttribute('aria-pressed', String(index === currentStyle)));
  const toolbar = el('div', 'board-toolbar'); const selector = el('div', 'video-selector'); selector.setAttribute('role', 'group'); selector.setAttribute('aria-label', 'Seleccionar vídeo');
  style.boards.forEach((item, index) => {
    const button = el('button', 'video-button', 'Vídeo ' + (index + 1) + ' · ' + item.duration); button.type = 'button'; button.setAttribute('aria-pressed', String(item.id === board.id));
    button.addEventListener('click', () => { if (currentVideo === index) return; currentVideo = index; boardPanel(); document.querySelectorAll('.video-button')[index]?.focus({ preventScroll: true }); }); selector.append(button);
  });
  const actions = el('div', 'board-actions');
  const sheet = new URL(window.location.href); sheet.searchParams.set('board', board.id); sheet.searchParams.set('sheet', '1');
  const exportStatus = el('p', 'png-status'); exportStatus.setAttribute('role', 'status'); exportStatus.setAttribute('aria-live', 'polite');
  actions.append(exportButton(board, exportStatus), action('Abrir plancha ↗', sheet.href));
  if (board.available === true && safeUrl(board.download)) actions.append(action('Descargar PNG ↓', board.download, false, true));
  toolbar.append(selector, actions); host.append(toolbar, exportStatus);
  const section = el('section'); section.id = 'board'; section.setAttribute('aria-labelledby', 'board-title');
  const intro = el('div', 'board-intro'); const text = el('div'); const title = el('h2', '', board.title); title.id = 'board-title'; const meta = el('p', 'board-meta'); meta.append(el('span', '', style.name), el('span', '', board.duration), el('span', '', board.ratio)); text.append(title, meta); intro.append(text, el('span', 'board-count', board.frames.length + ' viñetas')); section.append(intro); if (board.note) section.append(el('p', 'board-note', board.note)); section.append(frameGrid(board)); const promptSection = prompts(board); if (promptSection) section.append(promptSection); host.append(section);
  document.getElementById('board-status').textContent = style.name + '. ' + board.title;
  document.title = board.title + ' · ContyGo'; updateAddress(board);
}
function render() {
  app.replaceChildren(); app.setAttribute('aria-busy', 'false');
  if (sheetMode) {
    const { style, board } = getCurrent(); app.append(sheetHeader(style, board), frameGrid(board)); document.title = board.title + ' · ContyGo'; return;
  }
  const topbar = el('header', 'topbar'); topbar.append(brand('brand'), el('span', 'topbar-note', 'ESTUDIO DE STORYBOARDS')); app.append(topbar);
  const masthead = el('section', 'masthead'); masthead.append(el('p', 'eyebrow', 'Tres estilos · dos recorridos'), el('h1', '', production.title), el('p', '', production.subtitle)); app.append(masthead);
  const styleSelector = el('div', 'style-selector'); styleSelector.setAttribute('role', 'group'); styleSelector.setAttribute('aria-label', 'Seleccionar estilo visual');
  production.styles.forEach((style, index) => {
    const button = el('button', 'style-button'); button.type = 'button'; button.append(el('span', 'style-letter', style.id), el('span', 'style-name', style.name)); button.setAttribute('aria-pressed', String(index === currentStyle));
    button.addEventListener('click', () => { if (index === currentStyle) return; currentStyle = index; currentVideo = Math.min(currentVideo, style.boards.length - 1); boardPanel(); }); styleSelector.append(button);
  });
  const description = el('p', 'style-description'); description.id = 'style-description'; const host = el('div'); host.id = 'board-host'; const announcement = el('p', 'sr-only'); announcement.id = 'board-status'; announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite'); app.append(styleSelector, description, announcement, host); boardPanel();
  app.append(voices(production)); const refs = references(production); if (refs) app.append(refs);
  const footer = el('footer', 'footer'); footer.append(el('p', '', 'Esta galería contiene imágenes y storyboards para comparar la dirección visual. No son vídeos finales ni una reproducción de la aplicación.'));
  [['Descargar paquete ZIP ↓', './contygo-storyboards-tres-estilos.zip'], ['Guion y dirección ↗', './guion-y-direccion.md'], ['Guía de montaje ↗', './montaje.md']].forEach(([label, href]) => { const link = el('a', '', label); link.href = href; if(href.endsWith('.zip')) link.download=''; footer.append(link); }); app.append(footer);
}
async function load() {
  app.setAttribute('aria-busy', 'true'); app.replaceChildren(el('p', 'loading', 'Cargando los storyboards…'));
  try {
    const response = await fetch('./data.json', { cache: 'no-store' }); if (!response.ok) throw new Error('Data unavailable');
    const data = await response.json(); if (!data.title || !Array.isArray(data.styles) || !data.styles.length || data.styles.some(style => !Array.isArray(style.boards) || !style.boards.length || style.boards.some(board => !board.id || !Array.isArray(board.frames)))) throw new Error('Invalid data');
    production = data;
    // Style C is immediately reviewable while the art contact sheets are prepared.
    currentStyle = Math.max(0, production.styles.findIndex(style => style.id === 'c')); currentVideo = 0;
    const requested = query.get('board'); production.styles.forEach((style, si) => style.boards.forEach((board, bi) => { if (board.id === requested) { currentStyle = si; currentVideo = bi; } })); render();
  } catch (_) {
    app.setAttribute('aria-busy', 'false'); const error = el('div', 'error'); error.setAttribute('role', 'alert'); error.append(el('p', '', 'Los datos de esta galería todavía no están disponibles o no se pudieron cargar.'));
    const retry = el('button', 'button primary', 'Volver a cargar'); retry.type = 'button'; retry.addEventListener('click', load); error.append(retry); app.replaceChildren(error);
  }
}
load();
