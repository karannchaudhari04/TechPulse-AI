"use client";

import Link from "next/link";
import { useSession } from "@/components/AppShell";
import { LockKeyhole, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const { user } = useSession();
  return <div className="content-wrap"><div className="page-heading"><p className="eyebrow"><Sparkles size={13} /> YOUR ACCOUNT</p><h1>Make TechPulse yours<span className="heading-dot">.</span></h1><p>Your preferences and saved updates travel with your account.</p></div><div className="settings-card">{user ? <><div className="settings-avatar">{(user.displayName || user.email || "T").slice(0, 1).toUpperCase()}</div><div className="settings-account"><span className="aside-label">SIGNED IN AS</span><h2>{user.displayName || "TechPulse reader"}</h2><p>{user.email}</p></div><Link href="/topics" className="button button-secondary">Manage topics</Link></> : <><div className="settings-avatar"><LockKeyhole size={21} /></div><div className="settings-account"><span className="aside-label">YOUR TECHPULSE ACCOUNT</span><h2>Pick up where you left off.</h2><p>Sign in to sync your followed topics and reading list with the mobile app.</p></div><p className="settings-benefit"><span>01</span> A feed tuned to your interests</p><p className="settings-benefit"><span>02</span> Saved updates on every device</p><p className="settings-benefit"><span>03</span> One account for mobile and web</p></>}</div>{!user && <Link href="/?signin=1" className="button button-primary settings-signin" onClick={e => { e.preventDefault(); document.querySelector<HTMLButtonElement>(".profile-row")?.click(); }}> <LockKeyhole size={15} /> Sign in or create account</Link>}<div className="settings-footer-note"><Sparkles size={15} /> Set up your interests to shape your feed. <Link href="/topics">Explore topics</Link></div></div>;
}
