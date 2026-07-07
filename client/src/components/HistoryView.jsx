import { useEffect, useState } from "react";
import { api, todayStr } from "../api.js";

export default function HistoryView({ kidId }) {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api.getHistory(kidId, date).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [kidId, date]);

  return (
    <div className="history-view">
      <div className="history-date-row">
        <label className="field-label" htmlFor="history-date">Pick a date</label>
        <input
          id="history-date"
          type="date"
          className="text-input"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {!data ? (
        <p className="empty-hint">Loading…</p>
      ) : (
        <>
          <div className="history-summary">
            <div className="history-stat">
              <span className="history-stat-label">Earned</span>
              <span className="history-stat-value">+{data.earned}⭐</span>
            </div>
            <div className="history-stat">
              <span className="history-stat-label">Spent</span>
              <span className="history-stat-value">-{data.spent}⭐</span>
            </div>
            <div className="history-stat">
              <span className="history-stat-label">Day's score</span>
              <span className={`history-stat-value ${data.net < 0 ? "negative" : ""}`}>
                {data.net >= 0 ? "+" : ""}{data.net}⭐
              </span>
            </div>
            <div className="history-stat">
              <span className="history-stat-label">Balance through this day</span>
              <span className={`history-stat-value ${data.balanceThrough < 0 ? "negative" : ""}`}>
                {data.balanceThrough}⭐
              </span>
            </div>
          </div>

          <h3 className="history-section-title">Chores completed</h3>
          {data.completions.length === 0 ? (
            <p className="empty-hint">No chores completed on this day.</p>
          ) : (
            <ul className="manage-list">
              {data.completions.map((c) => (
                <li key={c.completion_id}>
                  <span>
                    {c.icon} {c.title}
                    {c.remarks && <span className="chore-remarks">{c.remarks}</span>}
                  </span>
                  <span className={`manage-meta ${c.stars < 0 ? "negative" : ""}`}>
                    {c.stars >= 0 ? "+" : ""}{c.stars}⭐
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="history-section-title">Rewards claimed</h3>
          {data.redemptions.length === 0 ? (
            <p className="empty-hint">No rewards claimed on this day.</p>
          ) : (
            <ul className="manage-list">
              {data.redemptions.map((r) => (
                <li key={r.id}>
                  <span>{r.icon} {r.title}</span>
                  <span className="manage-meta negative">-{r.cost}⭐</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
