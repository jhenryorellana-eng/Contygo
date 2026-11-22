"use client";

/* «Cuéntanos cómo te fue» (/califica, 21-11-2026): donde un cliente (o Henry, por él) deja su felicitación: cómo le
   fue, si le aprobaron su trámite y, si quiere, una foto. El dueño la pidió para el muro de la landing: «que se pueda
   subir con todo e imágenes… como una sección de felicitaciones, para causar confianza».
   La foto es lo delicado: suele ser la de una aprobación, con número A, fecha de nacimiento y dirección. Por eso no
   sale de su teléfono tal cual: aquí mismo se reduce y la persona tapa lo que quiera arrastrando el dedo; lo que se
   envía es el resultado, ya tapado. Y no se envía sin su permiso expreso.
   Queda pendiente: nada se muestra hasta que el dueño la aprueba en /admin, y él la enseña desde su panel
   (/admin/felicitaciones, CongratsShow), por ejemplo en un live: el permiso lo dice. */
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { VISIBLE_SERVICES } from "@/lib/contygo-catalog";
import f from "./ShareStory.module.css";

type Box = { x: number; y: number; w: number; h: number };
const SIDE = 1400, COVER = "#061b3d", COMMENT_MIN = 10, COMMENT_MAX = 600, PHOTO_MAX = 1_500_000;
const ERRORS: Record<string, string> = {
  not_configured: "Todavía no podemos recibir historias. Inténtalo más tarde.",
  consent: "Marca la casilla de permiso para enviar tu foto.",
  photo_size: "La foto pesa demasiado. Prueba con otra.",
  photo_type: "Ese archivo no es una foto que podamos usar. Prueba con otra.",
};

