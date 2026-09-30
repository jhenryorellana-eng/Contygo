import { getServiceById } from "@/lib/services";
import ProcessPreview from "./ProcessPreview";
import styles from "./HowItWorks.module.css";

export default function HowItWorks() {
  const example = getServiceById("itin")!;
  return (
    <section id="como-funciona" className={styles.section} aria-labelledby="process-heading">
      <div className={styles.wrap}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}><span aria-hidden="true">✦</span> Cómo funciona</p>
            <h2 id="process-heading">Tu primer paso.<br /><em>Mucho más claro.</em></h2>
          </div>
          <p className={styles.intro}>Conoce el proceso antes de empezar.</p>
        </header>
        <ProcessPreview exampleName={example.name} videoSrc={example.video!} question={example.questions[0].text} />
        <footer className={styles.footer}>
          <p><span aria-hidden="true">✦</span> A tu lado, desde el primer paso.</p>
          <a className={styles.cta} href="/#servicios">Elegir mi servicio<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></a>
        </footer>
      </div>
    </section>
  );
}
