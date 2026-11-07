import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./data.js";
import { getDemoSession, registerDemoUser, signInDemoUser, signOutDemoUser } from "./demoAuth.js";

const AuthContext = createContext(null);
const demoAuthEnabled = import.meta.env.PROD;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    refreshUser();
  }, []);

  async function refreshUser() {
    setLoading(true);
    setAuthError("");
    try {
      const currentUser = demoAuthEnabled
        ? getDemoSession()
        : (await apiRequest("/auth/me")).user;
      setSession(currentUser ? { user: currentUser } : null);
      setProfile(currentUser);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    authError,
    refreshUser,
    register: async (account) => {
      const currentUser = demoAuthEnabled
        ? await registerDemoUser(account)
        : (await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify(account),
        })).user;
      setSession({ user: currentUser });
      setProfile(currentUser);
    },
    signIn: async (email, password) => {
      const currentUser = demoAuthEnabled
        ? await signInDemoUser(email, password)
        : (await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        })).user;
      setSession({ user: currentUser });
      setProfile(currentUser);
    },
    signOut: async () => {
      try {
        if (demoAuthEnabled) {
          signOutDemoUser();
        } else {
          await apiRequest("/auth/logout", { method: "POST" });
        }
        setSession(null);
        setProfile(null);
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { demoAuthEnabled };

export function useAuth() {
  return useContext(AuthContext);
}
