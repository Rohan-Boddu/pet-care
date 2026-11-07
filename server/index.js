import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import { app } from "./app.js";
import { db } from "./database.js";

const distDirectory = resolve("dist");
if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(resolve(distDirectory, "index.html"));
  });
}

const port = Number(process.env.PORT || 3001);
const host = process.env.PAWCARE_HOST || "127.0.0.1";
const server = app.listen(port, host, () => {
  console.log(`PawCare API listening on http://${host}:${port}`);
  console.log("SQLite database:", process.env.PAWCARE_DB_PATH || "data/pawcare.sqlite");
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
