/* El dibujo que viaja (28-10-2026): al tocar un servicio, su escultura sale de la tarjeta, sube en arco y se posa en la
   cabecera de la pantalla siguiente ([data-flight-target]) mientras la ventana se abre. Viaja en una capa propia del
   «top layer» (popover), por encima de la ventana, para que el círculo que la revela no la recorte. Sin popover o
   con «reducir movimiento» no hay viaje: el dibujo simplemente aparece en su sitio. */
type Rect = { x: number; y: number; width: number; height: number };

export function flyDrawing(art: Rect & { src: string }, dialog: HTMLElement, classes: { layer: string; image: string }): () => void {
  const target = dialog.querySelector<HTMLElement>("[data-flight-target]");
  const layer = document.createElement("div");
  if (!target || typeof layer.showPopover !== "function" || typeof layer.animate !== "function") return () => {};
  const to = target.getBoundingClientRect();
  if (!to.width || !art.width) return () => {};
  layer.setAttribute("popover", "manual");
  layer.setAttribute("aria-hidden", "true");
  layer.className = classes.layer;
  const image = document.createElement("img");
  image.src = art.src;
  image.alt = "";
  image.className = classes.image;
  // The same 10 % margin as the drawing in its tile, in pixels: a percentage here would be of the whole screen.
  Object.assign(image.style, { left: `${to.x}px`, top: `${to.y}px`, width: `${to.width}px`, height: `${to.height}px`, padding: `${to.width * .1}px` });
  layer.appendChild(image);
  document.body.appendChild(layer);
  layer.showPopover();
  target.dataset.flying = "true";
  const dx = art.x - to.x, dy = art.y - to.y, scale = art.width / to.width;
  // The arc: halfway up it rises above the straight line and grows a little, as if lifted off the card.
  const lift = Math.min(70, 24 + Math.abs(dy) * .12);
  const animation = image.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, filter: "drop-shadow(0 6px 8px rgba(6, 27, 61, .2))" },
    { transform: `translate(${dx * .42}px, ${dy * .42 - lift}px) scale(${(scale + 1) / 2 * 1.12})`, filter: "drop-shadow(0 30px 26px rgba(6, 27, 61, .38))", offset: .52 },
    { transform: "translate(0px, 0px) scale(1)", filter: "drop-shadow(0 14px 14px rgba(6, 27, 61, .26))" },
  ], { duration: 780, easing: "cubic-bezier(.3, .7, .2, 1)", fill: "forwards" });
  let done = false;
  const land = () => {
    if (done) return;
    done = true;
    delete target.dataset.flying;
    // One frame later, so the drawing in its place is painted before the traveller leaves.
    requestAnimationFrame(() => { try { layer.hidePopover(); } catch { /* Already hidden. */ } layer.remove(); });
  };
  animation.finished.then(land, land);
  return () => { animation.cancel(); land(); };
}
