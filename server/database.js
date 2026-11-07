import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const databasePath = resolve(process.env.PAWCARE_DB_PATH || "data/pawcare.sqlite");
const dataDirectory = dirname(databasePath);
mkdirSync(dataDirectory, { recursive: true });

export let sessionSecret = process.env.PAWCARE_SESSION_SECRET;
if (!sessionSecret) {
  const secretPath = resolve(dataDirectory, "session-secret");
  try {
    sessionSecret = readFileSync(secretPath, "utf8").trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    sessionSecret = randomUUID() + randomUUID();
    try {
      writeFileSync(secretPath, sessionSecret, { flag: "wx", mode: 0o600 });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
      sessionSecret = readFileSync(secretPath, "utf8").trim();
    }
    if (process.platform !== "win32") chmodSync(secretPath, 0o600);
  }
}

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));

export function transaction(callback) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const defaultAdminEmail = "admin@pawcare.local";
const adminCredentialsPath = resolve(dataDirectory, "admin-credentials.txt");

function saveAdminCredentials(email, password) {
  writeFileSync(adminCredentialsPath, `Email: ${email}\nPassword: ${password}\n`, { mode: 0o600 });
  if (process.platform !== "win32") chmodSync(adminCredentialsPath, 0o600);
}

function adminCredentialsMatch(email) {
  try {
    const [savedEmail, savedPassword] = readFileSync(adminCredentialsPath, "utf8").split(/\r?\n/);
    return savedEmail === `Email: ${email}` && savedPassword?.startsWith("Password: ");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return false;
  }
}

function rotateAdminPassword(admin) {
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16);
  const passwordHash = scryptSync(password, salt, 64);
  db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
    .run(passwordHash.toString("hex"), salt.toString("hex"), admin.id);
  saveAdminCredentials(admin.email, password);
  return { email: admin.email, password };
}

const admins = db.prepare(`
  SELECT id, email FROM users WHERE role = 'admin'
  ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END, created_at, id
`).all(defaultAdminEmail);
if (admins.length > 1) {
  transaction(() => {
    db.prepare("UPDATE users SET role = 'adopter' WHERE role = 'admin' AND id <> ?").run(admins[0].id);
  });
}

let admin = admins[0];
if (!admin) {
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16);
  const passwordHash = scryptSync(password, salt, 64);
  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, password_salt, role, created_at)
    VALUES (?, 'PawCare Admin', ?, '', ?, ?, 'admin', ?)
  `).run(id, defaultAdminEmail, passwordHash.toString("hex"), salt.toString("hex"), new Date().toISOString());
  admin = { id, email: defaultAdminEmail };
  saveAdminCredentials(admin.email, password);
} else if (!adminCredentialsMatch(admin.email)) {
  rotateAdminPassword(admin);
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin ON users(role) WHERE role = 'admin';");

export function resetAdminPassword() {
  const soleAdmin = db.prepare("SELECT id, email FROM users WHERE role = 'admin'").get();
  if (!soleAdmin) throw new Error("The PawCare admin account is missing.");
  return rotateAdminPassword(soleAdmin);
}

const initialPets = [
  ["Bruno", "Dog", "Labrador", "2 years", "Male", "Vijayawada", "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80", "Bruno is a sweet yellow lab who loves fetch, swimming, and cuddles.", "Full (Rabies, DHPP)", "Healthy & neutered", "Playful, loving"],
  ["Luna", "Cat", "Persian", "1 year", "Female", "Guntur", "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80", "Luna adores sunny windowsills and gentle brushings.", "Vaccinated & dewormed", "Spayed, clean coat", "Calm, regal"],
  ["Max", "Dog", "Golden Retriever", "3 years", "Male", "Vijayawada", "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80", "Max is wonderfully trained and friendly with all animals.", "Up to date", "Neutered, athletic", "Obedient, social"],
  ["Bella", "Dog", "Beagle", "2 years", "Female", "Vijayawada", "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80", "Bella loves outdoor scent walks and cozy blankets.", "Up to date", "Spayed, healthy", "Curious, alert"],
  ["Milo", "Cat", "Domestic Shorthair", "1 year", "Male", "Vijayawada", "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=80", "Milo is a vibrant ginger tabby who loves feather toys.", "Vaccinated", "Indoor healthy", "Acrobatic, inquisitive"],
  ["Coco", "Rabbit", "Netherland Dwarf", "1 year", "Female", "Vijayawada", "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80", "Coco enjoys fresh timothy hay and gentle handling.", "RHDV2 complete", "Healthy teeth", "Docile, quiet"],
  ["Rocky", "Dog", "German Shepherd", "4 years", "Male", "Vijayawada", "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=800&q=80", "Rocky is a noble shepherd looking for an active handler.", "Fully immunized", "Neutered, high stamina", "Protective, smart"],
  ["Daisy", "Dog", "Indie Dog", "2 years", "Female", "Vijayawada", "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80", "Daisy is a loyal rescued Indian hound ready for a loving home.", "ABC & rabies done", "High immunity, spayed", "Gentle, extremely smart"],
];

const insertPet = db.prepare(`
  INSERT INTO pets (id, name, type, breed, age, gender, location, status, image_url, description, vaccination, health, personality, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, ?, ?, ?, ?)
`);
const existingPets = db.prepare("SELECT COUNT(*) AS count FROM pets").get().count;
if (existingPets === 0) {
  transaction(() => {
    for (const [name, type, breed, age, gender, location, image, description, vaccination, health, personality] of initialPets) {
      insertPet.run(randomUUID(), name, type, breed, age, gender, location, image, description, vaccination, health, personality, new Date().toISOString());
    }
  });
}
