import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import express from "express";
import session from "express-session";
import { db, sessionSecret, transaction } from "./database.js";

const scrypt = promisify(scryptCallback);
const app = express();
const passwordBytes = 64;

class SQLiteSessionStore extends session.Store {
  get(sid, callback) {
    try {
      const row = db.prepare("SELECT data, expires_at FROM sessions WHERE sid = ?").get(sid);
      if (!row) return callback(null, null);
      if (row.expires_at <= Date.now()) {
        db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
        return callback(null, null);
      }
      callback(null, JSON.parse(row.data));
    } catch (error) {
      callback(error);
    }
  }

  set(sid, value, callback = () => {}) {
    try {
      const expiresAt = value.cookie?.expires
        ? new Date(value.cookie.expires).getTime()
        : Date.now() + (value.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000);
      db.prepare(`
        INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at
      `).run(sid, JSON.stringify(value), expiresAt);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, value, callback = () => {}) {
    try {
      const expiresAt = value.cookie?.expires
        ? new Date(value.cookie.expires).getTime()
        : Date.now() + (value.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000);
      db.prepare("UPDATE sessions SET expires_at = ? WHERE sid = ?").run(expiresAt, sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(express.json({ limit: "32kb" }));
app.use(session({
  name: "pawcare.sid",
  secret: sessionSecret,
  store: new SQLiteSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedTypes = new Set(["Dog", "Cat", "Rabbit", "Other"]);
const allowedGenders = new Set(["Male", "Female"]);
const allowedPetStatuses = new Set(["Available", "Pending", "Adopted"]);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function text(value, label, maxLength = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw httpError(400, `${label} is required and must be under ${maxLength} characters.`);
  }
  return value.trim();
}

function publicUser(user) {
  return { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role };
}

async function regenerateSession(req, userId) {
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = userId;
  await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
}

async function requireAuth(req, _res, next) {
  try {
    if (!req.session.userId) throw httpError(401, "Please sign in to continue.");
    const user = db.prepare("SELECT id, full_name, email, phone, role FROM users WHERE id = ?").get(req.session.userId);
    if (!user) throw httpError(401, "Your session has expired. Please sign in again.");
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, _res, next) {
  if (req.user?.role !== "admin") return next(httpError(403, "This action is for PawCare administrators."));
  next();
}

function validatePet(input) {
  const type = text(input.type, "Animal type", 20);
  const gender = text(input.gender, "Gender", 10);
  if (!allowedTypes.has(type)) throw httpError(400, "Choose a valid animal type.");
  if (!allowedGenders.has(gender)) throw httpError(400, "Choose a valid gender.");
  const image = text(input.image_url, "Image URL", 2000);
  let url;
  try {
    url = new URL(image);
  } catch {
    throw httpError(400, "Enter a valid pet image URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw httpError(400, "Pet images must use HTTP or HTTPS.");
  return {
    name: text(input.name, "Name", 100),
    type,
    breed: text(input.breed, "Breed", 120),
    age: text(input.age, "Age", 40),
    gender,
    location: text(input.location, "City", 100),
    image_url: image,
    description: text(input.description, "Description", 2000),
    vaccination: typeof input.vaccination === "string" ? input.vaccination.trim().slice(0, 500) : "",
    health: typeof input.health === "string" ? input.health.trim().slice(0, 500) : "",
    personality: typeof input.personality === "string" ? input.personality.trim().slice(0, 500) : "",
  };
}

function openSession(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please sign in to continue." });
  next();
}

db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: "sqlite" }));

app.get("/api/auth/me", async (req, res, next) => {
  try {
    if (!req.session.userId) return res.json({ user: null });
    const user = db.prepare("SELECT id, full_name, email, phone, role FROM users WHERE id = ?").get(req.session.userId);
    if (!user) {
      await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
      res.clearCookie("pawcare.sid");
      return res.json({ user: null });
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const fullName = text(req.body.full_name, "Full name", 100);
    const email = text(req.body.email, "Email", 254).toLowerCase();
    const phone = text(req.body.phone, "Phone number", 40);
    const password = req.body.password;
    if (fullName.length < 2) throw httpError(400, "Your name must be at least 2 characters.");
    if (!validEmail.test(email)) throw httpError(400, "Enter a valid email address.");
    if (typeof password !== "string" || password.length < 8 || password.length > 200) {
      throw httpError(400, "Password must be between 8 and 200 characters.");
    }
    const salt = randomBytes(16);
    const passwordHash = await scrypt(password, salt, passwordBytes);
    const user = {
      id: randomUUID(),
      full_name: fullName,
      email,
      phone,
      role: "adopter",
    };
    db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, password_salt, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'adopter', ?)
    `).run(user.id, user.full_name, user.email, user.phone, passwordHash.toString("hex"), salt.toString("hex"), new Date().toISOString());
    await regenerateSession(req, user.id);
    res.status(201).json({ user });
  } catch (error) {
    if (error.errcode === 2067) return next(httpError(409, "An account with that email already exists."));
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;
    if (!validEmail.test(email) || typeof password !== "string" || password.length > 200) {
      throw httpError(400, "Enter a valid email address and password.");
    }
    const user = db.prepare("SELECT id, full_name, email, phone, role, password_hash, password_salt FROM users WHERE email = ?").get(email);
    if (!user) throw httpError(401, "Email or password is incorrect.");
    const candidate = await scrypt(password, Buffer.from(user.password_salt, "hex"), passwordBytes);
    const expected = Buffer.from(user.password_hash, "hex");
    if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
      throw httpError(401, "Email or password is incorrect.");
    }
    await regenerateSession(req, user.id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", openSession, async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie("pawcare.sid");
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/pets", (_req, res) => {
  const pets = db.prepare("SELECT * FROM pets ORDER BY created_at DESC").all();
  res.json(pets);
});

app.get("/api/pets/:id", (req, res) => {
  const pet = db.prepare("SELECT * FROM pets WHERE id = ?").get(req.params.id);
  res.json({ pet: pet || null });
});

app.post("/api/applications", requireAuth, (req, res, next) => {
  try {
    const input = req.body;
    const age = Number(input.age);
    if (!Number.isInteger(age) || age < 18 || age > 120) throw httpError(400, "Applicants must be at least 18 years old.");
    const petId = text(input.pet_id, "Pet", 100);
    const application = {
      id: randomUUID(),
      applicant_id: req.user.id,
      pet_id: petId,
      full_name: text(input.full_name, "Full name", 100),
      email: req.user.email,
      phone: text(input.phone, "Phone number", 40),
      age,
      occupation: text(input.occupation, "Occupation", 120),
      address: text(input.address, "Address", 500),
      residence: text(input.residence, "Residence type", 120),
      experience: text(input.experience, "Pet experience", 120),
      current_pets: text(input.current_pets, "Current pets", 120),
      reason: text(input.reason, "Reason for adoption", 2000),
      created_at: new Date().toISOString(),
    };
    transaction(() => {
      const pet = db.prepare("SELECT status FROM pets WHERE id = ?").get(petId);
      if (!pet) throw httpError(404, "That pet could not be found.");
      if (pet.status !== "Available") throw httpError(409, "This pet is no longer available for applications.");
      db.prepare(`
        INSERT INTO applications (id, applicant_id, pet_id, full_name, email, phone, age, occupation, address, residence, experience, current_pets, reason, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
      `).run(application.id, application.applicant_id, application.pet_id, application.full_name, application.email, application.phone, application.age, application.occupation, application.address, application.residence, application.experience, application.current_pets, application.reason, application.created_at);
      db.prepare("UPDATE pets SET status = 'Pending' WHERE id = ?").run(petId);
    });
    res.status(201).json({ application: { id: application.id, status: "Pending" } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/account/applications", requireAuth, (req, res) => {
  const applications = db.prepare(`
    SELECT applications.id, applications.status, applications.created_at,
      json_object('name', pets.name, 'image_url', pets.image_url, 'type', pets.type, 'breed', pets.breed) AS pet_json
    FROM applications
    JOIN pets ON pets.id = applications.pet_id
    WHERE applications.applicant_id = ?
    ORDER BY applications.created_at DESC
  `).all(req.user.id).map(({ pet_json, ...application }) => ({ ...application, pets: JSON.parse(pet_json) }));
  res.json({ applications });
});

app.get("/api/admin", requireAuth, requireAdmin, (_req, res) => {
  const pets = db.prepare("SELECT * FROM pets ORDER BY created_at DESC").all();
  const applications = db.prepare(`
    SELECT applications.id, applications.pet_id, applications.applicant_id, applications.full_name,
      applications.email, applications.phone, applications.status, applications.created_at,
      pets.name AS pet_name
    FROM applications
    JOIN pets ON pets.id = applications.pet_id
    ORDER BY applications.created_at DESC
  `).all().map(({ pet_name, ...application }) => ({ ...application, pets: { name: pet_name } }));
  res.json({ pets, applications });
});

app.post("/api/admin/pets", requireAuth, requireAdmin, (req, res, next) => {
  try {
    const pet = validatePet(req.body);
    const id = randomUUID();
    db.prepare(`
      INSERT INTO pets (id, name, type, breed, age, gender, location, image_url, description, vaccination, health, personality, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, pet.name, pet.type, pet.breed, pet.age, pet.gender, pet.location, pet.image_url, pet.description, pet.vaccination, pet.health, pet.personality, new Date().toISOString());
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/pets/:id", requireAuth, requireAdmin, (req, res, next) => {
  try {
    const status = text(req.body.status, "Status", 20);
    if (!allowedPetStatuses.has(status)) throw httpError(400, "Choose a valid pet status.");
    const result = db.prepare("UPDATE pets SET status = ? WHERE id = ?").run(status, req.params.id);
    if (!result.changes) throw httpError(404, "Pet not found.");
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/pets/:id", requireAuth, requireAdmin, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM pets WHERE id = ?").run(req.params.id);
    if (!result.changes) throw httpError(404, "Pet not found.");
    res.status(204).end();
  } catch (error) {
    if (error.errcode === 787 || error.errcode === 1811) return next(httpError(409, "Pets with adoption applications cannot be deleted."));
    next(error);
  }
});

app.patch("/api/admin/applications/:id", requireAuth, requireAdmin, (req, res, next) => {
  try {
    const status = text(req.body.status, "Application status", 20);
    if (status !== "Approved" && status !== "Rejected") throw httpError(400, "Choose Approved or Rejected.");
    transaction(() => {
      const application = db.prepare("SELECT pet_id, status FROM applications WHERE id = ?").get(req.params.id);
      if (!application) throw httpError(404, "Application not found.");
      if (application.status !== "Pending") throw httpError(409, "This application has already been reviewed.");
      db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, req.params.id);
      if (status === "Approved") {
        db.prepare("UPDATE pets SET status = 'Adopted' WHERE id = ?").run(application.pet_id);
      } else {
        const remaining = db.prepare("SELECT COUNT(*) AS count FROM applications WHERE pet_id = ? AND status = 'Pending' AND id <> ?").get(application.pet_id, req.params.id).count;
        if (remaining === 0) db.prepare("UPDATE pets SET status = 'Available' WHERE id = ? AND status = 'Pending'").run(application.pet_id);
      }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? "The server could not complete this request." : error.message });
});

export { app };
