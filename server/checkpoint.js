import { createClient } from "@libsql/client";

const db = createClient({ url: "file:./data/chore-tracker.db" });
await db.execute("PRAGMA wal_checkpoint(TRUNCATE)");
console.log("Checkpoint done");