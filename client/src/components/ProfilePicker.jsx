import { useState } from "react";

const AVATARS = ["🦄", "🐯", "🦊", "🐼", "🐸", "🦁", "🐨", "🐵", "🦖", "🐙"];
const COLORS = ["#FF6FA5", "#3DB2FF", "#FFC93C", "#7ED957", "#B57EDC", "#FF8552"];

export default function ProfilePicker({ kids, onSelect, onAddKid, onOpenParentZone }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(COLORS[0]);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAddKid({ name, avatar, color });
    setName("");
    setAdding(false);
  }

  return (
    <div className="screen picker-screen">
      <h1 className="big-title">Who's checking off chores today? 🌟</h1>

      <div className="profile-grid">
        {kids.map((kid) => (
          <button
            key={kid.id}
            className="profile-card"
            style={{ "--kid-color": kid.color }}
            onClick={() => onSelect(kid)}
          >
            <span className="profile-avatar">{kid.avatar}</span>
            <span className="profile-name">{kid.name}</span>
            <span className="profile-stars">⭐ {kid.stars.balance}</span>
          </button>
        ))}

        <button className="profile-card add-card" onClick={() => setAdding(true)}>
          <span className="profile-avatar">➕</span>
          <span className="profile-name">Add Kid</span>
        </button>
      </div>

      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2>New Profile</h2>
            <input
              className="text-input"
              placeholder="Kid's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <p className="field-label">Pick an avatar</p>
            <div className="option-row">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  className={`option-emoji ${avatar === a ? "selected" : ""}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="field-label">Pick a color</p>
            <div className="option-row">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`option-color ${color === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <button className="parent-zone-link" onClick={onOpenParentZone}>
        🔒 Parent Zone
      </button>
    </div>
  );
}
