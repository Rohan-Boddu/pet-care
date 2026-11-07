import { Link, NavLink } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export function Header() {
  const { user, profile, signOut } = useAuth();
  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) window.alert(error.message);
  };

  return (
    <>
      <div className="utility-bar"><div className="container utility-inner">
        <span><i className="fa-solid fa-location-dot" /> Vijayawada, Andhra Pradesh</span>
        <span><i className="fa-regular fa-clock" /> Mon–Sat: 9:00 AM–7:00 PM</span>
      </div></div>
      <header className="site-header">
        <nav className="container nav">
          <Link className="brand" to="/"><span className="brand-icon"><i className="fa-solid fa-paw" /></span><span>Paw<span>Care</span></span></Link>
          <div className="nav-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/pets">Find a pet</NavLink>
            <a href="/#process">How it works</a>
            <a href="/#about">About</a>
          </div>
          <div className="nav-actions">
            {user ? <>
              <Link className="button button-outline button-small" to="/account">My applications</Link>
              {profile?.role === "admin" && <Link className="button button-outline button-small" to="/admin">Admin</Link>}
              <span className="user-name">{profile?.full_name || user.email}</span>
              <button className="button button-primary button-small" onClick={handleSignOut}>Sign out</button>
            </> : <Link className="button button-primary button-small" to="/login">Sign in</Link>}
          </div>
        </nav>
      </header>
    </>
  );
}

export function Footer() {
  return <footer className="footer"><div className="container footer-inner">
    <Link className="brand brand-light" to="/"><span className="brand-icon"><i className="fa-solid fa-paw" /></span><span>Paw<span>Care</span></span></Link>
    <p>Every animal deserves a safe, loving home.</p>
    <small>© {new Date().getFullYear()} PawCare · Vijayawada, India</small>
  </div></footer>;
}

export function Page({ children, className = "" }) {
  return <main className={className}>{children}</main>;
}

export function Loading() {
  return <div className="state-box"><span className="spinner" /> Loading…</div>;
}

export function ErrorState({ error }) {
  return <div className="notice notice-error" role="alert">{error?.message || String(error)}</div>;
}

export function EmptyState({ children }) {
  return <div className="state-box">{children}</div>;
}
