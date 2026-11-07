const demoPets = [
  { id: "bruno", name: "Bruno", type: "Dog", breed: "Labrador", age: "2 years", gender: "Male", location: "Vijayawada", status: "Available", image_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80", description: "Bruno is a sweet yellow lab who loves fetch, swimming, and cuddles.", vaccination: "Full (Rabies, DHPP)", health: "Healthy & neutered", personality: "Playful, loving" },
  { id: "luna", name: "Luna", type: "Cat", breed: "Persian", age: "1 year", gender: "Female", location: "Guntur", status: "Available", image_url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80", description: "Luna adores sunny windowsills and gentle brushings.", vaccination: "Vaccinated & dewormed", health: "Spayed, clean coat", personality: "Calm, regal" },
  { id: "max", name: "Max", type: "Dog", breed: "Golden Retriever", age: "3 years", gender: "Male", location: "Vijayawada", status: "Available", image_url: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80", description: "Max is wonderfully trained and friendly with all animals.", vaccination: "Up to date", health: "Neutered, athletic", personality: "Obedient, social" },
  { id: "bella", name: "Bella", type: "Dog", breed: "Beagle", age: "2 years", gender: "Female", location: "Vijayawada", status: "Available", image_url: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80", description: "Bella loves outdoor scent walks and cozy blankets.", vaccination: "Up to date", health: "Spayed, healthy", personality: "Curious, alert" },
  { id: "milo", name: "Milo", type: "Cat", breed: "Domestic Shorthair", age: "1 year", gender: "Male", location: "Vijayawada", status: "Available", image_url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=80", description: "Milo is a vibrant ginger tabby who loves feather toys.", vaccination: "Vaccinated", health: "Indoor healthy", personality: "Acrobatic, inquisitive" },
  { id: "coco", name: "Coco", type: "Rabbit", breed: "Netherland Dwarf", age: "1 year", gender: "Female", location: "Vijayawada", status: "Available", image_url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80", description: "Coco enjoys fresh timothy hay and gentle handling.", vaccination: "RHDV2 complete", health: "Healthy teeth", personality: "Docile, quiet" },
  { id: "rocky", name: "Rocky", type: "Dog", breed: "German Shepherd", age: "4 years", gender: "Male", location: "Vijayawada", status: "Available", image_url: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=800&q=80", description: "Rocky is a noble shepherd looking for an active handler.", vaccination: "Fully immunized", health: "Neutered, high stamina", personality: "Protective, smart" },
  { id: "daisy", name: "Daisy", type: "Dog", breed: "Indie Dog", age: "2 years", gender: "Female", location: "Vijayawada", status: "Available", image_url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80", description: "Daisy is a loyal rescued Indian hound ready for a loving home.", vaccination: "ABC & rabies done", health: "High immunity, spayed", personality: "Gentle, extremely smart" },
];

export async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status !== 204 && !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("PawCare's API is not available on this Vercel deployment.");
  }
  const result = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

export async function getPets() {
  if (import.meta.env.PROD) return demoPets;
  return apiRequest("/pets");
}

export async function getPet(id) {
  if (import.meta.env.PROD) return demoPets.find((pet) => pet.id === id) || null;
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
