"use client";

import Link from "next/link";
import { useSession } from "@/components/AppShell";
import { LockKeyhole, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const { user, logout, openAuth } = useSession();
  return <div className="content-wrap"><div className="page-heading"><p className="eyebrow"><Sparkles size={13} /> PREFERENCES</p><h1>Your account<span className="heading-dot">.</span></h1><p>Manage the parts of TechPulse that are personal to you.</p></div><div className="settings-card">{user ? <><div className="settings-avatar">{(user.displayName || user.email || "T").slice(0, 1).toUpperCase()}</div><div className="settings-account"><span className="aside-label">SIGNED IN</span><h2>{user.displayName || "TechPulse reader"}</h2><p>{user.email}</p></div><Link href="/topics" className="button button-secondary">Choose topics</Link></> : <><div className="settings-avatar"><LockKeyhole size={21} /></div><div className="settings-account"><span className="aside-label">SYNC YOUR ACCOUNT</span><h2>Use TechPulse on every device.</h2><p>Sign in with the same Google account as the mobile app to sync your saved updates and topics.</p></div></>}</div>{user ? <button className="signout-button" onClick={() => logout()}>Sign out</button> : <button className="button button-primary settings-signin" onClick={openAuth}><LockKeyhole size={15} /> Continue with Google</button>}<div className="settings-footer-note"><Sparkles size={15} /> Choose your topics to personalize the feed. <Link href="/topics">Manage topics</Link></div></div>;
}
