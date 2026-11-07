export async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

export async function getPets() {
  return apiRequest("/pets");
}

export async function getPet(id) {
  const { pet } = await apiRequest(`/pets/${encodeURIComponent(id)}`);
  return pet;
}

export async function createApplication(application) {
  await apiRequest("/applications", { method: "POST", body: JSON.stringify(application) });
}

export async function getMyApplications() {
  const { applications } = await apiRequest("/account/applications");
  return applications;
}

export async function getAdminData() {
  return apiRequest("/admin");
}

export async function updatePet(id, updates) {
  await apiRequest(`/admin/pets/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(updates) });
}

export async function addPet(pet) {
  await apiRequest("/admin/pets", { method: "POST", body: JSON.stringify(pet) });
}

export async function deletePet(id) {
  await apiRequest(`/admin/pets/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function reviewApplication(id, status) {
  await apiRequest(`/admin/applications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
}
