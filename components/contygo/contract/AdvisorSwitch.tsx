"use client";

/* «Terminar con un asesor» (29-10-2026). Quien eligió crear el contrato por su cuenta puede pasarse a un asesor en
   cualquier paso, sin empezar de cero: el chat del CRM se abre con su nombre, el paso donde va y la referencia (con ella
   el equipo encuentra sus datos en el CRM), y la ficha sigue guardada por si prefiere volver. Va siempre a mano, junto a
   «Continuar»; si la persona parece trabada (mucho rato en un paso, errores repetidos, ir y volver), crece y la invita.
   Así el contrato se termina sí o sí, con ella sola o con un asesor. */
import s from "./AdvisorSwitch.module.css";

type Props = {
  /** The CRM chat with the message (name, step and reference) already written. */
  href: string;
  /** The person seems stuck: the button becomes an invitation. */
  invite: boolean;
  /** The chat was opened already: the button says so and reopens it. */
  opened: boolean;
  onOpen: () => void;
  onDismiss: () => void;
};

function WhatsApp() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2 4.6 4.6 0 0 0 1 2.5 10.6 10.6 0 0 0 4.1 3.6c1.5.6 2.1.7 2.9.6a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.5-.3Z" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function AdvisorSwitch({ href, invite, opened, onOpen, onDismiss }: Props) {
  if (invite && !opened) return <div className={s.invite} role="status">
    <span className={s.badge} aria-hidden="true"><WhatsApp /></span>
    <div className={s.copy}>
      <strong>¿Te ayudamos a terminar?</strong>
      <span>Un asesor termina tu contrato contigo por WhatsApp. Le pasamos tu nombre y en qué paso vas: no empiezas de cero.</span>
    </div>
    <div className={s.actions}>
      <a className={s.go} href={href} target="_blank" rel="noopener noreferrer" onClick={onOpen}><WhatsApp />Terminar con un asesor</a>
      <button type="button" className={s.stay} onClick={onDismiss}>Sigo yo</button>
    </div>
  </div>;

  return <a className={s.pill} data-opened={opened} href={href} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
    <span className={s.icon}><WhatsApp /></span>
    <span className={s.text}>
      {opened
        ? <><strong>Te pasamos con un asesor</strong><small>¿Se cerró el chat? Toca para abrirlo otra vez</small></>
        : <><strong>Terminar con un asesor</strong><small>Por WhatsApp, sin empezar de cero</small></>}
    </span>
    <i className={s.arrow} aria-hidden="true"><Arrow /></i>
  </a>;
}
