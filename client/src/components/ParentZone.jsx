import { useEffect, useState } from "react";
import { api } from "../api.js";

const CHORE_ICONS = ["🦷", "🛏️", "📚", "🐶", "🧸", "🍽️", "👕", "🚿", "📝", "🧹"];
const REWARD_ICONS = ["📖", "🍕", "🎬", "🎮", "🍦", "🚲", "🎨", "🏊"];

export default function ParentZone({ kids, onBack, onKidsChanged }) {
  const [selectedKidId, setSelectedKidId] = useState(kids[0]?.id ?? null);
  const [chores, setChores] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [choreForm, setChoreForm] = useState({ title: "", icon: CHORE_ICONS[0], stars: 2 });
  const [rewardForm, setRewardForm] = useState({ title: "", icon: REWARD_ICONS[0], cost: 10 });

  const selectedKid = kids.find((k) => k.id === selectedKidId);

  useEffect(() => {
    if (!selectedKidId) return;
    api.getChores(selectedKidId, new Date().toISOString().slice(0, 10)).then(setChores);
    api.getRewards(selectedKidId).then(setRewards);
  }, [selectedKidId]);

  async function addChore(e) {
    e.preventDefault();
    if (!choreForm.title.trim()) return;
    const chore = await api.addChore(selectedKidId, choreForm);
    setChores((prev) => [...prev, chore]);
    setChoreForm({ title: "", icon: CHORE_ICONS[0], stars: 2 });
  }

  async function removeChore(id) {
    await api.deleteChore(id);
    setChores((prev) => prev.filter((c) => c.id !== id));
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
            <ul className="manage-list">
              {chores.map((c) => (
                <li key={c.id}>
                  <span>{c.icon} {c.title}</span>
                  <span className="manage-meta">+{c.stars}⭐</span>
                  <button className="btn btn-danger-outline sm" onClick={() => removeChore(c.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <form className="inline-form" onSubmit={addChore}>
              <input
                className="text-input"
                placeholder="Chore name"
                value={choreForm.title}
                onChange={(e) => setChoreForm({ ...choreForm, title: e.target.value })}
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
                min="1"
                max="10"
                value={choreForm.stars}
                onChange={(e) => setChoreForm({ ...choreForm, stars: e.target.value })}
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
          </section>
        </div>
      )}
    </div>
  );
}
