'use strict';
const $ = id => document.getElementById(id);
const video = $('video');
const seek = $('seek');
const fmt = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const setIcon = (button, icon) => button.querySelector('use').setAttribute('href', `#${icon}`);
const notice = text => { $('video-state').textContent = text; $('video-state').hidden = !text; };
let started = false;

async function playPause() {
  if (!video.paused) { video.pause(); return; }
  if (video.ended) video.currentTime = 0;
  notice('');
  try { await video.play(); }
  catch { notice('No se pudo iniciar el vídeo. Vuelve a pulsar reproducir.'); }
}
$('big-play').addEventListener('click', playPause);
$('play-toggle').addEventListener('click', playPause);
video.addEventListener('click', playPause);
video.addEventListener('play', () => {
  started = true; $('poster-cover').hidden = true;
  setIcon($('play-toggle'), 'pause'); $('play-toggle').setAttribute('aria-label', 'Pausar');
});
video.addEventListener('pause', () => { setIcon($('play-toggle'), 'play'); $('play-toggle').setAttribute('aria-label', 'Reproducir'); });
video.addEventListener('waiting', () => { if (started) notice('Cargando vídeo…'); });
video.addEventListener('playing', () => notice(''));
video.addEventListener('error', () => notice('No pudimos cargar el vídeo. Recarga esta vista para reintentar.'));
video.addEventListener('ended', () => notice('Ya conoces las etapas. Cuando quieras, continúa con ContyGo.'));
video.addEventListener('loadedmetadata', () => { seek.max = String(video.duration); $('total').textContent = fmt(video.duration); });
video.addEventListener('timeupdate', () => {
  seek.value = String(video.currentTime);
  seek.style.setProperty('--progress', `${(video.currentTime / (video.duration || 125)) * 100}%`);
  $('elapsed').textContent = fmt(video.currentTime);
  seek.setAttribute('aria-valuetext', `${fmt(video.currentTime)} de ${fmt(video.duration || 125)}`);
});
seek.addEventListener('input', () => {
  if (video.readyState < 1) { notice('Pulsa reproducir para cargar la guía y poder avanzar.'); seek.value = '0'; return; }
  video.currentTime = Number(seek.value); notice('');
});
$('rewind').addEventListener('click', () => { if (video.readyState >= 1) video.currentTime = Math.max(0, video.currentTime - 10); });
$('sound').addEventListener('click', () => { video.muted = !video.muted; setIcon($('sound'), video.muted ? 'muted' : 'volume'); $('sound').setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar'); });
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('player').requestFullscreen) await $('player').requestFullscreen(); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); }
  catch { notice('Este navegador no permite pantalla completa en esta vista.'); }
});
document.addEventListener('fullscreenchange', () => $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'));

function switchView(view) {
  video.pause();
  $('proposal-view').hidden = view !== 'proposal'; $('references-view').hidden = view !== 'references';
  document.querySelectorAll('.review-header [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  window.scrollTo({top:0,behavior:'instant'});
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
$('close-preview').addEventListener('click', () => { video.pause(); $('cinema').hidden = true; $('reopen').hidden = false; $('open-preview').focus(); });
$('open-preview').addEventListener('click', () => { $('cinema').hidden = false; $('reopen').hidden = true; $('close-preview').focus(); });
$('next-preview').addEventListener('click', () => { video.pause(); $('next-dialog').showModal(); });
$('next-close').addEventListener('click', () => $('next-dialog').close());
$('back-preview').addEventListener('click', () => $('next-dialog').close());
$('next-dialog').addEventListener('click', event => { if (event.target === $('next-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
