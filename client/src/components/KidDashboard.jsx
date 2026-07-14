import { useEffect, useState } from "react";
import { api, todayStr } from "../api.js";
import ChoreList from "./ChoreList.jsx";
import RewardsStore from "./RewardsStore.jsx";
import HistoryView from "./HistoryView.jsx";

const CHEERS = ["Awesome job! 🎉", "You're a star! 🌟", "Way to go! 🙌", "Amazing! ✨", "Nailed it! 💪"];

function shiftDate(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateLabel(dateStr, today) {
  if (dateStr === today) return "Today";
  if (dateStr === shiftDate(today, -1)) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function KidDashboard({ kid, onBack, onKidUpdated }) {
  const [tab, setTab] = useState("chores");
  const [chores, setChores] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState(kid.stars.balance);
  const [toast, setToast] = useState(null);
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    api.getChores(kid.id, date).then(setChores);
  }, [kid.id, date]);

  useEffect(() => {
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
  const isToday = date === todayStr();

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
        {completedCount} of {chores.length} chores done {isToday ? "today" : `on ${formatDateLabel(date, todayStr())}`}
      </p>

      <div className="tab-row">
        <button className={`tab-btn ${tab === "chores" ? "active" : ""}`} onClick={() => setTab("chores")}>
          ✅ Chores
        </button>
        <button className={`tab-btn ${tab === "rewards" ? "active" : ""}`} onClick={() => setTab("rewards")}>
          🎁 Rewards Store
        </button>
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          📅 History
        </button>
      </div>

      {tab === "chores" && (
        <>
          <div className="history-date-row">
            <button className="btn btn-ghost" onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="Previous day">
              ◀
            </button>
            <span className="field-label" style={{ margin: 0, minWidth: 110, textAlign: "center" }}>
              {formatDateLabel(date, todayStr())}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => setDate((d) => shiftDate(d, 1))}
              disabled={isToday}
              aria-label="Next day"
            >
              ▶
            </button>
            <input
              type="date"
              className="text-input"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
            />
            {!isToday && (
              <button className="btn btn-ghost" onClick={() => setDate(todayStr())}>
                Today
              </button>
            )}
          </div>
          <ChoreList chores={chores} onToggle={toggleChore} />
        </>
      )}
      {tab === "rewards" && (
        <RewardsStore rewards={rewards} balance={balance} onRedeem={redeemReward} />
      )}
      {tab === "history" && <HistoryView kidId={kid.id} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
