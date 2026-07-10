import { Router } from "express";
import { db } from "./db.js";

export const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function get(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows[0];
}

async function all(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows;
}

async function run(sql, args = []) {
  return db.execute({ sql, args });
}

async function kidStars(kidId) {
  const earnedRow = await get(
    `SELECT COALESCE(SUM(c.stars), 0) AS total
     FROM completions co
     JOIN chores c ON c.id = co.chore_id
     WHERE co.kid_id = ?`,
    [kidId]
  );
  const spentRow = await get(
    `SELECT COALESCE(SUM(r.cost), 0) AS total
     FROM redemptions re
     JOIN rewards r ON r.id = re.reward_id
     WHERE re.kid_id = ?`,
    [kidId]
  );
  const earned = Number(earnedRow.total);
  const spent = Number(spentRow.total);
  return { earned, spent, balance: earned - spent };
}

// ---- Kids ----
router.get("/kids", async (req, res) => {
  const kids = await all("SELECT * FROM kids ORDER BY id");
  const withStars = await Promise.all(
    kids.map(async (k) => ({ ...k, stars: await kidStars(k.id) }))
  );
  res.json(withStars);
});

router.post("/kids", async (req, res) => {
  const { name, avatar = "🦊", color = "#7C5CFC" } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const info = await run("INSERT INTO kids (name, avatar, color) VALUES (?, ?, ?)", [
    name.trim(),
    avatar,
    color,
  ]);
  const kid = await get("SELECT * FROM kids WHERE id = ?", [Number(info.lastInsertRowid)]);
  res.status(201).json({ ...kid, stars: await kidStars(kid.id) });
});

