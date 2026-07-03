export default function RewardsStore({ rewards, balance, onRedeem }) {
  if (rewards.length === 0) {
    return <p className="empty-hint">No rewards yet — ask a grown-up to add some in the Parent Zone!</p>;
  }

  return (
    <div className="reward-grid">
      {rewards.map((reward) => {
        const affordable = balance >= reward.cost;
        return (
          <div key={reward.id} className={`reward-card ${affordable ? "" : "locked"}`}>
            <span className="reward-icon">{reward.icon}</span>
            <span className="reward-title">{reward.title}</span>
            <span className="reward-cost">{reward.cost}⭐</span>
            <button
              className="btn btn-primary reward-btn"
              disabled={!affordable}
              onClick={() => onRedeem(reward)}
            >
              {affordable ? "Redeem" : "Not enough yet"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
