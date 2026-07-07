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
  const { title, icon = "⭐", stars = 1, remarks = "" } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  const info = db
    .prepare(
      "INSERT INTO chores (kid_id, title, icon, stars, remarks) VALUES (?, ?, ?, ?, ?)"
    )
    .run(req.params.id, title.trim(), icon, Number(stars) || 0, (remarks || "").trim());
  const chore = db.prepare("SELECT * FROM chores WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ ...chore, done: false });
});

router.put("/chores/:id", (req, res) => {
  const chore = db.prepare("SELECT * FROM chores WHERE id = ?").get(req.params.id);
  if (!chore) return res.status(404).json({ error: "Chore not found" });

  const title = req.body.title !== undefined ? req.body.title.trim() : chore.title;
  if (!title) return res.status(400).json({ error: "Title is required" });
  const icon = req.body.icon !== undefined ? req.body.icon : chore.icon;
  const stars = req.body.stars !== undefined ? Number(req.body.stars) || 0 : chore.stars;
  const remarks = req.body.remarks !== undefined ? req.body.remarks.trim() : chore.remarks;

  db.prepare(
    "UPDATE chores SET title = ?, icon = ?, stars = ?, remarks = ? WHERE id = ?"
  ).run(title, icon, stars, remarks, chore.id);

  const updated = db.prepare("SELECT * FROM chores WHERE id = ?").get(chore.id);
  res.json(updated);
});

router.delete("/chores/:id", (req, res) => {
  db.prepare("UPDATE chores SET active = 0 WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// ---- Copy chores between kids ----
router.post("/kids/:id/chores/copy", (req, res) => {
  const targetId = Number(req.params.id);
  const sourceId = Number(req.body.sourceKidId);

  if (!sourceId || sourceId === targetId) {
    return res.status(400).json({ error: "Pick a different kid to copy chores from" });
  }

  const sourceChores = db
    .prepare("SELECT * FROM chores WHERE kid_id = ? AND active = 1")
    .all(sourceId);
  const existingTitles = new Set(
    db
      .prepare("SELECT LOWER(title) AS t FROM chores WHERE kid_id = ? AND active = 1")
      .all(targetId)
      .map((r) => r.t)
  );
  const insertChore = db.prepare(
    "INSERT INTO chores (kid_id, title, icon, stars, remarks) VALUES (?, ?, ?, ?, ?)"
  );

  const copy = db.transaction((rows) => {
    let count = 0;
    for (const c of rows) {
      if (existingTitles.has(c.title.toLowerCase())) continue;
      insertChore.run(targetId, c.title, c.icon, c.stars, c.remarks || "");
      count++;
    }
    return count;
  });
  const copiedCount = copy(sourceChores);

  const date = todayStr();
  const chores = db
    .prepare(
      `SELECT c.*, EXISTS(
         SELECT 1 FROM completions co WHERE co.chore_id = c.id AND co.date = ?
       ) AS done
       FROM chores c
       WHERE c.kid_id = ? AND c.active = 1
       ORDER BY c.id`
    )
    .all(date, targetId);

  res.status(201).json({
    copiedCount,
    chores: chores.map((c) => ({ ...c, done: !!c.done })),
  });
});

// ---- History ----
router.get("/kids/:id/history", (req, res) => {
  const kidId = req.params.id;
  const date = req.query.date || todayStr();

  const completions = db
    .prepare(
      `SELECT co.id AS completion_id, co.date, co.completed_at,
              c.id AS chore_id, c.title, c.icon, c.stars, c.remarks
       FROM completions co
       JOIN chores c ON c.id = co.chore_id
       WHERE co.kid_id = ? AND co.date = ?
       ORDER BY co.completed_at`
    )
    .all(kidId, date);

  const redemptions = db
    .prepare(
      `SELECT re.id, re.redeemed_at, r.id AS reward_id, r.title, r.icon, r.cost
       FROM redemptions re
       JOIN rewards r ON r.id = re.reward_id
       WHERE re.kid_id = ? AND substr(re.redeemed_at, 1, 10) = ?
       ORDER BY re.redeemed_at`
    )
    .all(kidId, date);

  const earned = completions.reduce((sum, c) => sum + c.stars, 0);
  const spent = redemptions.reduce((sum, r) => sum + r.cost, 0);

  const earnedThrough = db
    .prepare(
      `SELECT COALESCE(SUM(c.stars), 0) AS total
       FROM completions co JOIN chores c ON c.id = co.chore_id
       WHERE co.kid_id = ? AND co.date <= ?`
    )
    .get(kidId, date).total;
  const spentThrough = db
    .prepare(
      `SELECT COALESCE(SUM(r.cost), 0) AS total
       FROM redemptions re JOIN rewards r ON r.id = re.reward_id
       WHERE re.kid_id = ? AND substr(re.redeemed_at, 1, 10) <= ?`
    )
    .get(kidId, date).total;

  res.json({
    date,
    completions,
    redemptions,
    earned,
    spent,
    net: earned - spent,
    balanceThrough: earnedThrough - spentThrough,
  });
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

// ---- Redemption history / reset ----
router.get("/kids/:id/redemptions", (req, res) => {
  const redemptions = db
    .prepare(
      `SELECT re.id, re.redeemed_at, r.id AS reward_id, r.title, r.icon, r.cost
       FROM redemptions re
       JOIN rewards r ON r.id = re.reward_id
       WHERE re.kid_id = ?
       ORDER BY re.redeemed_at DESC
       LIMIT 50`
    )
    .all(req.params.id);
  res.json(redemptions);
});

router.delete("/redemptions/:id", (req, res) => {
  const redemption = db.prepare("SELECT * FROM redemptions WHERE id = ?").get(req.params.id);
  if (!redemption) return res.status(404).json({ error: "Redemption not found" });

  db.prepare("DELETE FROM redemptions WHERE id = ?").run(redemption.id);
  res.json({ ok: true, stars: kidStars(redemption.kid_id) });
});
