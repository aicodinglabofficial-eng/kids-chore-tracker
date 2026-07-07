import { useEffect, useState } from "react";
import { api, todayStr } from "../api.js";
import ChoreList from "./ChoreList.jsx";
import RewardsStore from "./RewardsStore.jsx";
import HistoryView from "./HistoryView.jsx";

const CHEERS = ["Awesome job! 🎉", "You're a star! 🌟", "Way to go! 🙌", "Amazing! ✨", "Nailed it! 💪"];

export default function KidDashboard({ kid, onBack, onKidUpdated }) {
  const [tab, setTab] = useState("chores");
  const [chores, setChores] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState(kid.stars.balance);
  const [toast, setToast] = useState(null);
  const date = todayStr();

  useEffect(() => {
    api.getChores(kid.id, date).then(setChores);
    api.getRewards(kid.id).then(setRewards);
  }, [kid.id]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  async function toggleChore(chore) {
    const result = await api.toggleChore(chore.id, date);
    setChores((prev) => prev.map((c) => (c.id === chore.id ? result.chore : c)));
    setBalance(result.stars.balance);
    onKidUpdated(kid.id, result.stars);
    if (result.chore.done) {
      showToast(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
    }
  }

  async function redeemReward(reward) {
    try {
      const result = await api.redeemReward(reward.id);
      setBalance(result.stars.balance);
      onKidUpdated(kid.id, result.stars);
      showToast(`${reward.icon} Enjoy your reward!`);
    } catch (err) {
      showToast(err.message);
    }
  }

  const completedCount = chores.filter((c) => c.done).length;
  const progress = chores.length ? Math.round((completedCount / chores.length) * 100) : 0;

  return (
    <div className="screen dashboard-screen" style={{ "--kid-color": kid.color }}>
      <header className="dashboard-header">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          ← Switch Profile
        </button>
        <div className="dashboard-identity">
          <span className="dashboard-avatar">{kid.avatar}</span>
          <div>
            <h1 className="dashboard-name">{kid.name}</h1>
            <p className="dashboard-stars">⭐ {balance} stars</p>
          </div>
        </div>
      </header>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="progress-label">
        {completedCount} of {chores.length} chores done today
      </p>

      <div className="tab-row">
        <button className={`tab-btn ${tab === "chores" ? "active" : ""}`} onClick={() => setTab("chores")}>
          ✅ Today's Chores
        </button>
        <button className={`tab-btn ${tab === "rewards" ? "active" : ""}`} onClick={() => setTab("rewards")}>
          🎁 Rewards Store
        </button>
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          📅 History
        </button>
      </div>

      {tab === "chores" && <ChoreList chores={chores} onToggle={toggleChore} />}
      {tab === "rewards" && (
        <RewardsStore rewards={rewards} balance={balance} onRedeem={redeemReward} />
      )}
      {tab === "history" && <HistoryView kidId={kid.id} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
