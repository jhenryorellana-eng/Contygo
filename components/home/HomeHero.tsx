import Link from "next/link";
import { Ico } from "../icons";
import HeroScenes from "./HeroScenes";
import styles from "./HeroScenes.module.css";

export default function HomeHero() {
  return (
    <section className={styles.hero} id="inicio">
      <HeroScenes>
        <div className={`${styles.wrap} ${styles.copy}`}>
          <p className={styles.eyebrow}><span aria-hidden="true">★</span> Servicios migratorios y fiscales</p>
          <h1 className={styles.title} aria-label="Tu trámite migratorio, en tus manos">
            <span><span>Tu trámite</span></span>
            <span><span>migratorio,</span></span>
            <span><em>en tus manos</em></span>
          </h1>
          <p className={styles.lead}>Acompañamiento real.<br />En cada paso de tu proceso.</p>
          <Link className={styles.cta} href="/#servicios">
            Explorar servicios <span className={styles.ctaArrow}>{Ico.arrow}</span>
          </Link>
        </div>
      </HeroScenes>
    </section>
  );
}
