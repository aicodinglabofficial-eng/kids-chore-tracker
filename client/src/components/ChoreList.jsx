export default function ChoreList({ chores, onToggle }) {
  if (chores.length === 0) {
    return <p className="empty-hint">No chores yet — ask a grown-up to add some in the Parent Zone!</p>;
  }

  return (
    <div className="chore-list">
      {chores.map((chore) => (
        <button
          key={chore.id}
          className={`chore-card ${chore.done ? "done" : ""}`}
          onClick={() => onToggle(chore)}
        >
          <span className="chore-icon">{chore.icon}</span>
          <span className="chore-title">
            {chore.title}
            {chore.remarks && <span className="chore-remarks">{chore.remarks}</span>}
          </span>
          <span className={`chore-stars ${chore.stars < 0 ? "negative" : ""}`}>
            {chore.stars >= 0 ? "+" : ""}{chore.stars}⭐
          </span>
          <span className="chore-check">{chore.done ? "✅" : "⬜"}</span>
        </button>
      ))}
    </div>
  );
}
