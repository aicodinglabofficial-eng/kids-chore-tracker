import express from "express";
import cors from "cors";
import "./db.js";
import { router } from "./routes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/api", router);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Kids Chore Tracker API running on http://localhost:${PORT}`);
});