export default function ShareStory() {
  const [kind, setKind] = useState<"approval" | "review">("approval");
  const [rating, setRating] = useState(0), [name, setName] = useState(""), [serviceId, setServiceId] = useState(""), [place, setPlace] = useState(""), [comment, setComment] = useState("");
  const [website, setWebsite] = useState(""), [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null), [covers, setCovers] = useState<Box[]>([]), [draft, setDraft] = useState<Box | null>(null);
  const [phase, setPhase] = useState<"form" | "sending" | "done">("form"), [error, setError] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null), from = useRef<{ x: number; y: number } | null>(null);

  // The photo, reduced, with what the person has covered.
  useEffect(() => {
    const el = canvas.current, c = el?.getContext("2d");
    if (!el || !c || !photo) return;
    const scale = Math.min(1, SIDE / Math.max(photo.naturalWidth, photo.naturalHeight));
    el.width = Math.round(photo.naturalWidth * scale); el.height = Math.round(photo.naturalHeight * scale);
    c.drawImage(photo, 0, 0, el.width, el.height);
    c.fillStyle = COVER;
    for (const box of draft ? [...covers, draft] : covers) c.fillRect(box.x * el.width, box.y * el.height, box.w * el.width, box.h * el.height);
  }, [photo, covers, draft]);

  const choose = (file: File | undefined) => {
    if (!file) return;
    const img = new window.Image(), url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); setCovers([]); setPhoto(img); setError(null); };
    img.onerror = () => { URL.revokeObjectURL(url); setError(ERRORS.photo_type); };
    img.src = url;
  };
  // Where the finger is, as a share of the photo.
  const at = (event: PointerEvent<HTMLCanvasElement>) => { const box = event.currentTarget.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)) }; };
  const span = (a: { x: number; y: number }, b: { x: number; y: number }): Box => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  const press = (event: PointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); from.current = at(event); };
  const drag = (event: PointerEvent<HTMLCanvasElement>) => { if (from.current) setDraft(span(from.current, at(event))); };
  const lift = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!from.current) return;
    const box = span(from.current, at(event)); from.current = null; setDraft(null);
    if (box.w > .02 && box.h > .012) setCovers(list => [...list, box]);
  };

  const valid = rating >= 1 && name.trim().length >= 2 && comment.trim().length >= COMMENT_MIN && comment.trim().length <= COMMENT_MAX && consent;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || phase === "sending") return;
    setPhase("sending"); setError(null);
    try {
      const form = new FormData();
      for (const [key, value] of Object.entries({ kind, rating: String(rating), name: name.trim(), serviceId, place: place.trim(), comment: comment.trim(), consent: String(consent), website })) form.set(key, value);
      if (photo && canvas.current) {
        const shot = (quality: number) => new Promise<Blob | null>(resolve => canvas.current!.toBlob(resolve, "image/jpeg", quality));
        let blob = await shot(.84);
        if (blob && blob.size > PHOTO_MAX) blob = await shot(.66);
        if (!blob || blob.size > PHOTO_MAX) { setError(ERRORS.photo_size); setPhase("form"); return; }
        form.set("photo", blob, "foto.jpg");
      }
      const response = await fetch("/api/reviews", { method: "POST", body: form });
      if (response.ok) { setPhase("done"); return; }
      const reason = await response.json().then(data => String(data?.error ?? "")).catch(() => "");
      setError(ERRORS[reason] ?? "No pudimos enviar tu historia. Revisa los datos e inténtalo de nuevo.");
    } catch { setError("Sin conexión. Revisa tu internet e inténtalo de nuevo."); }
    setPhase("form");
  }

  return <main className={f.page}>
    <a className={f.logo} href="/" aria-label="ContyGo · Inicio"><Image src="/contygo/brand/logo-dark.png" alt="ContyGo" width={3000} height={849} sizes="150px" priority /></a>
    {phase === "done"
      ? <div className={f.card} role="status">
        <span className={f.done} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8" /></svg></span>
        <h1>¡Gracias por contarlo!</h1>
        <p className={f.lead}>Henry la va a leer. Con tu permiso, podrá mostrarla para que otras familias se animen a dar el paso.</p>
        <a className={f.send} href="/">Volver al inicio</a>
      </div>
      : <form className={f.card} onSubmit={submit}>
        <h1>Cuéntanos cómo te fue</h1>
        <p className={f.lead}>Tu historia ayuda a otras familias a dar el paso. Henry la revisa antes de mostrarla.</p>

        <div className={f.kinds} role="group" aria-label="Qué quieres contar">
          <button type="button" aria-pressed={kind === "approval"} onClick={() => setKind("approval")}>Me aprobaron mi trámite</button>
          <button type="button" aria-pressed={kind === "review"} onClick={() => setKind("review")}>Quiero contar mi experiencia</button>
        </div>

        <div className={f.field}>
          <span className={f.label} id="historia-estrellas">¿Cómo fue tu experiencia?</span>
          <div className={f.stars} role="radiogroup" aria-labelledby="historia-estrellas">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} data-on={n <= rating || undefined} onClick={() => setRating(n)}>★</button>)}</div>
        </div>
        <label className={f.field}><span className={f.label}>Tu nombre, como quieres que aparezca</span>
          <input type="text" value={name} maxLength={80} placeholder="María G." autoComplete="given-name" onChange={event => setName(event.target.value)} required />
          <small>Puedes poner solo tu nombre y la inicial de tu apellido.</small></label>
        <label className={f.field}><span className={f.label}>¿Qué trámite hiciste?</span>
          <select value={serviceId} onChange={event => setServiceId(event.target.value)}><option value="">Prefiero no decirlo</option>{VISIBLE_SERVICES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className={f.field}><span className={f.label}>¿Desde dónde? <i>(opcional)</i></span>
          <input type="text" value={place} maxLength={60} placeholder="Utah" onChange={event => setPlace(event.target.value)} /></label>
        <label className={f.field}><span className={f.label}>Tu mensaje</span>
          <textarea value={comment} rows={4} maxLength={COMMENT_MAX} placeholder="¿Cómo te ayudamos? ¿Qué le dirías a alguien que está por empezar?" onChange={event => setComment(event.target.value)} required />
          <small>{comment.trim().length < COMMENT_MIN ? `Escribe al menos ${COMMENT_MIN} letras` : `${comment.length} de ${COMMENT_MAX}`}</small></label>

        <div className={f.field}>
          <span className={f.label}>Añade una foto <i>(opcional)</i></span>
          {!photo
            ? <><label className={f.pick}><input type="file" accept="image/*" onChange={event => choose(event.target.files?.[0])} />Elegir foto</label>
              <small>Puede ser tuya o de tu aprobación. Antes de enviarla podrás tapar tus datos.</small></>
            : <div className={f.editor}>
              <p><strong>Tapa tus datos antes de enviar.</strong> Arrastra el dedo sobre tu número A, tu fecha de nacimiento, tu dirección y cualquier código.</p>
              <canvas ref={canvas} onPointerDown={press} onPointerMove={drag} onPointerUp={lift} onPointerCancel={() => { from.current = null; setDraft(null); }} aria-label="Tu foto. Arrastra sobre ella para tapar lo que no quieras mostrar." />
              <div><button type="button" onClick={() => setCovers(list => list.slice(0, -1))} disabled={!covers.length}>Deshacer</button><button type="button" onClick={() => { setPhoto(null); setCovers([]); }}>Quitar foto</button></div>
            </div>}
        </div>

        <label className={f.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /><span>Autorizo a ContyGo a mostrar lo que envío aquí (mi nombre, mi mensaje y mi foto) en sus transmisiones en vivo, su página y sus redes.</span></label>
        <input type="text" name="website" value={website} onChange={event => setWebsite(event.target.value)} className={f.trap} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        {error && <p className={f.error} role="alert">{error}</p>}
        <button type="submit" className={f.send} disabled={!valid || phase === "sending"}>{phase === "sending" ? "Enviando…" : "Enviar mi historia"}</button>
        <p className={f.fine}>Henry Orellana es consultor de inmigración registrado en Utah. No es abogado y no puede dar asesoría legal.</p>
      </form>}
  </main>;
}
