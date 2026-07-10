import { useEffect, useState } from "react";
import { api } from "../api.js";

const CHORE_ICONS = ["🦷", "🛏️", "📚", "🐶", "🧸", "🍽️", "👕", "🚿", "📝", "🧹"];
const REWARD_ICONS = ["📖", "🍕", "🎬", "🎮", "🍦", "🚲", "🎨", "🏊"];

const CHORE_PRESETS = [
  { label: "Get Up on Time", icon: "⏰" },
  { label: "Make the Bed", icon: "🛏️" },
  { label: "Brush Teeth", icon: "🦷" },
  { label: "Brush Hair, Comb & Apply Cream", icon: "💆‍♀️" },
  { label: "Morning Grooming Routine", icon: "🪥" },
  { label: "Finish Breakfast in 15 Minutes", icon: "🍽️" },
  { label: "Complete Notes & Homework", icon: "📚" },
  { label: "Pack School Bag", icon: "🎒" },
  { label: "Clear Plates & Clean Table on Time", icon: "🍽️" },
  { label: "Clean the Washroom", icon: "🚿" },
  { label: "Tidy Up the Room", icon: "🧹" },
  { label: "Put Toys Away", icon: "🧸" },
  { label: "Bathe Properly Before 5:30 PM", icon: "🚿" },
  { label: "Drink 2 Bottles of Water", icon: "💧" },
  { label: "Daily Prayer", icon: "🙏" },
  { label: "Support & Obey Parents", icon: "💝" },
  { label: "Feed the Pet", icon: "🐶" },
  { label: "Wash Hands Before Meals", icon: "🤲" },
  { label: "Read for 20 Minutes", icon: "📖" },
  { label: "Help Set the Table", icon: "🍴" },
  { label: "Exercise / Stretch", icon: "🏃" },
  { label: "Don't Wet the Bed", icon: "🛏️" },
  { label: "Taking Things Without Permission", icon: "🚫" },
  { label: "Fighting with Sibling", icon: "🚫" },
];

