"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ArrowUpRight, Clock3, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Pulse } from "@/lib/types";
import { api } from "@/lib/api";
import { useSession } from "@/components/AppShell";

export function PulseCard({ pulse, compact = false }: { pulse: Pulse; compact?: boolean }) {
  const { user, token } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(Boolean(pulse.bookmarked));
  const [busy, setBusy] = useState(false);
  const title = pulse.headline || pulse.title || "Technology update";
  const date = pulse.publishedTime || pulse.fetchedAt;
  const summary = pulse.summary || pulse.contentSummary || "A new development worth keeping an eye on.";
  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user || !token) { router.push("/settings"); return; }
    if (busy) return;
    setBusy(true);
    try { if (saved) await api.removeBookmark(pulse.id || pulse.eventId || "", token); else await api.bookmark(pulse.id || pulse.eventId || "", token); setSaved(!saved); }
    catch (error) { console.error(error); }
    finally { setBusy(false); }
  }
  return <article className={`pulse-card ${compact ? "pulse-card-compact" : ""}`}>
    <div className="card-main"><div className="card-meta"><span className="category-pill">{pulse.category || pulse.categoryName || "Technology"}</span><span className="meta-separator">·</span><span>{pulse.sourceName || pulse.technology || "TechPulse"}</span>{date && <><span className="meta-separator">·</span><span>{formatDate(date)}</span></>}</div>
      <Link href={`/updates/${encodeURIComponent(pulse.id || pulse.eventId || "")}`} className="card-title">{title}</Link>
      <p className="card-summary">{summary}</p>
      {!compact && <div className="card-footer"><span className="read-time"><Clock3 size={13} /> 3 min read</span>{pulse.technology && <span className="tech-tag">{pulse.technology}</span>}<Link className="read-link" href={`/updates/${encodeURIComponent(pulse.id || pulse.eventId || "")}`}>Read update <ArrowUpRight size={14} /></Link></div>}
    </div>
    <button className={`save-button ${saved ? "is-saved" : ""}`} onClick={toggleSave} disabled={busy} aria-label={saved ? "Remove bookmark" : "Save update"} title={user ? (saved ? "Remove from reading list" : "Save to reading list") : "Sign in to save"}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button>
  </article>;
}

export function LoadingCards() { return <div className="pulse-list">{[1, 2, 3, 4].map(i => <div className="skeleton-card" key={i}><div className="skeleton-line skeleton-short" /><div className="skeleton-line skeleton-title" /><div className="skeleton-line" /><div className="skeleton-line skeleton-half" /></div>)}</div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="empty-state"><div className="empty-icon">!</div><h3>We couldn’t load your updates</h3><p>{message || "Check your connection and give it another try."}</p>{onRetry && <button className="button button-secondary" onClick={onRetry}>Try again</button>}</div>; }
export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Sparkles size={20} /></div><h3>{title}</h3><p>{message}</p>{action}</div>; }

export function formatDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Recently"; const days = Math.floor((Date.now() - date.getTime()) / 86400000); if (days < 1) return "Today"; if (days === 1) return "Yesterday"; if (days < 7) return `${days} days ago`; return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date); }
