import { createClient } from "@libsql/client";

const source = createClient({ url: "file:./data/chore-tracker.db" });
const target = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await target.executeMultiple(`
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

const deleteOrder = ["completions", "redemptions", "chores", "rewards", "kids"];
for (const table of deleteOrder) {
  await target.execute(`DELETE FROM ${table}`);
}

const insertOrder = ["kids", "chores", "rewards", "completions", "redemptions"];
for (const table of insertOrder) {
  const result = await source.execute(`SELECT * FROM ${table}`);
  for (const row of result.rows) {
    const cols = result.columns;
    const placeholders = cols.map(() => "?").join(", ");
    const args = cols.map((c) => row[c]);
    await target.execute({
      sql: `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      args,
    });
  }
  console.log(`${table}: migrated ${result.rows.length} rows`);
}

console.log("Migration complete");