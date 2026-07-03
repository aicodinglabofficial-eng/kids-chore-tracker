import { useState } from "react";

function randomQuestion() {
  const a = Math.floor(Math.random() * 8) + 3;
  const b = Math.floor(Math.random() * 8) + 3;
  return { a, b, answer: a + b };
}

export default function ParentGate({ onSuccess, onCancel }) {
  const [question, setQuestion] = useState(randomQuestion);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (Number(value) === question.answer) {
      onSuccess();
    } else {
      setError(true);
      setQuestion(randomQuestion());
      setValue("");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Grown-ups only 🔒</h2>
        <p className="field-label">Solve this to continue:</p>
        <p className="gate-question">
          {question.a} + {question.b} = ?
        </p>
        <input
          className="text-input"
          type="number"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
        />
        {error && <p className="gate-error">Not quite — try the new question!</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
