import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { demoAuthEnabled, useAuth } from "./auth.jsx";
import { addPet, apiRequest, createApplication, deletePet, getAdminData, getMyApplications, getPet, getPets, reviewApplication, updatePet } from "./data.js";
import { EmptyState, ErrorState, Loading, Page } from "./components.jsx";

const steps = [
  ["01", "Find your companion", "Browse rescues and find a pet whose personality fits your home."],
  ["02", "Get to know them", "Learn about their story, health, and everything that makes them special."],
  ["03", "Apply to adopt", "Tell us a little about your home and why you would like to adopt."],
  ["04", "Meet your match", "Our team reviews your application and arranges a friendly meet-and-greet."],
];

export function HomePage() {
  const [pets, setPets] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    getPets().then(setPets).catch((e) => setError(e.message));
  }, []);

  return <Page>
    <section className="hero"><div className="container hero-grid">
      <div className="hero-copy">
        <span className="eyebrow"><i className="fa-solid fa-heart" /> A little love changes everything</span>
        <h1>Find your new <span>best friend.</span></h1>
        <p>Rescued pets, ready for a second chance. Meet the companion who’s been waiting for you.</p>
        <div className="button-row"><Link className="button button-primary" to="/pets">Meet the pets <i className="fa-solid fa-arrow-right" /></Link><a className="button button-outline" href="#process">How adoption works</a></div>
        <div className="hero-proof"><span className="proof-icon"><i className="fa-solid fa-shield-heart" /></span><span><strong>Thoughtful, ethical adoption</strong><small>Every pet is cared for by our rescue team.</small></span></div>
      </div>
      <div className="hero-photo"><img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1100&q=85" alt="Two happy dogs enjoying time together" /><div className="photo-caption"><span>Good things start with a hello.</span><i className="fa-solid fa-heart" /></div></div>
    </div></section>
    <section className="section container" id="pets">
      <div className="section-heading"><div><span className="eyebrow">Meet your match</span><h2>Friends looking for a family</h2><p>Real personalities. Happy beginnings. Maybe one of them is yours.</p></div><Link className="text-link" to="/pets">See all pets <i className="fa-solid fa-arrow-right" /></Link></div>
      {error && <ErrorState error={error} />}
      {pets.length === 0 && !error ? <Loading /> : <div className="pet-grid">{pets.filter((pet) => pet.status === "Available").slice(0, 3).map((pet) => <PetCard key={pet.id} pet={pet} />)}</div>}
    </section>
    <section className="process-section" id="process"><div className="container"><div className="section-heading"><div><span className="eyebrow">A good match, made with care</span><h2>Adoption should feel right.</h2><p>We’re here to help you and your new friend get off to a wonderful start.</p></div></div><div className="steps-grid">{steps.map(([number, title, description]) => <article className="step-card" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <section className="about-section container" id="about"><div className="about-copy"><span className="eyebrow">A home for every heart</span><h2>Rescue is just the beginning.</h2><p>At PawCare, we believe the best relationships start with care and a little patience. Our Vijayawada rescue community looks after each animal and supports you through every step of adoption.</p><Link className="text-link" to="/pets">Find your new friend <i className="fa-solid fa-arrow-right" /></Link></div><div className="about-note"><i className="fa-solid fa-paw" /><strong>More than a new pet.</strong><p>A best friend, a familiar face at the door, and a little more joy in every day.</p></div></section>
  </Page>;
}

export function PetCard({ pet }) {
  return <article className="pet-card">
    <Link to={`/pets/${pet.id}`} className="pet-image"><img src={pet.image_url} alt={pet.name} loading="lazy" /><span className="pet-type">{pet.type}</span></Link>
    <div className="pet-card-body"><div className="pet-title-row"><h3>{pet.name}</h3><span className={`status status-${pet.status.toLowerCase()}`}>{pet.status}</span></div><p className="pet-breed">{pet.breed}</p><div className="pet-meta"><span><i className="fa-solid fa-cake-candles" /> {pet.age}</span><span><i className="fa-solid fa-location-dot" /> {pet.location}</span></div><Link className="text-link" to={`/pets/${pet.id}`}>Get to know {pet.name} <i className="fa-solid fa-arrow-right" /></Link></div>
  </article>;
}

export function PetsPage() {
  const [pets, setPets] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getPets().then(setPets).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => pets.filter((pet) => {
    const query = search.trim().toLowerCase();
    const matchesText = !query || [pet.name, pet.breed, pet.location].some((value) => value?.toLowerCase().includes(query));
    return matchesText && (!type || pet.type === type) && (!gender || pet.gender === gender);
  }), [pets, search, type, gender]);

  return <Page className="page-section container">
    <div className="section-heading"><div><span className="eyebrow">Meet the rescue crew</span><h1>Find your new best friend.</h1><p>Every animal has their own story. Yours could be next.</p></div></div>
    <div className="filter-bar"><label className="search-field"><i className="fa-solid fa-magnifying-glass" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, breed, or city" aria-label="Search pets" /></label><select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by animal type"><option value="">All animals</option><option>Dog</option><option>Cat</option><option>Rabbit</option></select><select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Filter by gender"><option value="">All genders</option><option>Male</option><option>Female</option></select><button className="button button-outline button-small" onClick={() => { setSearch(""); setType(""); setGender(""); }}>Reset</button></div>
    {error && <ErrorState error={error} />}
    {loading ? <Loading /> : filtered.length ? <div className="pet-grid">{filtered.map((pet) => <PetCard key={pet.id} pet={pet} />)}</div> : <EmptyState>No pets match those filters yet. Try a different search.</EmptyState>}
  </Page>;
}

