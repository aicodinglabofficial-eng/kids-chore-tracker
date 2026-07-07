import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "chore-tracker.db");

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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

const choreCols = db.prepare("PRAGMA table_info(chores)").all().map((c) => c.name);
if (!choreCols.includes("remarks")) {
  db.exec("ALTER TABLE chores ADD COLUMN remarks TEXT NOT NULL DEFAULT ''");
}

const kidCount = db.prepare("SELECT COUNT(*) AS n FROM kids").get().n;

if (kidCount === 0) {
  const insertKid = db.prepare(
    "INSERT INTO kids (name, avatar, color) VALUES (?, ?, ?)"
  );
  const insertChore = db.prepare(
    "INSERT INTO chores (kid_id, title, icon, stars) VALUES (?, ?, ?, ?)"
  );
  const insertReward = db.prepare(
    "INSERT INTO rewards (kid_id, title, icon, cost) VALUES (?, ?, ?, ?)"
  );

  const seed = db.transaction(() => {
    const mia = insertKid.run("Mia", "🦄", "#FF6FA5").lastInsertRowid;
    const leo = insertKid.run("Leo", "🐯", "#3DB2FF").lastInsertRowid;

    for (const [kidId] of [[mia], [leo]]) {
      insertChore.run(kidId, "Brush teeth", "🦷", 2);
      insertChore.run(kidId, "Make bed", "🛏️", 2);
      insertChore.run(kidId, "Homework time", "📚", 3);
      insertChore.run(kidId, "Feed the pet", "🐶", 2);
      insertChore.run(kidId, "Tidy up toys", "🧸", 2);

      insertReward.run(kidId, "Extra story time", "📖", 8);
      insertReward.run(kidId, "Choose dinner", "🍕", 12);
      insertReward.run(kidId, "Movie night", "🎬", 20);
    }
  });
  seed();
}
