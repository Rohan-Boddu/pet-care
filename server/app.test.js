import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const temporaryDirectory = mkdtempSync(resolve(tmpdir(), "pawcare-test-"));
process.env.PAWCARE_DB_PATH = resolve(temporaryDirectory, "test.sqlite");
const { app } = await import("./app.js");
const { db } = await import("./database.js");

let server;
let origin;
let adopterCookie;

before(async () => {
  server = app.listen(0);
  await new Promise((resolveListen) => server.once("listening", resolveListen));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  db.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function request(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = response.status === 204 ? null : await response.json();
  return { response, result };
}

test("local SQLite app supports real accounts, applications, and protected admin workflows", async (t) => {
  await t.test("serves seeded pets and validates account registration", async () => {
    const { response, result } = await request("/api/pets");
    assert.equal(response.status, 200);
    assert.equal(result.length, 8);

    const invalid = await request("/api/auth/register", {
      method: "POST",
      body: { full_name: "Test", email: "bad", phone: "555", password: "short" },
    });
    assert.equal(invalid.response.status, 400);

    const registration = await request("/api/auth/register", {
      method: "POST",
      body: { full_name: "Test Adopter", email: "adopter@example.com", phone: "5550100", password: "a-secure-password" },
    });
    assert.equal(registration.response.status, 201);
    assert.equal(registration.result.user.role, "adopter");
    adopterCookie = registration.response.headers.getSetCookie()[0].split(";")[0];

    const duplicate = await request("/api/auth/register", {
      method: "POST",
      body: { full_name: "Duplicate", email: "ADOPTER@example.com", phone: "5550101", password: "a-secure-password" },
    });
    assert.equal(duplicate.response.status, 409);

    const session = await request("/api/auth/me", { cookie: adopterCookie });
    assert.equal(session.result.user.email, "adopter@example.com");

    const incorrectPassword = await request("/api/auth/login", {
      method: "POST",
      body: { email: "adopter@example.com", password: "incorrect-password" },
    });
    assert.equal(incorrectPassword.response.status, 401);

    const login = await request("/api/auth/login", {
      method: "POST",
      body: { email: "ADOPTER@example.com", password: "a-secure-password" },
    });
    assert.equal(login.response.status, 200);
    adopterCookie = login.response.headers.getSetCookie()[0].split(";")[0];
  });

  await t.test("requires a real session and isolates adoption application history", async () => {
    const pets = await request("/api/pets");
    const anonymous = await request("/api/applications", {
      method: "POST",
      body: { pet_id: pets.result[0].id },
    });
    assert.equal(anonymous.response.status, 401);

    const application = await request("/api/applications", {
      method: "POST",
      cookie: adopterCookie,
      body: {
        applicant_id: "forged-user-id",
        pet_id: pets.result[0].id,
        full_name: "Test Adopter",
        phone: "5550100",
        age: 30,
        occupation: "Engineer",
        address: "Vijayawada",
        residence: "Apartment",
        experience: "First-time pet owner",
        current_pets: "No",
        reason: "Ready to care for a pet",
      },
    });
    assert.equal(application.response.status, 201);

    const myApplications = await request("/api/account/applications", { cookie: adopterCookie });
    assert.equal(myApplications.result.applications.length, 1);
    assert.equal(myApplications.result.applications[0].pets.name, pets.result[0].name);
    assert.equal(myApplications.result.applications[0].status, "Pending");

    const takenPet = await request("/api/applications", {
      method: "POST",
      cookie: adopterCookie,
      body: {
        pet_id: pets.result[0].id,
        full_name: "Test Adopter",
        phone: "5550100",
        age: 30,
        occupation: "Engineer",
        address: "Vijayawada",
        residence: "Apartment",
        experience: "First-time pet owner",
        current_pets: "No",
        reason: "Ready to care for a pet",
      },
    });
    assert.equal(takenPet.response.status, 409);
  });

  await t.test("keeps admin tools role-protected and updates pet status on approval", async () => {
    const denied = await request("/api/admin", { cookie: adopterCookie });
    assert.equal(denied.response.status, 403);

    db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run("adopter@example.com");
    const dashboard = await request("/api/admin", { cookie: adopterCookie });
    assert.equal(dashboard.response.status, 200);
    assert.equal(dashboard.result.applications.length, 1);

    const newPet = await request("/api/admin/pets", {
      method: "POST",
      cookie: adopterCookie,
      body: {
        name: "Poppy",
        type: "Dog",
        breed: "Indie",
        age: "1 year",
        gender: "Female",
        location: "Vijayawada",
        image_url: "https://example.com/poppy.jpg",
        description: "A happy rescue looking for a family.",
        vaccination: "",
        health: "",
        personality: "",
      },
    });
    assert.equal(newPet.response.status, 201);

    const petStatus = await request(`/api/admin/pets/${newPet.result.id}`, {
      method: "PATCH",
      cookie: adopterCookie,
      body: { status: "Pending" },
    });
    assert.equal(petStatus.response.status, 200);
    const removePet = await request(`/api/admin/pets/${newPet.result.id}`, {
      method: "DELETE",
      cookie: adopterCookie,
    });
    assert.equal(removePet.response.status, 204);

    const { id, pet_id: petId } = dashboard.result.applications[0];
    const approved = await request(`/api/admin/applications/${id}`, {
      method: "PATCH",
      cookie: adopterCookie,
      body: { status: "Approved" },
    });
    assert.equal(approved.response.status, 200);

    const pet = await request(`/api/pets/${petId}`);
    assert.equal(pet.result.pet.status, "Adopted");

    const cannotDelete = await request(`/api/admin/pets/${petId}`, {
      method: "DELETE",
      cookie: adopterCookie,
    });
    assert.equal(cannotDelete.response.status, 409);

    const logout = await request("/api/auth/logout", { method: "POST", cookie: adopterCookie });
    assert.equal(logout.response.status, 204);
    const endedSession = await request("/api/auth/me", { cookie: adopterCookie });
    assert.equal(endedSession.result.user, null);
  });
});
