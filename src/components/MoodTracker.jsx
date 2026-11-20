import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import "../styles/MoodTracker.css";

const moods = [
  { id: "great", label: "Good", hint: "Light and positive" },
  { id: "calm", label: "Calm", hint: "Grounded and settled" },
  { id: "okay", label: "Neutral", hint: "Somewhere in between" },
  { id: "low", label: "Low", hint: "Flat or discouraged" },
  { id: "anxious", label: "Anxious", hint: "Worried or unsettled" },
  { id: "overwhelmed", label: "Overwhelmed", hint: "Too much at once" },
];

export default function MoodTracker({ onSelectMood, onClose, isGuest = false }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitMood = async () => {
    if (!selectedMood || submitting) return;
    setSubmitting(true);
    try {
      await onSelectMood({ ...selectedMood, intensity, note: note.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mood-checkin" aria-labelledby="mood-title">
      <div className="mood-checkin__shell">
        <header className="mood-checkin__header">
          <button type="button" className="mood-checkin__back" onClick={onClose} aria-label="Back to chat">
            <ArrowLeft size={18} />
          </button>
          <span>Mood check-in</span>
          <span className="mood-checkin__privacy-state">Private</span>
        </header>

        <div className="mood-checkin__intro">
          <h1 id="mood-title">How are you feeling right now?</h1>
          <p>Choose the closest match. You can add a little context if it helps.</p>
        </div>

        <fieldset className="mood-options">
          <legend className="mood-visually-hidden">Choose your mood</legend>
          {moods.map((mood) => {
            const selected = selectedMood?.id === mood.id;
            return (
              <label key={mood.id} className={`mood-option ${selected ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="mood"
                  value={mood.id}
                  checked={selected}
                  onChange={() => setSelectedMood(mood)}
                />
                <span className="mood-option__mark" aria-hidden="true" />
                <span className="mood-option__copy">
                  <strong>{mood.label}</strong>
                  <small>{mood.hint}</small>
                </span>
                <Check className="mood-option__check" size={15} aria-hidden="true" />
              </label>
            );
          })}
        </fieldset>

        <div className={`mood-details ${selectedMood ? "is-visible" : ""}`} aria-hidden={!selectedMood}>
          <fieldset className="mood-intensity-fieldset" disabled={!selectedMood}>
            <legend>
              <span>Intensity</span>
              <small>How strongly do you feel it?</small>
            </legend>
            <div className="mood-intensity">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className={intensity === value ? "is-active" : ""}>
                  <input
                    type="radio"
                    name="mood-intensity"
                    value={value}
                    checked={intensity === value}
                    onChange={() => setIntensity(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mood-note">
            <span>Note <small>Optional</small></span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 240))}
              placeholder="What is contributing to this feeling?"
              rows={3}
              disabled={!selectedMood}
            />
            <small className="mood-note__count">{note.length}/240</small>
          </label>
        </div>

        <footer className="mood-checkin__footer">
          <p>
            {isGuest ? "Saved only on this device." : "Saved privately to your account."}
          </p>
          <button
            type="button"
            className="mood-submit"
            disabled={!selectedMood || submitting}
            onClick={submitMood}
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </footer>
      </div>
    </section>
  );
}