router.delete("/kids/:id", async (req, res) => {
  await run("DELETE FROM kids WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

// ---- Chore Templates ----
router.get("/chore-templates", async (req, res) => {
  const templates = await all("SELECT * FROM chore_templates ORDER BY sort_order ASC, id ASC");
  res.json(templates);
});

router.post("/chore-templates", async (req, res) => {
  const { title, icon = "⭐" } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
  const existing = await get("SELECT * FROM chore_templates WHERE LOWER(title) = LOWER(?)", [title.trim()]);
  if (existing) return res.json(existing);
  const maxRow = await get("SELECT COALESCE(MAX(sort_order), -1) AS m FROM chore_templates");
  const info = await run(
    "INSERT INTO chore_templates (title, icon, sort_order) VALUES (?, ?, ?)",
    [title.trim(), icon, Number(maxRow.m) + 1]
  );
  const template = await get("SELECT * FROM chore_templates WHERE id = ?", [Number(info.lastInsertRowid)]);
  res.status(201).json(template);
});

// ---- Chores ----
router.get("/kids/:id/chores", async (req, res) => {
  const date = req.query.date || todayStr();
  const chores = await all(
    `SELECT c.*, EXISTS(
       SELECT 1 FROM completions co WHERE co.chore_id = c.id AND co.date = ?
     ) AS done
     FROM chores c
     WHERE c.kid_id = ? AND c.active = 1
     ORDER BY c.sort_order ASC, c.id ASC`,
    [date, req.params.id]
  );
  res.json(chores.map((c) => ({ ...c, done: !!c.done })));
});

router.post("/kids/:id/chores", async (req, res) => {
  const { title, icon = "⭐", stars = 1, remarks = "" } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  // Find or create a template for this chore title so it appears in future dropdowns
  let template = await get("SELECT * FROM chore_templates WHERE LOWER(title) = LOWER(?)", [title.trim()]);
  if (!template) {
    const maxT = await get("SELECT COALESCE(MAX(sort_order), -1) AS m FROM chore_templates");
    const tInfo = await run(
      "INSERT INTO chore_templates (title, icon, sort_order) VALUES (?, ?, ?)",
      [title.trim(), icon, Number(maxT.m) + 1]
    );
    template = await get("SELECT * FROM chore_templates WHERE id = ?", [Number(tInfo.lastInsertRowid)]);
  }
  const maxRow = await get(
    "SELECT COALESCE(MAX(sort_order), -1) AS m FROM chores WHERE kid_id = ? AND active = 1",
    [req.params.id]
  );
  const info = await run(
    "INSERT INTO chores (kid_id, title, icon, stars, remarks, sort_order, template_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.params.id, title.trim(), icon, Number(stars) || 0, (remarks || "").trim(), Number(maxRow.m) + 1, template.id]
  );
  const chore = await get("SELECT * FROM chores WHERE id = ?", [Number(info.lastInsertRowid)]);
  res.status(201).json({ ...chore, done: false });
});

router.put("/kids/:id/chores/reorder", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  for (let i = 0; i < ids.length; i++) {
    await run("UPDATE chores SET sort_order = ? WHERE id = ? AND kid_id = ?", [i, ids[i], req.params.id]);
  }
  res.json({ ok: true });
});

router.put("/chores/:id", async (req, res) => {
  const chore = await get("SELECT * FROM chores WHERE id = ?", [req.params.id]);
  if (!chore) return res.status(404).json({ error: "Chore not found" });

  const title = req.body.title !== undefined ? req.body.title.trim() : chore.title;
  if (!title) return res.status(400).json({ error: "Title is required" });
  const icon = req.body.icon !== undefined ? req.body.icon : chore.icon;
  const stars = req.body.stars !== undefined ? Number(req.body.stars) || 0 : chore.stars;
  const remarks = req.body.remarks !== undefined ? req.body.remarks.trim() : chore.remarks;

  await run("UPDATE chores SET title = ?, icon = ?, stars = ?, remarks = ? WHERE id = ?", [
    title,
    icon,
    stars,
    remarks,
    chore.id,
  ]);

  const updated = await get("SELECT * FROM chores WHERE id = ?", [chore.id]);
  res.json(updated);
});

router.delete("/chores/:id", async (req, res) => {
  await run("UPDATE chores SET active = 0 WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

// ---- Copy chores between kids ----
router.post("/kids/:id/chores/copy", async (req, res) => {
  const targetId = Number(req.params.id);
  const sourceId = Number(req.body.sourceKidId);

  if (!sourceId || sourceId === targetId) {
    return res.status(400).json({ error: "Pick a different kid to copy chores from" });
  }

  const sourceChores = await all("SELECT * FROM chores WHERE kid_id = ? AND active = 1", [
    sourceId,
  ]);
  const existingRows = await all(
    "SELECT LOWER(title) AS t FROM chores WHERE kid_id = ? AND active = 1",
    [targetId]
  );
  const existingTitles = new Set(existingRows.map((r) => r.t));

  let copiedCount = 0;
  for (const c of sourceChores) {
    if (existingTitles.has(c.title.toLowerCase())) continue;
    await run(
      "INSERT INTO chores (kid_id, title, icon, stars, remarks) VALUES (?, ?, ?, ?, ?)",
      [targetId, c.title, c.icon, c.stars, c.remarks || ""]
    );
    copiedCount++;
  }

  const date = todayStr();
  const chores = await all(
    `SELECT c.*, EXISTS(
       SELECT 1 FROM completions co WHERE co.chore_id = c.id AND co.date = ?
     ) AS done
     FROM chores c
     WHERE c.kid_id = ? AND c.active = 1
     ORDER BY c.id`,
    [date, targetId]
  );

  res.status(201).json({
    copiedCount,
    chores: chores.map((c) => ({ ...c, done: !!c.done })),
  });
});

// ---- History ----
router.get("/kids/:id/history", async (req, res) => {
  const kidId = req.params.id;
  const date = req.query.date || todayStr();

  const completions = await all(
    `SELECT co.id AS completion_id, co.date, co.completed_at,
            c.id AS chore_id, c.title, c.icon, c.stars, c.remarks
     FROM completions co
     JOIN chores c ON c.id = co.chore_id
     WHERE co.kid_id = ? AND co.date = ?
     ORDER BY co.completed_at`,
    [kidId, date]
  );

  const redemptions = await all(
    `SELECT re.id, re.redeemed_at, r.id AS reward_id, r.title, r.icon, r.cost
     FROM redemptions re
     JOIN rewards r ON r.id = re.reward_id
     WHERE re.kid_id = ? AND substr(re.redeemed_at, 1, 10) = ?
     ORDER BY re.redeemed_at`,
    [kidId, date]
  );

  const earned = completions.reduce((sum, c) => sum + c.stars, 0);
  const spent = redemptions.reduce((sum, r) => sum + r.cost, 0);

  const earnedThroughRow = await get(
    `SELECT COALESCE(SUM(c.stars), 0) AS total
     FROM completions co JOIN chores c ON c.id = co.chore_id
     WHERE co.kid_id = ? AND co.date <= ?`,
    [kidId, date]
  );
  const spentThroughRow = await get(
    `SELECT COALESCE(SUM(r.cost), 0) AS total
     FROM redemptions re JOIN rewards r ON r.id = re.reward_id
     WHERE re.kid_id = ? AND substr(re.redeemed_at, 1, 10) <= ?`,
    [kidId, date]
  );

  res.json({
    date,
    completions,
    redemptions,
    earned,
    spent,
    net: earned - spent,
    balanceThrough: Number(earnedThroughRow.total) - Number(spentThroughRow.total),
  });
});

router.post("/chores/:id/toggle", async (req, res) => {
  const date = req.body.date || todayStr();
  const chore = await get("SELECT * FROM chores WHERE id = ?", [req.params.id]);
  if (!chore) return res.status(404).json({ error: "Chore not found" });

  const existing = await get("SELECT id FROM completions WHERE chore_id = ? AND date = ?", [
    chore.id,
    date,
  ]);

  if (existing) {
    await run("DELETE FROM completions WHERE id = ?", [existing.id]);
  } else {
    await run("INSERT INTO completions (chore_id, kid_id, date) VALUES (?, ?, ?)", [
      chore.id,
      chore.kid_id,
      date,
    ]);
  }

  res.json({
    chore: { ...chore, done: !existing },
    stars: await kidStars(chore.kid_id),
  });
});

// ---- Rewards ----
router.get("/kids/:id/rewards", async (req, res) => {
  const rewards = await all(
    "SELECT * FROM rewards WHERE kid_id = ? AND active = 1 ORDER BY cost ASC",
    [req.params.id]
  );
  res.json(rewards);
});

router.post("/kids/:id/rewards", async (req, res) => {
  const { title, icon = "🎁", cost = 5 } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  const info = await run("INSERT INTO rewards (kid_id, title, icon, cost) VALUES (?, ?, ?, ?)", [
    req.params.id,
    title.trim(),
    icon,
    Number(cost) || 5,
  ]);
  const reward = await get("SELECT * FROM rewards WHERE id = ?", [Number(info.lastInsertRowid)]);
  res.status(201).json(reward);
});

router.delete("/rewards/:id", async (req, res) => {
  await run("UPDATE rewards SET active = 0 WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

router.post("/rewards/:id/redeem", async (req, res) => {
  const reward = await get("SELECT * FROM rewards WHERE id = ?", [req.params.id]);
  if (!reward) return res.status(404).json({ error: "Reward not found" });

  const stars = await kidStars(reward.kid_id);
  if (stars.balance < reward.cost) {
    return res.status(400).json({ error: "Not enough stars yet!" });
  }

  await run("INSERT INTO redemptions (reward_id, kid_id) VALUES (?, ?)", [
    reward.id,
    reward.kid_id,
  ]);

  res.status(201).json({ reward, stars: await kidStars(reward.kid_id) });
});

// ---- Redemption history / reset ----
router.get("/kids/:id/redemptions", async (req, res) => {
  const redemptions = await all(
    `SELECT re.id, re.redeemed_at, r.id AS reward_id, r.title, r.icon, r.cost
     FROM redemptions re
     JOIN rewards r ON r.id = re.reward_id
     WHERE re.kid_id = ?
     ORDER BY re.redeemed_at DESC
     LIMIT 50`,
    [req.params.id]
  );
  res.json(redemptions);
});

router.delete("/redemptions/:id", async (req, res) => {
  const redemption = await get("SELECT * FROM redemptions WHERE id = ?", [req.params.id]);
  if (!redemption) return res.status(404).json({ error: "Redemption not found" });

  await run("DELETE FROM redemptions WHERE id = ?", [redemption.id]);
  res.json({ ok: true, stars: await kidStars(redemption.kid_id) });
});
