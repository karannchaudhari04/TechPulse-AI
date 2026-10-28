"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Compass, Menu, Search, Settings2, Sparkles, X, MessageCircle, UserRound } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { api } from "@/lib/api";
import { auth, firebaseConfigured } from "@/lib/firebase";

type Session = { user: User | null; token: string | null; ready: boolean; authOpen: boolean; openAuth: () => void; closeAuth: () => void; googleLogin: () => Promise<void>; logout: () => Promise<void> };
const SessionContext = createContext<Session | null>(null);
export const useSession = () => { const value = useContext(SessionContext); if (!value) throw new Error("SessionProvider is missing"); return value; };

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
      if (!next) { setToken(null); return; }
      const nextToken = await next.getIdToken();
      try { await api.register({ uid: next.uid, email: next.email, displayName: next.displayName, photoUrl: next.photoURL }, nextToken); } catch (error) { console.error("Account sync failed", error); }
      setToken(nextToken);
    });
  }, []);
  const value = useMemo<Session>(() => ({
    user, token, ready, authOpen, openAuth: () => setAuthOpen(true), closeAuth: () => setAuthOpen(false),
    googleLogin: async () => { if (!auth) throw new Error("Add Firebase web credentials to web/.env.local first."); const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); await signInWithPopup(auth, provider); },
    logout: async () => { if (auth) await signOut(auth); setUser(null); setToken(null); },
  }), [user, token, ready, authOpen]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

const links = [
  { href: "/", label: "Feed", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/assistant", label: "Assistant", icon: MessageCircle },
];

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authOpen, openAuth, closeAuth } = useSession();
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const doSearch = (e: React.FormEvent) => { e.preventDefault(); if (query.trim()) { router.push(`/search?q=${encodeURIComponent(query.trim())}`); setMobileNav(false); } };
  return <div className="app-frame">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <Link href="/" className="brand" onClick={() => setMobileNav(false)}><span className="brand-mark"><Sparkles size={17} /></span><span>techpulse<span className="brand-ai">.ai</span></span></Link>
      <nav className="main-nav">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileNav(false)} className={`nav-link ${active(href) ? "nav-active" : ""}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{href === "/saved" && <span className="nav-arrow">›</span>}</Link>)}</nav>
      <div className="sidebar-bottom">
        <Link href="/settings" className="preferences-link"><Settings2 size={16} /> Preferences</Link>
        {user ? <button className="profile-row" onClick={() => router.push("/settings")}><span className="avatar">{(user.displayName || user.email || "T").slice(0, 1).toUpperCase()}</span><span className="profile-copy"><strong>{user.displayName || "Your account"}</strong><small>Account settings</small></span></button> : <button className="profile-row" onClick={openAuth}><span className="avatar avatar-guest"><UserRound size={15} /></span><span className="profile-copy"><strong>Guest</strong><small>Sign in with Google</small></span></button>}
      </div>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button><form className="top-search" onSubmit={doSearch}><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search updates..." aria-label="Search updates" /><kbd>↵</kbd></form><button className="top-avatar" onClick={() => user ? router.push("/settings") : openAuth()} title={user ? "Account settings" : "Sign in"}>{user ? (user.displayName || user.email || "T").slice(0, 1).toUpperCase() : <UserRound size={15} />}</button></header>
      {children}
      <footer className="site-footer"><span>TechPulse AI</span><span>Technology, made clearer.</span></footer>
    </main>
    {authOpen && <AuthModal onClose={closeAuth} />}
  </div>;
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { googleLogin } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setError(""); setBusy(true);
    try { await googleLogin(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not sign in. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="auth-modal"><button className="modal-close" aria-label="Close" onClick={onClose}><X size={18} /></button><div className="auth-mark"><Sparkles size={19} /></div><p className="eyebrow">YOUR SIGNAL, EVERYWHERE</p><h2>Welcome to TechPulse.</h2><p className="auth-description">Use the same Google account as the mobile app to sync your topics and reading list.</p>{error && <p className="form-error">{error}</p>}<button className="google-button" onClick={submit} disabled={busy}><GoogleMark />{busy ? "Connecting to Google…" : "Continue with Google"}</button>{!firebaseConfigured && <p className="config-hint">Firebase web config is needed in <code>web/.env.local</code> to enable authentication.</p>}<p className="auth-privacy">Your Google account is used to sign you into TechPulse.</p></section></div>;
}

function GoogleMark() { return <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" transform="translate(0 5)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.94 46.98 31.8 46.98 24.55z" transform="translate(0 -1)"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19z" transform="translate(0 0)"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" transform="translate(0 -2)"/></svg>; }

export function AppShell({ children }: { children: React.ReactNode }) { return <SessionProvider><ShellContent>{children}</ShellContent></SessionProvider>; }
