/* La app de ContyGo dibujada en código dentro del teléfono (no una captura): nítida a cualquier
   tamaño, con el logo de la marca, en el tono de la página y viva cuando llega el hilo verde
   (el contenedor lleva data-react="phone"). Es una ilustración: muestra lo que promete la sección
   —tus documentos, qué sigue y alguien del otro lado— con datos de ejemplo, no de un cliente. */
import Image from "next/image";
import p from "./AppPhone.module.css";

function Glyph({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}
const HOME = "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z";
const FILE = "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6";
const CHAT = "M7 18 3 21V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H7Z";
const USER = "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0";
const BELL = "M6 16V11a6 6 0 0 1 12 0v5l2 2H4Zm4 4h4";
const CHECK = "m6 12 4 4 8-8";

const STEPS = ["Contrato firmado", "Tus documentos", "Revisión del equipo", "Tu paquete listo", "Siguientes indicaciones"];

export default function AppPhone() {
  // The frame is the size container: cqw units inside measure the phone, not the window.
  return <div className={p.frame} role="img" aria-label="Ilustración de la app ContyGo: el trámite de Visa Juvenil de Ana en el paso 3 de 5, con sus documentos y un mensaje de Soporte."><div className={p.device}>
    <span className={p.buttons} aria-hidden="true" />
    <div className={p.screen} aria-hidden="true">
      <div className={p.status}><b>9:41</b><i className={p.island} /><span className={p.statusIcons}><i /><i /><i /><em /></span></div>
      <header className={p.bar}>
        <span className={p.logo}><Image className={p.logoLight} src="/contygo/brand/logo-light.png" alt="" width={3000} height={849} sizes="110px" /><Image className={p.logoDark} src="/contygo/brand/logo-dark.png" alt="" width={3000} height={849} sizes="110px" /></span>
        <span className={p.bell}><Glyph d={BELL} /><i /></span>
        <span className={p.avatar}>A</span>
      </header>
      <p className={p.hello}>Hola, Ana</p>
      <p className={p.sub}>Así va tu trámite</p>

      <section className={p.case}>
        <div className={p.caseTop}><span className={p.tag}>Visa Juvenil</span><span className={p.state}><i data-loop />En preparación</span></div>
        <div className={p.progress}>
          <svg className={p.ring} viewBox="0 0 44 44"><circle className={p.ringTrack} cx="22" cy="22" r="18" /><circle className={p.ringValue} cx="22" cy="22" r="18" pathLength="100" /></svg>
          <div><strong>Paso 3 de 5</strong><span>Revisión del equipo</span></div>
        </div>
        <ol className={p.steps}>{STEPS.map((step, index) => <li key={step} data-state={index < 2 ? "done" : index === 2 ? "current" : "next"}><i data-loop={index === 2 || undefined}>{index < 2 && <Glyph d={CHECK} />}</i>{step}</li>)}</ol>
      </section>

      <section className={p.docs}>
        <div className={p.docsHead}><strong>Tus documentos</strong><span className={p.count}><span className={p.swap}><b className={p.before}>4</b><b className={p.after}>5</b></span>&nbsp;de 6</span></div>
        <div className={p.doc} data-state="done"><i><Glyph d={CHECK} /></i><span>Acta de nacimiento</span><em>Recibido</em></div>
        <div className={p.doc} data-state="done"><i><Glyph d={CHECK} /></i><span>Pasaporte</span><em>Recibido</em></div>
        <div className={`${p.doc} ${p.uploading}`}><i className={p.swap}><span className={p.before}><Glyph d={FILE} /></span><span className={p.after}><Glyph d={CHECK} /></span></i><span>Prueba de domicilio</span><span className={p.swap}><em className={`${p.before} ${p.sending}`}>Subiendo…</em><em className={p.after}>Recibido</em></span><span className={p.bar2}><span /></span></div>
      </section>

      <div className={p.toast}><span className={p.toastMark}><Image src="/contygo/brand/symbol-dark.png" alt="" width={1024} height={1024} sizes="32px" /></span><div><strong>Soporte ContyGo</strong><span>Revisamos tu acta. Solo falta tu prueba de domicilio.</span></div></div>

      <nav className={p.tabs}>
        <span data-active="true"><Glyph d={HOME} />Inicio</span>
        <span><Glyph d={FILE} />Documentos</span>
        <span><Glyph d={CHAT} />Soporte</span>
        <span><Glyph d={USER} />Perfil</span>
      </nav>
      <span className={p.homeBar} />
    </div>
    <span className={p.glare} aria-hidden="true" />
  </div></div>;
}