export function PetDetailsPage() {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    setError("");
    setPet(null);
    getPet(id).then(setPet).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);
  if (error) return <Page className="page-section container"><ErrorState error={error} /></Page>;
  if (loading) return <Page className="page-section container"><Loading /></Page>;
  if (!pet) return <Page className="page-section container"><EmptyState>This pet could not be found.</EmptyState></Page>;
  return <Page className="page-section container"><Link className="text-link back-link" to="/pets"><i className="fa-solid fa-arrow-left" /> Back to all pets</Link><div className="detail-layout"><img className="detail-image" src={pet.image_url} alt={pet.name} /><div className="detail-copy"><span className={`status status-${pet.status.toLowerCase()}`}>{pet.status}</span><span className="eyebrow">{pet.type} · {pet.breed}</span><h1>Meet {pet.name}.</h1><p className="detail-description">{pet.description}</p><div className="detail-facts"><span><strong>Age</strong>{pet.age}</span><span><strong>Gender</strong>{pet.gender}</span><span><strong>Location</strong>{pet.location}</span><span><strong>Vaccination</strong>{pet.vaccination || "Ask our team"}</span><span><strong>Health</strong>{pet.health || "Ask our team"}</span><span><strong>Personality</strong>{pet.personality || "One of a kind"}</span></div>{pet.status === "Available" ? <Link className="button button-primary" to={`/apply?pet=${pet.id}`}>Apply to adopt {pet.name} <i className="fa-solid fa-arrow-right" /></Link> : <p className="notice notice-info">This pet is not currently accepting adoption applications.</p>}</div></div></Page>;
}

