/* ============================================================
   STEP 4 — PREGUNTAS (quiz)
   ============================================================ */
import type { Question, Service } from "@/lib/types";
import { Ico, SvgIcon } from "./icons";

interface QuizSlideProps {
  service: Service;
  question: Question;
  qIndex: number;
  qTotal: number;
  answer: string | string[] | undefined;
  onAnswer: (value: string | string[]) => void;
}

export default function QuizSlide({ service, question, qIndex, qTotal, answer, onAnswer }: QuizSlideProps) {
  function renderYesNo() {
    const opts = [
      { v: "si", label: "Sí", cls: "opt--yes" },
      { v: "no", label: "No", cls: "opt--no" },
    ];
    return (
      <div className="quiz__options">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            className={"opt " + o.cls + (answer === o.v ? " opt--selected" : "")}
            onClick={() => onAnswer(o.v)}
          >
            <span className="opt__mark">{Ico.check}</span>
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  function renderChoice() {
    return (
      <div className="quiz__options">
        {question.options?.map((o) => (
          <button
            key={o.value}
            type="button"
            className={"opt" + (answer === o.value ? " opt--selected" : "")}
            onClick={() => onAnswer(o.value)}
          >
            <span className="opt__mark">{Ico.check}</span>
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  function renderChecklist() {
    const sel = Array.isArray(answer) ? answer : [];
    const toggle = (id: string) => {
      const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
      onAnswer(next);
    };
    return (
      <div className="checklist">
        {question.items?.map((it) => (
          <button
            key={it.id}
            type="button"
            className={"check" + (sel.includes(it.id) ? " check--on" : "")}
            aria-pressed={sel.includes(it.id)}
            onClick={() => toggle(it.id)}
          >
            <span className="check__box">{Ico.check}</span>
            {it.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="quiz slide-anim">
      <div className="quiz__head">
        <span className="quiz__svc-icon">
          <SvgIcon name={service.icon} />
        </span>
        <div>
          <div className="quiz__svc-name">{service.name}</div>
          <div className="quiz__count">
            Pregunta {qIndex + 1} de {qTotal}
          </div>
        </div>
      </div>
      <div className="quiz__body">
        <h3 className="quiz__q">{question.text}</h3>
        {question.kind === "yesno" && renderYesNo()}
        {question.kind === "choice" && renderChoice()}
        {question.kind === "checklist" && renderChecklist()}
      </div>
    </div>
  );
}
