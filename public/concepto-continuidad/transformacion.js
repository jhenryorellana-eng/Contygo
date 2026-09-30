(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const journey = $('.journey');
  const scene = $('.scene');
  const canvas = $('.canvas');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const phoneMedia = matchMedia('(max-width:760px)');
  const shortMedia = matchMedia('(max-height:740px)');
  const desktopShort = matchMedia('(max-height:800px)');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  let timeline, trigger, active = -1, frame = 0, pointerFrame = 0;
  let visible = false, observer;
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const progress = () => clamp(-journey.getBoundingClientRect().top / Math.max(1, journey.offsetHeight - innerHeight));

  function accessible(p) {
    $('.morph').classList.toggle('is-arrived', p > .89);
    const index = p < .235 ? 0 : p < .68 ? 1 : 2;
    // Controls become reachable only while their visual state is available.
    [['.evaluation', p < .20], ['.morph', p >= .255 && p < .555],
      ['.advisor', p >= .29 && p < .54], ['.closing', p >= .85]].forEach(([selector, show]) => {
      const element = $(selector);
      element.inert = !show;
      element.setAttribute('aria-hidden', String(!show));
    });
    if (index === active) return;
    active = index;
    $$('.copy').forEach((element, i) => element.setAttribute('aria-hidden', String(i !== index)));
    $$('.progress button').forEach((element, i) => {
      if (i === index) element.setAttribute('aria-current', 'step');
      else element.removeAttribute('aria-current');
    });
  }

  function connectRoutes() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const center = width / 2;
    const worldY = $('.world').offsetTop;
    const css = getComputedStyle(document.documentElement);
    const halfHeight = parseFloat(css.getPropertyValue('--choice-h')) / 2;
    const routeY = phoneMedia.matches ? (shortMedia.matches ? 80 : 89) : 0;
    $('.trail').setAttribute('viewBox', `0 0 ${width} ${height}`);
    const paths = $$('.trail path');
    if (phoneMedia.matches) {
      const left = 16;
      const from = worldY - routeY - halfHeight - 31;
      paths[0].setAttribute('d', `M${center} ${from}H${left + 12}Q${left} ${from} ${left} ${from + 12}V${worldY - routeY - 12}Q${left} ${worldY - routeY} 24 ${worldY - routeY}`);
      paths[1].setAttribute('d', `M${left} ${from + 12}V${worldY + routeY - 12}Q${left} ${worldY + routeY} 24 ${worldY + routeY}`);
    } else {
      const top = worldY - halfHeight - 98;
      const joint = top + 45;
      [-1, 1].forEach((direction, i) => {
        const endX = center + direction * 172;
        paths[i].setAttribute('d', `M${center} ${top}V${joint - 12}Q${center} ${joint} ${center + direction * 16} ${joint}H${endX - direction * 16}Q${endX} ${joint} ${endX} ${joint + 16}V${worldY - halfHeight - 3}`);
      });
    }
  }

  function clean() {
    trigger?.kill();
    timeline?.kill();
    active = -1;
  }

  function basic() {
    const p = progress(), index = p < .235 ? 0 : p < .68 ? 1 : 2;
    accessible(p);
    $$('.copy').forEach((element, i) => {
      element.style.opacity = i === index ? '1' : '0';
      element.style.visibility = i === index ? 'visible' : 'hidden';
    });
    [['.evaluation', index === 0], ['.morph', index > 0], ['.advisor', index === 1],
      ['.closing', index === 2], ['.studio', index === 2], ['.wordmark', index === 2]].forEach(([selector, show]) => {
      $(selector).style.opacity = show ? '1' : '0';
      $(selector).style.visibility = show ? 'visible' : 'hidden';
    });
    const morph = $('.morph');
    morph.style.width = index === 2 ? 'var(--phone-w)' : 'var(--choice-w)';
    morph.style.height = index === 2 ? 'var(--phone-h)' : 'var(--choice-h)';
    morph.style.transform = index === 2 ? 'translate(-50%,-50%)' : '';
    ['.metal', '.phoneInterior'].forEach((selector) => $(selector).style.opacity = index === 2 ? '1' : '0');
    $('.choiceSummary').style.opacity = index === 1 ? '1' : '0';
    $('.studio').style.clipPath = 'none';
    canvas.style.setProperty('--progress', `${p * 100}%`);
  }

  function setup() {
    clean();
    connectRoutes();
    if (reduced.matches) {
      if (window.gsap) gsap.set('.copy,.evaluation,.morph,.advisor,.closing,.studio,.wordmark,.phoneInterior,.metal,.choiceSummary,.choicesNote,.trail,.floor,.scrollPrompt,.handoffBrand,.deviceRim,.phoneBar,.welcome,.address', { clearProps: 'all' });
      accessible(0);
      return;
    }
    if (!window.gsap || !window.ScrollTrigger) { basic(); return; }
    gsap.registerPlugin(ScrollTrigger);
    const css = getComputedStyle(document.documentElement);
    const isPhone = phoneMedia.matches;
    const routeX = isPhone ? 0 : 172;
    const routeY = isPhone ? (shortMedia.matches ? -80 : -89) : 0;
    const width = parseFloat(css.getPropertyValue('--phone-w'));
    const height = parseFloat(css.getPropertyValue('--phone-h'));
    const finalScale = isPhone ? (innerWidth > 360 && !shortMedia.matches ? 1.045 : 1) : .93;
    const endGeometry = () => {
      const copy = $('[data-copy="2"]');
      const top = copy.offsetTop + copy.offsetHeight;
      const bottom = $('.closing').offsetTop;
      return {
        scale: Math.min(finalScale, Math.max(.45, (bottom - top - 34) / height)),
        y: (top + bottom) / 2 - $('.world').offsetTop,
      };
    };
    gsap.set('.copy', { autoAlpha: 0, y: 0 });
    gsap.set('[data-copy="0"]', { autoAlpha: 1 });
    gsap.set('.evaluation', { autoAlpha: 1, xPercent: -50, yPercent: -50, x: 0, y: isPhone ? -17 : -10, scale: 1, rotationX: 0, transformPerspective: 1300 });
    gsap.set('.morph', { autoAlpha: 0, xPercent: -50, yPercent: -50, x: -routeX, y: routeY, width: isPhone ? 'calc(100vw - 48px)' : '306px', height: css.getPropertyValue('--choice-h'), borderRadius: 22, rotationY: 0, rotationZ: 0, scale: 1, transformPerspective: 1300 });
    gsap.set('.advisor', { autoAlpha: 0, xPercent: -50, yPercent: -50, x: routeX, y: -routeY, scale: 1 });
    gsap.set('.metal,.phoneInterior,.choicesNote,.trail,.wordmark,.floor,.closing,.handoffBrand,.deviceRim', { autoAlpha: 0 });
    gsap.set('.choiceSummary', { autoAlpha: 1, scale: 1 });
    gsap.set('.handoffBrand', { y: 0, scale: .92 });
    gsap.set('.phoneBar,.welcome,.address', { autoAlpha: 0, y: 8 });
    gsap.set('.trail path', { strokeDashoffset: 1 });
    gsap.set('.studio', { opacity: 0, clipPath: 'ellipse(8% 14% at 50% 56%)' });
    gsap.set('.wordmark', { yPercent: -50, xPercent: -50, x: 0, y: 0, clipPath: 'inset(100% 0 0 0)' });
    gsap.set('.closing', { y: 10 });
    gsap.set('.scrollPrompt', { autoAlpha: 1 });
    gsap.set('.horizon,.ambient', { opacity: 1 });

    timeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
    timeline
      .to('.evaluation', { autoAlpha: 0, scale: .94, y: -28, rotationX: 9, duration: .08 }, .16)
      .to('[data-copy="0"]', { autoAlpha: 0, y: -9, duration: .03 }, .185)
      .fromTo('[data-copy="1"]', { autoAlpha: 0, y: 9 }, { autoAlpha: 1, y: 0, duration: .035 }, .22)
      .to('.trail', { autoAlpha: 1, duration: .025 }, .23)
      .to('.trail path', { strokeDashoffset: 0, duration: .10, stagger: .012 }, .23)
      .to('.morph', { autoAlpha: 1, duration: .065 }, .255)
      .to('.advisor', { autoAlpha: 1, duration: .065 }, .285)
      .to('.choicesNote', { autoAlpha: 1, duration: .06 }, .31)
      .to('.scrollPrompt', { autoAlpha: 0, duration: .045 }, .48)
      .to('.choicesNote,.trail', { autoAlpha: 0, duration: .065 }, .49)
      .to('.advisor', { autoAlpha: 0, x: isPhone ? 34 : 206, scale: .96, duration: .10 }, .51)
      .to('.choiceSummary', { autoAlpha: 0, scale: .94, duration: .05 }, .54)
      .to('.handoffBrand', { autoAlpha: 1, scale: 1, duration: .045 }, .57)
      .to('.morph', { x: 0, y: 0, width, height, borderRadius: isPhone ? 37 : 46, rotationY: -10, rotationZ: -2.5, duration: .235 }, .55)
      .to('.metal', { autoAlpha: 1, duration: .10 }, .58)
      .to('.phoneInterior', { autoAlpha: 1, duration: .07 }, .615)
      .to('[data-copy="1"]', { autoAlpha: 0, y: -9, duration: .035 }, .635)
      .fromTo('[data-copy="2"]', { autoAlpha: 0, y: 9 }, { autoAlpha: 1, y: 0, duration: .04 }, .675)
      .to('.studio', { opacity: 1, clipPath: 'ellipse(90% 95% at 50% 56%)', duration: .255 }, .615)
      .to('.horizon,.ambient', { opacity: 0, duration: .15 }, .665)
      .to('.handoffBrand', { autoAlpha: 0, y: -35, scale: .85, duration: .055 }, .725)
      .to('.phoneBar,.welcome,.address', { autoAlpha: 1, y: 0, duration: .065, stagger: .006 }, .77)
      .to('.morph', { rotationY: 0, rotationZ: 0, scale: () => endGeometry().scale, y: () => endGeometry().y, duration: .13 }, .78)
      .to('.deviceRim', { autoAlpha: 1, duration: .12 }, .77)
      .to('.wordmark', { autoAlpha: 1, clipPath: 'inset(0% 0 0 0)', duration: .15 }, .76)
      .to('.floor', { autoAlpha: 1, duration: .13 }, .77)
      .to('.closing', { autoAlpha: 1, y: 0, duration: .075 }, .85)
      .to({}, { duration: .075 }, .925);
    trigger = ScrollTrigger.create({
      trigger: journey, start: 'top top',
      end: () => '+=' + (journey.offsetHeight - innerHeight), animation: timeline,
      scrub: .4, invalidateOnRefresh: true, onRefresh: connectRoutes,
      onUpdate: (self) => {
        accessible(self.progress);
        canvas.style.setProperty('--progress', `${self.progress * 100}%`);
      }
    });
    accessible(progress());
  }

  $$('[data-jump]').forEach((button) => button.addEventListener('click', () => {
    const y = scrollY + journey.getBoundingClientRect().top + (journey.offsetHeight - innerHeight) * Number(button.dataset.jump);
    window.scrollTo({ top: y, behavior: reduced.matches ? 'instant' : 'smooth' });
  }));
  $$('.answers button').forEach((button) => button.addEventListener('click', () => {
    $$('.answers button').forEach((element) => element.setAttribute('aria-pressed', String(element === button)));
    $('.evalNote').textContent = 'Respuesta de ejemplo. Sigue bajando para ver las dos opciones.';
  }));

  function resetPointer() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    canvas.style.setProperty('--tilt-x', '0deg');
    canvas.style.setProperty('--tilt-y', '0deg');
    canvas.style.setProperty('--light-x', '0px');
    canvas.style.setProperty('--light-y', '0px');
  }
  scene.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || phoneMedia.matches || reduced.matches || !visible) return;
    const bounds = scene.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
    const y = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      canvas.style.setProperty('--tilt-x', `${(-y * 1.25).toFixed(2)}deg`);
      canvas.style.setProperty('--tilt-y', `${(x * 1.6).toFixed(2)}deg`);
      canvas.style.setProperty('--light-x', `${(x * -3).toFixed(2)}px`);
      canvas.style.setProperty('--light-y', `${(y * -2).toFixed(2)}px`);
      pointerFrame = 0;
    });
  }, { passive: true });
  ['pointerleave', 'pointercancel'].forEach((event) => scene.addEventListener(event, resetPointer));
  window.addEventListener('blur', resetPointer);
  finePointer.addEventListener('change', resetPointer);
  function syncMotion() {
    const running = visible && !document.hidden && !reduced.matches;
    scene.dataset.motion = running ? 'running' : 'paused';
    if (!running) resetPointer();
  }
  observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncMotion(); });
  observer.observe(scene);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('scroll', () => {
    if ((!window.gsap || !window.ScrollTrigger) && !reduced.matches && !frame) {
      frame = requestAnimationFrame(() => { frame = 0; basic(); });
    }
  }, { passive: true });
  [reduced, phoneMedia, shortMedia, desktopShort].forEach((media) => media.addEventListener('change', () => { resetPointer(); setup(); syncMotion(); }));
  window.addEventListener('load', () => window.ScrollTrigger?.refresh());
  document.fonts?.ready.then(() => window.ScrollTrigger?.refresh());
  setup();
})();
