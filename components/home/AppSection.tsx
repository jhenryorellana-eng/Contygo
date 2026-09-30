/* eslint-disable @next/next/no-img-element */
import { CONTYGO_URL } from "@/lib/contygo";
import AppShowcase from "./AppShowcase";
import styles from "./AppSection.module.css";

function ExternalArrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>;
}

function Lock() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
}

function ContygoMark() {
  return <svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M47 58C44 70 40 77 30 77" stroke="#07192f" strokeWidth="9.5" strokeLinecap="round" /><path d="M31 41 47 60 74 23" stroke="#167b4b" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const BENEFITS = [
  { title: "Crea tu cuenta", text: "Elige tu servicio y regístrate para empezar." },
  { title: "Contrata y firma", text: "Revisa tu contrato, firma y paga en línea." },
  { title: "Gestiona tu proceso", text: "Completa tu información y documentos a tu ritmo." },
];

export default function AppSection() {
  return (
    <section id="app" className={`${styles.section} ${styles.cinematic}`} aria-labelledby="app-heading">
      <div className={styles.wrap}>
        <div className={styles.copy}>
          <div className={styles.productIntro}>
            <span className={styles.productBrand}><ContygoMark />ContyGo</span>
            <p className={styles.eyebrow}>Nuestra aplicación</p>
          </div>
          <h2 id="app-heading">Tu trámite.<br /><em>A tu ritmo.</em></h2>
          <p className={styles.lead}><strong>Contrata, firma y gestiona tu proceso en línea.</strong> Todo desde Contygo, sin esperar una llamada para empezar.</p>
          <ol className={styles.benefits}>
            {BENEFITS.map((item, index) => <li key={item.title}>
              <span className={styles.step} aria-hidden="true">0{index + 1}</span>
              <div><h3>{item.title}</h3><p>{item.text}</p></div>
            </li>)}
          </ol>
          <div className={styles.actions}>
            <a className={styles.cta} href={CONTYGO_URL} target="_blank" rel="noopener noreferrer">Entrar a Contygo <ExternalArrow /><span className={styles.srOnly}> (abre una pestaña nueva)</span></a>
            <span className={styles.available}><i aria-hidden="true" /> Disponible ahora</span>
          </div>
          <p className={styles.caption}>En tu celular o computadora <span aria-hidden="true">·</span> contygo.app</p>
        </div>

        <AppShowcase>
          <a className={styles.phoneLink} href={CONTYGO_URL} target="_blank" rel="noopener noreferrer" aria-label="Abrir Contygo: vista previa de su inicio (abre una pestaña nueva)">
            <div className={styles.phoneFloat}>
            <div className={styles.phone} aria-hidden="true">
              <div className={styles.screen}>
                <span className={styles.glassReflection} />
                <div className={styles.statusBar}><span>9:41</span><span className={styles.island} /><span className={styles.signal}><i /><i /><i /><i /><span className={styles.battery} /></span></div>
                {/* Contygo blocks iframes (X-Frame-Options: DENY). This linked
                    preview uses the public welcome page's copy and original asset. */}
                <div className={styles.welcome}>
                  <span className={styles.contygoBrand}><ContygoMark />ContyGo</span>
                  <picture><source media="(prefers-reduced-motion: reduce)" srcSet="/contygo/lex-still.webp" /><img className={styles.mascot} src="/contygo/lex.webp" alt="" width={136} height={136} loading="lazy" decoding="async" /></picture>
                  <span className={styles.welcomeTitle}>Bienvenido a tu App de servicios migratorios</span>
                  <span className={styles.welcomeLead}>Tecnología de punta para organizar y estructurar tu propio trámite en tiempo récord, paso a paso, con la información que tú aportas.</span>
                  <span className={`${styles.appButton} ${styles.appButtonPrimary}`}><Lock /> Ver mi caso</span>
                  <span className={styles.appButton}><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>Ver nuestros servicios</span>
                  <span className={styles.appButton}><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>Crear una cuenta</span>
                  <span className={styles.protected}><svg viewBox="0 0 24 24" fill="none"><path d="m12 3 7 3v5c0 5-4 8-7 10-3-2-7-5-7-10V6Z" /><path d="m8 12 3 3 5-6" /></svg>Tu información está protegida</span>
                </div>
                <div className={styles.browserBar}><Lock />contygo.app</div>
                <div className={styles.homeBar} />
              </div>
              <span className={styles.rimLight} />
            </div>
            </div>
            <span className={styles.tapHint}>Vista previa · Toca para abrir Contygo <ExternalArrow /></span>
          </a>
        </AppShowcase>
      </div>
    </section>
  );
}
