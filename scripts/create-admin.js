import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { db } from "../server/database.js";

const email = (process.argv[2] || "admin@pawcare.local").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run admin:create -- [person@example.com]");
  process.exitCode = 1;
} else {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    console.log(`Granted admin access to ${email}. Sign out and sign back in to refresh the account.`);
  } else {
    const password = randomBytes(24).toString("base64url");
    const salt = randomBytes(16);
    const passwordHash = scryptSync(password, salt, 64);
    db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, password_salt, role, created_at)
      VALUES (?, 'PawCare Admin', ?, '', ?, ?, 'admin', ?)
    `).run(randomUUID(), email, passwordHash.toString("hex"), salt.toString("hex"), new Date().toISOString());
    console.log(`Admin account created.\nEmail: ${email}\nPassword: ${password}\nSave this password now; it will not be shown again.`);
  }
}
db.close();
