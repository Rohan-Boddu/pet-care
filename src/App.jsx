import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { EmptyState, Footer, Header, ErrorState, Loading, Page } from "./components.jsx";
import { useAuth } from "./auth.jsx";
import { AccountPage, AdminPage, ApplicationPage, AuthPage, HomePage, PetDetailsPage, PetsPage } from "./pages.jsx";

export default function App() {
  const { authError } = useAuth();
  const [guestMode, setGuestMode] = useState(() => sessionStorage.getItem("pawcare.guest-mode") === "true");
  function continueAsGuest() {
    sessionStorage.setItem("pawcare.guest-mode", "true");
    setGuestMode(true);
  }
  return <><Header />{authError && <div className="container"><ErrorState error={authError} /></div>}<Routes>
    <Route path="/" element={<EntryPage guestMode={guestMode} onGuest={continueAsGuest} />} />
    <Route path="/pets" element={<PetsPage />} />
    <Route path="/pets/:id" element={<PetDetailsPage />} />
    <Route path="/login" element={<AuthPage mode="login" onGuest={continueAsGuest} />} />
    <Route path="/register" element={<AuthPage mode="register" onGuest={continueAsGuest} />} />
    <Route path="/apply" element={<ApplicationPage />} />
    <Route path="/account" element={<AccountPage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="*" element={<main className="container page-section"><h1>Page not found</h1><p>That page isn’t here, but your new best friend might be.</p></main>} />
  </Routes><Footer /></>;
}

function EntryPage({ guestMode, onGuest }) {
  const { user, loading } = useAuth();
  if (loading) return <Page className="page-section container"><Loading /></Page>;
  if (!user && !guestMode) return <AuthPage mode="login" onGuest={onGuest} />;
  return <HomePage />;
}
