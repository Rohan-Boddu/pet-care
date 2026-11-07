const usersKey = "pawcare.demo-users";
const sessionKey = "pawcare.demo-session";
const passwordIterations = 120000;

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(usersKey) || "[]");
    if (!Array.isArray(users)) throw new Error("Stored demo accounts are invalid.");
    return users;
  } catch (error) {
    throw new Error(`Could not read demo accounts: ${error.message}`);
  }
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: passwordIterations },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function makePasswordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    salt: Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join(""),
    passwordHash: await passwordHash(password, salt),
  };
}

function saveSession(user) {
  const sessionUser = { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: "adopter" };
  sessionStorage.setItem(sessionKey, JSON.stringify(sessionUser));
  return sessionUser;
}

export function getDemoSession() {
  try {
    const user = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
    return user && user.role === "adopter" ? user : null;
  } catch (error) {
    throw new Error(`Could not read demo session: ${error.message}`);
  }
}

export async function registerDemoUser({ full_name, phone, email, password }) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((user) => user.email === normalizedEmail)) throw new Error("An account with this email already exists on this browser.");
  const passwordRecord = await makePasswordRecord(password);
  const user = {
    id: crypto.randomUUID(),
    full_name: full_name.trim(),
    phone: phone.trim(),
    email: normalizedEmail,
    ...passwordRecord,
  };
  users.push(user);
  localStorage.setItem(usersKey, JSON.stringify(users));
  return saveSession(user);
}

export async function signInDemoUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = readUsers().find((candidate) => candidate.email === normalizedEmail);
  if (!user) throw new Error("No demo account found for this email on this browser. Register first.");
  const salt = new Uint8Array(user.salt.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
  const candidateHash = await passwordHash(password, salt);
  if (candidateHash !== user.passwordHash) throw new Error("Incorrect email or password.");
  return saveSession(user);
}

export function signOutDemoUser() {
  sessionStorage.removeItem(sessionKey);
}