export default function ParentZone({ kids, onBack, onKidsChanged }) {
  const [selectedKidId, setSelectedKidId] = useState(kids[0]?.id ?? null);
  const [chores, setChores] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [choreForm, setChoreForm] = useState({ title: "", icon: CHORE_ICONS[0], stars: 2, remarks: "" });
  const [rewardForm, setRewardForm] = useState({ title: "", icon: REWARD_ICONS[0], cost: 10 });
  const [copySourceId, setCopySourceId] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [editingChoreId, setEditingChoreId] = useState(null);
  const [editChoreForm, setEditChoreForm] = useState({ title: "", icon: "", stars: 0, remarks: "" });
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const selectedKid = kids.find((k) => k.id === selectedKidId);

  useEffect(() => {
    if (!selectedKidId) return;
    api.getChores(selectedKidId, new Date().toISOString().slice(0, 10)).then(setChores);
    api.getRewards(selectedKidId).then(setRewards);
    api.getRedemptions(selectedKidId).then(setRedemptions);
    setCopySourceId("");
    setCopyMsg("");
    setEditingChoreId(null);
  }, [selectedKidId]);

  async function refreshKids() {
    const updated = await api.getKids();
    onKidsChanged(updated);
  }

  async function addChore(e) {
    e.preventDefault();
    if (!choreForm.title.trim()) return;
    const chore = await api.addChore(selectedKidId, choreForm);
    setChores((prev) => [...prev, chore]);
    setChoreForm({ title: "", icon: CHORE_ICONS[0], stars: 2, remarks: "" });
  }

  function handleChoreTitleChange(title) {
    const preset = CHORE_PRESETS.find((p) => p.label === title);
    setChoreForm((f) => ({ ...f, title, ...(preset ? { icon: preset.icon } : {}) }));
  }

  function handleDragStart(e, id) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (id !== dragOverId) setDragOverId(id);
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const reordered = [...chores];
    const fromIdx = reordered.findIndex((c) => c.id === dragId);
    const toIdx = reordered.findIndex((c) => c.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setChores(reordered);
    setDragId(null);
    setDragOverId(null);
    api.reorderChores(selectedKidId, reordered.map((c) => c.id));
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  function startEditChore(chore) {
    setEditingChoreId(chore.id);
    setEditChoreForm({
      title: chore.title,
      icon: chore.icon,
      stars: chore.stars,
      remarks: chore.remarks || "",
    });
  }

  async function saveEditChore(id) {
    if (!editChoreForm.title.trim()) return;
    const updated = await api.updateChore(id, editChoreForm);
    setChores((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    setEditingChoreId(null);
  }

  async function removeChore(id) {
    await api.deleteChore(id);
    setChores((prev) => prev.filter((c) => c.id !== id));
  }

  async function copyChoresFrom() {
    if (!copySourceId) return;
    const result = await api.copyChores(selectedKidId, copySourceId);
    setChores(result.chores);
    setCopyMsg(
      result.copiedCount > 0
        ? `Copied ${result.copiedCount} chore${result.copiedCount === 1 ? "" : "s"}.`
        : "Nothing new to copy — those chores already exist."
    );
    setCopySourceId("");
  }

  async function addReward(e) {
    e.preventDefault();
    if (!rewardForm.title.trim()) return;
    const reward = await api.addReward(selectedKidId, rewardForm);
    setRewards((prev) => [...prev, reward]);
    setRewardForm({ title: "", icon: REWARD_ICONS[0], cost: 10 });
  }

  async function removeReward(id) {
    await api.deleteReward(id);
    setRewards((prev) => prev.filter((r) => r.id !== id));
  }

  async function resetRedemption(id) {
    await api.undoRedemption(id);
    setRedemptions((prev) => prev.filter((r) => r.id !== id));
    await refreshKids();
  }

  async function removeKid(id) {
    if (!confirm("Remove this kid's profile and all their data?")) return;
    await api.deleteKid(id);
    const updated = kids.filter((k) => k.id !== id);
    onKidsChanged(updated);
    setSelectedKidId(updated[0]?.id ?? null);
  }

  return (
    <div className="screen parent-screen">
      <header className="parent-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>🔒 Parent Zone</h1>
      </header>

      <div className="kid-tabs">
        {kids.map((k) => (
          <button
            key={k.id}
            className={`kid-tab ${selectedKidId === k.id ? "active" : ""}`}
            style={{ "--kid-color": k.color }}
            onClick={() => setSelectedKidId(k.id)}
          >
            {k.avatar} {k.name}
          </button>
        ))}
      </div>

      {selectedKid && (
        <div className="parent-panels">
          <section className="parent-panel">
            <div className="panel-title-row">
              <h2>Chores for {selectedKid.name}</h2>
              <button className="btn btn-danger-outline" onClick={() => removeKid(selectedKid.id)}>
                Remove Profile
              </button>
            </div>

            {kids.length > 1 && (
              <div className="copy-row">
                <select
                  className="text-input select-input-wide"
                  value={copySourceId}
                  onChange={(e) => setCopySourceId(e.target.value)}
                >
                  <option value="">Copy chores from…</option>
                  {kids
                    .filter((k) => k.id !== selectedKidId)
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.avatar} {k.name}
                      </option>
                    ))}
                </select>
                <button className="btn btn-outline sm" disabled={!copySourceId} onClick={copyChoresFrom}>
                  Copy Chores
                </button>
                {copyMsg && <span className="copy-msg">{copyMsg}</span>}
              </div>
            )}

            <ul className="manage-list">
              {chores.map((c) =>
                editingChoreId === c.id ? (
                  <li key={c.id} className="editing-row">
                    <div className="edit-row">
                      <input
                        className="text-input"
                        value={editChoreForm.title}
                        onChange={(e) => setEditChoreForm({ ...editChoreForm, title: e.target.value })}
                      />
                      <select
                        className="text-input select-input"
                        value={editChoreForm.icon}
                        onChange={(e) => setEditChoreForm({ ...editChoreForm, icon: e.target.value })}
                      >
                        {CHORE_ICONS.map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                      <input
                        className="text-input num-input"
                        type="number"
                        min="-10"
                        max="10"
                        value={editChoreForm.stars}
                        onChange={(e) => setEditChoreForm({ ...editChoreForm, stars: e.target.value })}
                      />
                      <input
                        className="text-input"
                        placeholder="Remarks (optional)"
                        value={editChoreForm.remarks}
                        onChange={(e) => setEditChoreForm({ ...editChoreForm, remarks: e.target.value })}
                      />
                    </div>
                    <button className="btn btn-primary sm" onClick={() => saveEditChore(c.id)}>
                      Save
                    </button>
                    <button className="btn btn-ghost sm" onClick={() => setEditingChoreId(null)}>
                      Cancel
                    </button>
                  </li>
                ) : (
                  <li
                    key={c.id}
                    draggable
                    className={`${dragId === c.id ? "dragging" : ""} ${dragOverId === c.id && dragId !== c.id ? "drag-over" : ""}`}
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    onDragOver={(e) => handleDragOver(e, c.id)}
                    onDrop={(e) => handleDrop(e, c.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="drag-handle" title="Drag to reorder">⠿</span>
                    <span className="chore-label">
                      {c.icon} {c.title}
                      {c.remarks && <span className="chore-remarks">{c.remarks}</span>}
                    </span>
                    <span className={`manage-meta ${c.stars < 0 ? "negative" : ""}`}>
                      {c.stars >= 0 ? "+" : ""}{c.stars}⭐
                    </span>
                    <button className="btn btn-outline sm" onClick={() => startEditChore(c)}>
                      Edit
                    </button>
                    <button className="btn btn-danger-outline sm" onClick={() => removeChore(c.id)}>
                      Delete
                    </button>
                  </li>
                )
              )}
            </ul>
            <form className="inline-form" onSubmit={addChore}>
              <datalist id="chore-presets">
                {CHORE_PRESETS.map((p) => (
                  <option key={p.label} value={p.label} />
                ))}
                {chores
                  .filter((c) => !CHORE_PRESETS.some((p) => p.label === c.title))
                  .map((c) => (
                    <option key={`c-${c.id}`} value={c.title} />
                  ))}
              </datalist>
              <input
                className="text-input"
                list="chore-presets"
                placeholder="Type any name or pick from list…"
                value={choreForm.title}
                onChange={(e) => handleChoreTitleChange(e.target.value)}
              />
              <select
                className="text-input select-input"
                value={choreForm.icon}
                onChange={(e) => setChoreForm({ ...choreForm, icon: e.target.value })}
              >
                {CHORE_ICONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <input
                className="text-input num-input"
                type="number"
                min="-10"
                max="10"
                title="Use a negative number for a penalty / demerit chore"
                value={choreForm.stars}
                onChange={(e) => setChoreForm({ ...choreForm, stars: e.target.value })}
              />
              <input
                className="text-input"
                placeholder="Remarks (optional)"
                value={choreForm.remarks}
                onChange={(e) => setChoreForm({ ...choreForm, remarks: e.target.value })}
              />
              <button className="btn btn-primary" type="submit">Add Chore</button>
            </form>
          </section>

          <section className="parent-panel">
            <h2>Rewards for {selectedKid.name}</h2>
            <ul className="manage-list">
              {rewards.map((r) => (
                <li key={r.id}>
                  <span>{r.icon} {r.title}</span>
                  <span className="manage-meta">{r.cost}⭐</span>
                  <button className="btn btn-danger-outline sm" onClick={() => removeReward(r.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <form className="inline-form" onSubmit={addReward}>
              <input
                className="text-input"
                placeholder="Reward name"
                value={rewardForm.title}
                onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
              />
              <select
                className="text-input select-input"
                value={rewardForm.icon}
                onChange={(e) => setRewardForm({ ...rewardForm, icon: e.target.value })}
              >
                {REWARD_ICONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <input
                className="text-input num-input"
                type="number"
                min="1"
                max="100"
                value={rewardForm.cost}
                onChange={(e) => setRewardForm({ ...rewardForm, cost: e.target.value })}
              />
              <button className="btn btn-primary" type="submit">Add Reward</button>
            </form>

            <h3 className="history-section-title">Redemption History</h3>
            {redemptions.length === 0 ? (
              <p className="empty-hint">No rewards claimed yet.</p>
            ) : (
              <ul className="manage-list">
                {redemptions.map((r) => (
                  <li key={r.id}>
                    <span>{r.icon} {r.title}</span>
                    <span className="manage-date">{r.redeemed_at.slice(0, 10)}</span>
                    <span className="manage-meta negative">-{r.cost}⭐</span>
                    <button className="btn btn-outline sm" onClick={() => resetRedemption(r.id)}>
                      Reset
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
