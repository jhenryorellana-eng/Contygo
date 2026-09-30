import styles from "./SelfServiceCard.module.css";

export default function SelfServiceCard({ href, serviceName }: { href: string; serviceName: string }) {
  return (
    <section className={styles.card} aria-labelledby="self-service-title">
      <span className={styles.eyebrow}>CONTYGO <span aria-hidden="true">·</span> POR TU CUENTA</span>
      <h3 id="self-service-title">Tu contrato, sin esperar una llamada.</h3>
      <p>Crea tu cuenta, contrata el servicio y firma en línea. Después, avanza con la guía de la aplicación.</p>
      <a className={styles.button} href={href} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M14 3v6h6M14 3l6 6M8 13h4M8 17h6" /></svg>
        Crear mi contrato
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
        <span className={styles.srOnly}> en Contygo (abre una pestaña nueva)</span>
      </a>
      <span className={styles.destination}>{serviceName} <span aria-hidden="true">·</span> contygo.app</span>
    </section>
  );
}