export function AuthPage({ mode, onGuest }) {
  const { user, register, signIn } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const registering = mode === "register";
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    if (registering && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (registering) {
        await register({ full_name: fullName, phone, email, password });
      } else {
        await signIn(email, password);
      }
      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function continueAsGuest() {
    onGuest?.();
    navigate("/");
  }

  return <Page className="auth-page"><section className="auth-layout">
    <div className="auth-brand-side"><Link className="auth-brand" to="/"><span className="auth-logo-icon"><i className="fa-solid fa-paw" /></span><span>Paw<span>Care</span><small>PET ADOPTION COMMUNITY</small></span></Link>
      <span className="auth-kicker"><i className="fa-solid fa-heart" /> A fresh start for them. A best friend for you.</span>
      <h1>Give a pet a home.<br />Give a home a <span>friend.</span></h1>
      <p>Our Vijayawada rescue community brings dogs, cats, and rabbits together with the families who are ready to love them.</p>
      <div className="auth-promises"><div><i className="fa-solid fa-shield-heart" /><span><strong>Care comes first</strong><small>Every rescue gets thoughtful attention.</small></span></div><div><i className="fa-solid fa-house" /><span><strong>Adoption, with support</strong><small>We’re here to help you find your match.</small></span></div></div>
      <div className="auth-contact"><span><i className="fa-solid fa-location-dot" /> Vijayawada, Andhra Pradesh</span><span><i className="fa-solid fa-phone" /> +91 98765 43210</span></div>
    </div>
    <div className="auth-form-side"><div className="auth-form-heading"><span className="eyebrow">Your next chapter starts here</span><h2>{registering ? "Create your account" : "Welcome to PawCare"}</h2><p>{registering ? "A few details and you’re on your way." : "Sign in to manage your adoption journey."}</p></div>
      <div className="auth-tabs"><Link className={!registering ? "active" : ""} to="/login">Sign in</Link><Link className={registering ? "active" : ""} to="/register">Register</Link></div>
      {demoAuthEnabled && <p className="notice notice-info" role="note">Demo mode: accounts stay in this browser only. Do not use a real password.</p>}
      {error && <ErrorState error={error} />}
      <form className="form-stack" onSubmit={submit}>
        {registering && <Field label="Full name" value={fullName} setValue={setFullName} required minLength={2} autoComplete="name" />}
        {registering && <Field label="Phone number" type="tel" value={phone} setValue={setPhone} required autoComplete="tel" />}
        <Field label="Email address" type="email" value={email} setValue={setEmail} required autoComplete="email" />
        <Field label="Password" type="password" value={password} setValue={setPassword} required minLength={8} autoComplete={registering ? "new-password" : "current-password"} />
        {registering && <Field label="Confirm password" type="password" value={confirmPassword} setValue={setConfirmPassword} required minLength={8} autoComplete="new-password" />}
        <button className="button button-primary button-wide" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Sign in and continue"} <i className="fa-solid fa-arrow-right" /></button>
      </form>
      <div className="auth-guest"><span>Just looking around?</span><button className="text-link auth-guest-button" type="button" onClick={continueAsGuest}>Continue as a guest <i className="fa-solid fa-arrow-right" /></button></div>
    </div>
  </section></Page>;
}

function Field({ label, type = "text", value, setValue, ...props }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(e) => setValue(e.target.value)} {...props} /></label>;
}

function AuthGate({ children, admin = false }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Page className="page-section container"><Loading /></Page>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && profile?.role !== "admin") return <Page className="page-section container"><div className="notice notice-error">This page is for PawCare administrators. Your account does not have admin access.</div></Page>;
  return children;
}

export function ApplicationPage() {
  return <AuthGate><ApplicationForm /></AuthGate>;
}

