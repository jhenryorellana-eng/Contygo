import Image from "next/image";
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { getContygoServiceUrl } from "@/lib/contygo";
import styles from "./DirectContractEntry.module.css";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function DirectContractEntry({
  serviceId,
  onChooseQuestions,
}: {
  serviceId: string;
  onChooseQuestions: () => void;
}) {
  const service = CONTYGO_SERVICES.find((item) => item.id === serviceId);
  const href = getContygoServiceUrl(serviceId);
  if (!service || !href) return null;

  return (
    <section className={styles.entry} aria-labelledby="direct-contract-title">
      <div className={styles.details}>
        <div className={styles.brand}>
          <Image src="/contygo/brand-mark.png" width={36} height={36} alt="" />
          <span>ContyGo</span>
          <span className={styles.eyebrow}>A tu ritmo</span>
        </div>
        <h1 id="direct-contract-title">{service.name}</h1>
        <p className={styles.description}>{service.description}</p>
        <p className={styles.price}>Desde <strong>{dollars.format(service.price)}</strong> <span>USD</span></p>
      </div>
      <div className={styles.actions}>
        <a className={styles.primary} href={href} target="_blank" rel="noopener noreferrer">
          Iniciar contratación
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
          <span className={styles.srOnly}> en ContyGo (abre una pestaña nueva)</span>
        </a>
        <p className={styles.nextSteps}>
          Crea tu cuenta y confirma tu correo. Revisa tu plan y contrato, firma y realiza tu pago inicial.
        </p>
        <button className={styles.questions} type="button" onClick={onChooseQuestions}>
          Prefiero responder unas preguntas
        </button>
        <p className={styles.optional}>El video y las preguntas son opcionales.</p>
      </div>
    </section>
  );
}
