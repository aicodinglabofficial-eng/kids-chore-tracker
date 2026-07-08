import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "chore-tracker.db");

const url = process.env.TURSO_DATABASE_URL || `file:${dbPath}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(authToken ? { url, authToken } : { url });

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS kids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🦊',
    color TEXT NOT NULL DEFAULT '#7C5CFC',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '⭐',
    stars INTEGER NOT NULL DEFAULT 1,
    remarks TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(chore_id, date)
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🎁',
    cost INTEGER NOT NULL DEFAULT 5,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
    redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const choreColsResult = await db.execute("PRAGMA table_info(chores)");
const choreCols = choreColsResult.rows.map((r) => r.name);
if (!choreCols.includes("remarks")) {
  await db.execute("ALTER TABLE chores ADD COLUMN remarks TEXT NOT NULL DEFAULT ''");
}

const kidCount = (await db.execute("SELECT COUNT(*) AS n FROM kids")).rows[0].n;

if (kidCount === 0) {
  const mia = await db.execute({
    sql: "INSERT INTO kids (name, avatar, color) VALUES (?, ?, ?)",
    args: ["Mia", "🦄", "#FF6FA5"],
  });
  const leo = await db.execute({
    sql: "INSERT INTO kids (name, avatar, color) VALUES (?, ?, ?)",
    args: ["Leo", "🐯", "#3DB2FF"],
  });

  const kidIds = [Number(mia.lastInsertRowid), Number(leo.lastInsertRowid)];
  const starterChores = [
    ["Brush teeth", "🦷", 2],
    ["Make bed", "🛏️", 2],
    ["Homework time", "📚", 3],
    ["Feed the pet", "🐶", 2],
    ["Tidy up toys", "🧸", 2],
  ];
  const starterRewards = [
    ["Extra story time", "📖", 8],
    ["Choose dinner", "🍕", 12],
    ["Movie night", "🎬", 20],
  ];

  for (const kidId of kidIds) {
    for (const [title, icon, stars] of starterChores) {
      await db.execute({
        sql: "INSERT INTO chores (kid_id, title, icon, stars) VALUES (?, ?, ?, ?)",
        args: [kidId, title, icon, stars],
      });
    }
    for (const [title, icon, cost] of starterRewards) {
      await db.execute({
        sql: "INSERT INTO rewards (kid_id, title, icon, cost) VALUES (?, ?, ?, ?)",
        args: [kidId, title, icon, cost],
      });
    }
  }
}