function ApplicationForm() {
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const [petId, setPetId] = useState(params.get("pet") || "");
  const [pets, setPets] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: profile?.full_name || "", phone: profile?.phone || "", age: "", occupation: "", address: "", residence: "", experience: "", current_pets: "", reason: "" });

  useEffect(() => {
    getPets().then(setPets).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setForm((current) => ({
      ...current,
      full_name: current.full_name || profile?.full_name || "",
      phone: current.phone || profile?.phone || "",
    }));
  }, [profile?.full_name, profile?.phone]);
  const availablePets = pets.filter((pet) => pet.status === "Available");

  async function submit(event) {
    event.preventDefault();
    if (!petId) return setError("Please choose an available pet.");
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await createApplication({ pet_id: petId, ...form, age: Number(form.age) });
      setSuccess("Your application has been submitted. Our team will be in touch soon.");
      setForm((current) => ({ ...current, phone: "", age: "", occupation: "", address: "", residence: "", experience: "", current_pets: "", reason: "" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  return <Page className="form-page container"><section className="form-card"><span className="eyebrow">A few details about you</span><h1>Start your adoption story.</h1><p>Tell us about your home so we can help find the right match.</p>{error && <ErrorState error={error} />}{success && <div className="notice notice-success">{success}</div>}<form className="form-grid" onSubmit={submit}>
    <label className="field"><span>Full name</span><input name="full_name" value={form.full_name} onChange={change} required autoComplete="name" /></label>
    <label className="field"><span>Email</span><input value={user.email || ""} readOnly /></label>
    <label className="field"><span>Phone number</span><input name="phone" type="tel" value={form.phone} onChange={change} required autoComplete="tel" /></label>
    <label className="field"><span>Age</span><input name="age" type="number" value={form.age} onChange={change} required min="18" /></label>
    <label className="field"><span>Occupation</span><input name="occupation" value={form.occupation} onChange={change} required /></label>
    <label className="field"><span>Pet you'd like to meet</span><select value={petId} onChange={(e) => setPetId(e.target.value)} required><option value="">Choose an available pet</option>{availablePets.map((pet) => <option value={pet.id} key={pet.id}>{pet.name} · {pet.breed}</option>)}</select></label>
    <label className="field field-full"><span>Residential address</span><input name="address" value={form.address} onChange={change} required autoComplete="street-address" /></label>
    <label className="field"><span>Type of residence</span><select name="residence" value={form.residence} onChange={change} required><option value="">Choose one</option><option>Independent house with garden</option><option>Apartment / flat</option><option>Gated villa</option></select></label>
    <label className="field"><span>Pet experience</span><select name="experience" value={form.experience} onChange={change} required><option value="">Choose one</option><option>Experienced pet owner</option><option>First-time pet owner</option></select></label>
    <label className="field"><span>Do you currently have pets?</span><select name="current_pets" value={form.current_pets} onChange={change} required><option value="">Choose one</option><option>No</option><option>Yes, dogs</option><option>Yes, cats</option><option>Yes, other</option></select></label>
    <label className="field field-full"><span>What makes you want to adopt?</span><textarea name="reason" value={form.reason} onChange={change} rows="4" required /></label>
    <div className="field-full"><button className="button button-primary" disabled={busy || availablePets.length === 0}>{busy ? "Sending application…" : availablePets.length ? "Send adoption application" : "No available pets right now"}</button></div>
  </form></section></Page>;
}

export function AccountPage() {
  return <AuthGate><AccountContent /></AuthGate>;
}

function AccountContent() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyApplications()
      .then(setApplications)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return <Page className="page-section container"><div className="section-heading"><div><span className="eyebrow">Your adoption journey</span><h1>My applications</h1><p>Keep up with the pets you’re hoping to welcome home.</p></div></div>{error && <ErrorState error={error} />}{loading ? <Loading /> : applications.length ? <div className="account-list">{applications.map((application) => <article className="account-application" key={application.id}><img src={application.pets?.image_url} alt="" /><div><strong>{application.pets?.name || "Pet"}</strong><span>{application.pets?.type} · {application.pets?.breed}</span><small>Submitted {new Date(application.created_at).toLocaleDateString()}</small></div><span className={`status status-${application.status.toLowerCase()}`}>{application.status}</span></article>)}</div> : <EmptyState>You haven’t sent an adoption application yet. <Link className="text-link" to="/pets">Meet the pets <i className="fa-solid fa-arrow-right" /></Link></EmptyState>}</Page>;
}

export function AdminPage() {
  return <AuthGate admin><AdminDashboard /></AuthGate>;
}

function AdminDashboard() {
  const [data, setData] = useState({ pets: [], applications: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Dog", breed: "", age: "", gender: "Female", location: "Vijayawada", image_url: "", description: "", vaccination: "", health: "", personality: "" });

  async function reload() {
    try { setData(await getAdminData()); setError(""); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { reload(); }, []);

  async function perform(action) {
    setBusy(true);
    setError("");
    try { await action(); await reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function submitPet(event) {
    event.preventDefault();
    await perform(async () => {
      await addPet(form);
      setForm({ name: "", type: "Dog", breed: "", age: "", gender: "Female", location: "Vijayawada", image_url: "", description: "", vaccination: "", health: "", personality: "" });
    });
  }

  const available = data.pets.filter((pet) => pet.status === "Available").length;
  const adopted = data.pets.filter((pet) => pet.status === "Adopted").length;
  const pending = data.applications.filter((application) => application.status === "Pending").length;
  return <Page className="page-section container admin-page"><div className="section-heading"><div><span className="eyebrow">PawCare team</span><h1>Admin dashboard</h1><p>Take care of the pet catalog and new adoption applications.</p></div></div>{error && <ErrorState error={error} />}
    <div className="stats-grid"><Stat title="Total pets" value={data.pets.length} /><Stat title="Available" value={available} /><Stat title="Adopted" value={adopted} /><Stat title="Pending applications" value={pending} /></div>
    <section className="admin-panel"><h2>Add a pet to the family</h2><form className="form-grid" onSubmit={submitPet}>{[["name","Name"],["breed","Breed"],["age","Age"],["location","City"],["image_url","Image URL"],["vaccination","Vaccination"],["health","Health"],["personality","Personality"]].map(([key,label]) => <label className={`field ${key === "image_url" ? "field-full" : ""}`} key={key}><span>{label}</span><input value={form[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} required /></label>)}<label className="field"><span>Type</span><select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Other</option></select></label><label className="field"><span>Gender</span><select value={form.gender} onChange={(e) => setForm((current) => ({ ...current, gender: e.target.value }))}><option>Female</option><option>Male</option></select></label><label className="field field-full"><span>Description</span><textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows="2" required /></label><div className="field-full"><button className="button button-primary" disabled={busy}>Add pet</button></div></form></section>
    <section className="admin-panel"><h2>Pet catalog</h2><div className="table-scroll"><table><thead><tr><th>Pet</th><th>Type / breed</th><th>Age / gender</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.pets.map((pet) => <tr key={pet.id}><td>{pet.name}<small>{pet.location}</small></td><td>{pet.type}<small>{pet.breed}</small></td><td>{pet.age}<small>{pet.gender}</small></td><td><select value={pet.status} disabled={busy} onChange={(e) => perform(() => updatePet(pet.id, { status: e.target.value }))}><option>Available</option><option>Pending</option><option>Adopted</option></select></td><td><button className="button button-outline button-small button-danger" disabled={busy} onClick={() => { if (window.confirm(`Delete ${pet.name}'s profile?`)) perform(() => deletePet(pet.id)); }}>Delete</button></td></tr>)}</tbody></table></div></section>
    <section className="admin-panel"><h2>Adoption applications</h2><div className="table-scroll"><table><thead><tr><th>Pet</th><th>Applicant</th><th>Contact</th><th>Status</th><th>Review</th></tr></thead><tbody>{data.applications.map((application) => <tr key={application.id}><td>{application.pets?.name || "Pet removed"}<small>{new Date(application.created_at).toLocaleDateString()}</small></td><td>{application.full_name}</td><td>{application.email}<small>{application.phone}</small></td><td><span className={`status status-${application.status.toLowerCase()}`}>{application.status}</span></td><td>{application.status === "Pending" ? <div className="button-row"><button className="button button-primary button-small" disabled={busy} onClick={() => perform(() => reviewApplication(application.id, "Approved"))}>Approve</button><button className="button button-outline button-small button-danger" disabled={busy} onClick={() => perform(() => reviewApplication(application.id, "Rejected"))}>Decline</button></div> : "—"}</td></tr>)}{data.applications.length === 0 && <tr><td colSpan="5">No applications received yet.</td></tr>}</tbody></table></div></section>
  </Page>;
}

function Stat({ title, value }) {
  return <div className="stat-card"><span>{title}</span><strong>{value}</strong></div>;
}
