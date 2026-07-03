import { Router } from "express";
import { db } from "./db.js";

export const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function kidStars(kidId) {
  const earned = db
    .prepare(
      `SELECT COALESCE(SUM(c.stars), 0) AS total
       FROM completions co
       JOIN chores c ON c.id = co.chore_id
       WHERE co.kid_id = ?`
    )
    .get(kidId).total;
  const spent = db
    .prepare(
      `SELECT COALESCE(SUM(r.cost), 0) AS total
       FROM redemptions re
       JOIN rewards r ON r.id = re.reward_id
       WHERE re.kid_id = ?`
    )
    .get(kidId).total;
  return { earned, spent, balance: earned - spent };
}

// ---- Kids ----
router.get("/kids", (req, res) => {
  const kids = db.prepare("SELECT * FROM kids ORDER BY id").all();
  res.json(kids.map((k) => ({ ...k, stars: kidStars(k.id) })));
});

router.post("/kids", (req, res) => {
  const { name, avatar = "🦊", color = "#7C5CFC" } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const info = db
    .prepare("INSERT INTO kids (name, avatar, color) VALUES (?, ?, ?)")
    .run(name.trim(), avatar, color);
  const kid = db.prepare("SELECT * FROM kids WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ ...kid, stars: kidStars(kid.id) });
});

router.delete("/kids/:id", (req, res) => {
  db.prepare("DELETE FROM kids WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// ---- Chores ----
router.get("/kids/:id/chores", (req, res) => {
  const date = req.query.date || todayStr();
  const chores = db
    .prepare(
      `SELECT c.*, EXISTS(
         SELECT 1 FROM completions co WHERE co.chore_id = c.id AND co.date = ?
       ) AS done
       FROM chores c
       WHERE c.kid_id = ? AND c.active = 1
       ORDER BY c.id`
    )
    .all(date, req.params.id);
  res.json(chores.map((c) => ({ ...c, done: !!c.done })));
});

router.post("/kids/:id/chores", (req, res) => {
  const { title, icon = "⭐", stars = 1 } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  const info = db
    .prepare(
      "INSERT INTO chores (kid_id, title, icon, stars) VALUES (?, ?, ?, ?)"
    )
    .run(req.params.id, title.trim(), icon, Number(stars) || 1);
  const chore = db.prepare("SELECT * FROM chores WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ ...chore, done: false });
});

router.delete("/chores/:id", (req, res) => {
  db.prepare("UPDATE chores SET active = 0 WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

router.post("/chores/:id/toggle", (req, res) => {
  const date = req.body.date || todayStr();
  const chore = db.prepare("SELECT * FROM chores WHERE id = ?").get(req.params.id);
  if (!chore) return res.status(404).json({ error: "Chore not found" });

  const existing = db
    .prepare("SELECT id FROM completions WHERE chore_id = ? AND date = ?")
    .get(chore.id, date);

  if (existing) {
    db.prepare("DELETE FROM completions WHERE id = ?").run(existing.id);
  } else {
    db.prepare(
      "INSERT INTO completions (chore_id, kid_id, date) VALUES (?, ?, ?)"
    ).run(chore.id, chore.kid_id, date);
  }

  res.json({
    chore: { ...chore, done: !existing },
    stars: kidStars(chore.kid_id),
  });
});

// ---- Rewards ----
router.get("/kids/:id/rewards", (req, res) => {
  const rewards = db
    .prepare(
      "SELECT * FROM rewards WHERE kid_id = ? AND active = 1 ORDER BY cost ASC"
    )
    .all(req.params.id);
  res.json(rewards);
});

router.post("/kids/:id/rewards", (req, res) => {
  const { title, icon = "🎁", cost = 5 } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  const info = db
    .prepare(
      "INSERT INTO rewards (kid_id, title, icon, cost) VALUES (?, ?, ?, ?)"
    )
    .run(req.params.id, title.trim(), icon, Number(cost) || 5);
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(reward);
});

router.delete("/rewards/:id", (req, res) => {
  db.prepare("UPDATE rewards SET active = 0 WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

router.post("/rewards/:id/redeem", (req, res) => {
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ?").get(req.params.id);
  if (!reward) return res.status(404).json({ error: "Reward not found" });

  const stars = kidStars(reward.kid_id);
  if (stars.balance < reward.cost) {
    return res.status(400).json({ error: "Not enough stars yet!" });
  }

  db.prepare(
    "INSERT INTO redemptions (reward_id, kid_id) VALUES (?, ?)"
  ).run(reward.id, reward.kid_id);

  res.status(201).json({ reward, stars: kidStars(reward.kid_id) });
});
