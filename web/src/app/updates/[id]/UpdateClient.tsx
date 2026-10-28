"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, Clock3, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Pulse } from "@/lib/types";
import { LoadingCards, formatDate } from "@/components/PulseCard";
import { useSession } from "@/components/AppShell";

export default function UpdateClient({ id, initialItem }: { id: string; initialItem: Pulse | null }) {
  const { token, user } = useSession(); const [item, setItem] = useState<Pulse | null>(initialItem); const [loading, setLoading] = useState(!initialItem); const [error, setError] = useState(""); const [saved, setSaved] = useState(Boolean(initialItem?.bookmarked));
  useEffect(() => { api.event(id, token).then(result => { setItem(result); setSaved(Boolean(result.bookmarked)); }).catch(err => { if (!initialItem) setError(err.message); }).finally(() => setLoading(false)); }, [id, token, initialItem]);
  useEffect(() => { if (token) void api.interaction(id, "VIEW", token).catch(() => {}); }, [id, token]);
  async function toggleBookmark() { if (!user || !token || !item) return; try { if (saved) await api.removeBookmark(item.id, token); else { await api.bookmark(item.id, token); await api.interaction(item.id, "BOOKMARK", token).catch(() => {}); } setSaved(!saved); } catch (err) { setError(err instanceof Error ? err.message : "Could not update reading list."); } }
  if (loading) return <div className="content-wrap"><LoadingCards /></div>;
  if (!item) return <div className="content-wrap"><div className="detail-error"><p>{error || "This update couldn’t be found."}</p><Link href="/">Back to your feed</Link></div></div>;
  const title = item.headline || item.title || "Technology update";
  return <article className="content-wrap detail-wrap">
    <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to your briefing</Link>
    <div className="detail-header">
      <div className="card-meta"><span className="category-pill">{item.category || item.categoryName || "Technology"}</span><span className="meta-separator">·</span><span>{item.sourceName || item.technology || "TechPulse"}</span></div>
      <h1>{title}</h1>
      <div className="detail-byline"><span><CalendarDays size={14} />{formatDate(item.publishedTime || item.fetchedAt || "")}</span><span><Clock3 size={14} /> 3 min read</span><button className={`detail-save ${saved ? "is-saved" : ""}`} onClick={toggleBookmark}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save for later"}</button></div>
    </div>
    <div className="detail-grid">
      <div className="article-body">
        <div className="summary-box"><span className="summary-label">THE SHORT VERSION</span><p>{item.summary || item.contentSummary || "A technology update from across the ecosystem."}</p></div>
        {item.developerImpact && <section><h2>Why developers should care</h2><p>{item.developerImpact}</p></section>}
        {item.technicalImpact && <section><h2>Technical impact</h2><p>{item.technicalImpact}</p></section>}
        {item.enterpriseImpact && <section><h2>What it means for teams</h2><p>{item.enterpriseImpact}</p></section>}
        {!item.developerImpact && !item.technicalImpact && !item.enterpriseImpact && <section><h2>Keep exploring</h2><p>TechPulse brings the essential context into one place, so you can decide what deserves a closer look.</p></section>}
        {(item.articleUrl || item.sourceUrl) && <a className="source-link" href={item.articleUrl || item.sourceUrl} target="_blank" rel="noreferrer">Read the original source <ExternalLink size={14} /></a>}
      </div>
      <aside className="detail-aside">
        <div className="aside-card"><span className="aside-label">UPDATE DETAILS</span><div className="aside-row"><span>Topic</span><strong>{item.category || item.categoryName || "Technology"}</strong></div>{item.technology && <div className="aside-row"><span>Technology</span><strong>{item.technology}</strong></div>}<div className="aside-row"><span>Source</span><strong>{item.sourceName || "TechPulse"}</strong></div><button className="aside-action" onClick={toggleBookmark}><Bookmark size={15} /> {saved ? "Remove from reading list" : "Save this update"} <ArrowUpRight size={14} /></button></div>
        <div className="aside-note"><span>READ WITH CONTEXT</span><p>Summarized by TechPulse AI. Follow the source link for the original announcement.</p></div>
        <Link className="back-to-feed" href="/">More updates <ArrowUpRight size={14} /></Link>
      </aside>
    </div>
  </article>;
}
