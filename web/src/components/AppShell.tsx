"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Compass, Search, Settings2, Sparkles, X, UserRound, Menu } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { api } from "@/lib/api";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { RightSidebar } from "@/components/RightSidebar";

type Session = {
  user: User | null;
  token: string | null;
  ready: boolean;
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);
export const useSession = () => {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider is missing");
  return value;
};

function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(!firebaseConfigured);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      setReady(true);
      if (!next) {
        setToken(null);
        return;
      }
      const nextToken = await next.getIdToken();
      try {
        await api.register(
          { uid: next.uid, email: next.email, displayName: next.displayName, photoUrl: next.photoURL },
          nextToken
        );
      } catch (error) {
        console.error("Account sync failed", error);
      }
      setToken(nextToken);
    });
  }, []);

  const value = useMemo<Session>(() => ({
    user,
    token,
    ready,
    authOpen,
    openAuth: () => setAuthOpen(true),
    closeAuth: () => setAuthOpen(false),
    googleLogin: async () => {
      if (!auth) throw new Error("Add Firebase web credentials to web/.env.local first.");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    },
    logout: async () => {
      if (auth) await signOut(auth);
      setUser(null);
      setToken(null);
    },
  }), [user, token, ready, authOpen]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authOpen, openAuth, closeAuth } = useSession();
  const [mobileNav, setMobileNav] = useState(false);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="x-page-root">
      {/* Mobile Top Bar */}
      <div className="tp-mobile-bar">
        <button
          type="button"
          className="tp-mobile-btn"
          onClick={() => setMobileNav(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <Link href="/" className="tp-mobile-brand">
          <div className="tp-brand-icon">
            <Sparkles size={16} />
          </div>
          <span className="tp-brand-name">
            TechPulse<span className="tp-brand-ai">AI</span>
          </span>
        </Link>

        <button
          type="button"
          className="tp-mobile-avatar"
          onClick={() => (user ? router.push("/settings") : openAuth())}
          title={user ? "Account" : "Sign in"}
        >
          {user ? (user.displayName || user.email || "T").slice(0, 1).toUpperCase() : <UserRound size={16} />}
        </button>
      </div>

      <div className="x-app-frame">
        {/* Left Column: TechPulse Navigation */}
        <aside className={`tp-left-nav ${mobileNav ? "tp-left-nav-open" : ""}`}>
          <div className="tp-left-nav-inner">
            {/* TechPulse AI Official Brand Logo */}
            <Link href="/" className="tp-logo-btn" onClick={() => setMobileNav(false)}>
              <div className="tp-brand-icon">
                <Sparkles size={22} />
              </div>
              <span className="tp-brand-name">
                TechPulse<span className="tp-brand-ai">AI</span>
              </span>
            </Link>

            {/* Main Menu Links: Clean, Focused Navigation */}
            <nav className="tp-nav-menu">
              <Link
                href="/"
                className={`tp-nav-item ${active("/") ? "is-active" : ""}`}
                onClick={() => setMobileNav(false)}
              >
                <Compass size={24} strokeWidth={active("/") ? 2.5 : 1.9} />
                <span className="tp-nav-label">Feed</span>
              </Link>

              <Link
                href="/search"
                className={`tp-nav-item ${active("/search") ? "is-active" : ""}`}
                onClick={() => setMobileNav(false)}
              >
                <Search size={24} strokeWidth={active("/search") ? 2.5 : 1.9} />
                <span className="tp-nav-label">Explore</span>
              </Link>

              <Link
                href="/saved"
                className={`tp-nav-item ${active("/saved") ? "is-active" : ""}`}
                onClick={() => setMobileNav(false)}
              >
                <Bookmark size={24} strokeWidth={active("/saved") ? 2.5 : 1.9} />
                <span className="tp-nav-label">Bookmarks</span>
              </Link>

              <Link
                href="/settings"
                className={`tp-nav-item ${active("/settings") ? "is-active" : ""}`}
                onClick={() => setMobileNav(false)}
              >
                <Settings2 size={24} strokeWidth={active("/settings") ? 2.5 : 1.9} />
                <span className="tp-nav-label">Settings</span>
              </Link>
            </nav>

            {/* Bottom Account Card */}
            <div className="tp-nav-bottom-profile">
              {user ? (
                <button
                  type="button"
                  className="tp-profile-pill"
                  onClick={() => router.push("/settings")}
                >
                  <span className="tp-profile-avatar">
                    {(user.displayName || user.email || "T").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="tp-profile-info">
                    <strong className="tp-profile-name">{user.displayName || "Engineer"}</strong>
                    <span className="tp-profile-handle">
                      @{user.email ? user.email.split("@")[0] : "developer"}
                    </span>
                  </div>
                  <span className="tp-profile-dots">···</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="tp-profile-pill"
                  onClick={openAuth}
                >
                  <span className="tp-profile-avatar tp-avatar-guest">
                    <UserRound size={18} />
                  </span>
                  <div className="tp-profile-info">
                    <strong className="tp-profile-name">Guest</strong>
                    <span className="tp-profile-handle">Sign in with Google</span>
                  </div>
                  <span className="tp-profile-dots">···</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {mobileNav && (
          <button
            type="button"
            className="x-scrim"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          />
        )}

        {/* Center Main Feed Column */}
        <main className="x-main-center-col">
          {children}
        </main>

        {/* Right Aside: TechPulse Developer Intelligence Radar */}
        <RightSidebar />
      </div>

      {authOpen && <AuthModal onClose={closeAuth} />}
    </div>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { googleLogin } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await googleLogin();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="auth-modal">
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="auth-mark">
          <Sparkles size={19} />
        </div>
        <p className="eyebrow">YOUR SIGNAL, EVERYWHERE</p>
        <h2>Welcome to TechPulse AI.</h2>
        <p className="auth-description">
          Sign in to sync your personalized intelligence, bookmarks, and preferences.
        </p>
        {error && <p className="form-error">{error}</p>}
        <button className="google-button" onClick={submit} disabled={busy}>
          <GoogleMark />
          <span>{busy ? "Connecting to Google…" : "Continue with Google"}</span>
        </button>
        {!firebaseConfigured && (
          <p className="config-hint">
            Firebase web config is needed in <code>web/.env.local</code> to enable authentication.
          </p>
        )}
        <p className="auth-privacy">Your Google account is used to sign you into TechPulse AI.</p>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        transform="translate(0 5)"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.94 46.98 31.8 46.98 24.55z"
        transform="translate(0 -1)"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19z"
        transform="translate(0 0)"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        transform="translate(0 -2)"
      />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ShellContent>{children}</ShellContent>
    </SessionProvider>
  );
}
