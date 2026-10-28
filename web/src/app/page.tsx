"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category, Pulse } from "@/lib/types";
import { EmptyState, ErrorState, LoadingCards, PulseCard } from "@/components/PulseCard";
import { useSession } from "@/components/AppShell";

export default function HomePage() {
  const { user, token } = useSession();
  const [items, setItems] = useState<Pulse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cursorRef = useRef<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const load = useCallback(async (append = false) => {
    setLoading(true); setError("");
    try {
      const page = await api.feed(token, selected || undefined, append ? cursorRef.current : undefined);
      setItems(current => append ? [...current, ...page.content] : page.content);
      cursorRef.current = page.nextCursor; setHasNext(page.hasNext);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not reach the TechPulse API."); }
    finally { setLoading(false); }
  }, [selected, token]);
  useEffect(() => { api.categories().then(setCategories).catch(() => setCategories([])); }, []);
  useEffect(() => { load(); }, [load]);
  return <div className="content-wrap">
    <section className="welcome-row"><div><p className="eyebrow"><Sparkles size={13} /> THE SIGNAL, TODAY</p><h1>{user ? <>Good to see you<span className="heading-dot">.</span></> : <>Technology, <span className="muted-heading">made clearer.</span></>}</h1><p className="welcome-sub">{user ? "Your personalized briefing is ready when you are." : "Thoughtful updates for people building what’s next."}</p></div><div className="date-stamp">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</div></section>
    <section className="intro-banner"><div className="banner-orb orb-one" /><div className="banner-orb orb-two" /><div className="banner-copy"><span className="banner-kicker">A LITTLE MORE SIGNAL</span><h2>Big shifts. Clear context.</h2><p>AI-curated technology updates, with the details that matter to your work.</p></div><div className="banner-mark"><span><Sparkles size={23} /></span><i /><i /><i /></div><Link className="banner-arrow" href="/topics" aria-label="Explore topics"><ArrowRight size={20} /></Link></section>
    <div className="section-heading"><div><h2>Your briefing</h2><p>A clearer view of what’s moving in tech.</p></div><button className="sort-button" onClick={() => setSelected("")}>Latest <ChevronDown size={15} /></button></div>
    <div className="topic-chips"><button className={`topic-chip ${selected === "" ? "chip-selected" : ""}`} onClick={() => setSelected("")}>All updates</button>{categories.map(category => <button key={category.name} className={`topic-chip ${selected === category.name ? "chip-selected" : ""}`} onClick={() => setSelected(selected === category.name ? "" : category.name)}>{category.name}</button>)}</div>
    {loading && !items.length ? <LoadingCards /> : error && !items.length ? <ErrorState message={error} onRetry={() => load()} /> : items.length ? <><div className="pulse-list">{items.map(item => <PulseCard key={item.id} pulse={item} />)}</div>{loading && <LoadingCards />}{hasNext && <button className="load-more" onClick={() => load(true)}>Load more updates <ArrowRight size={15} /></button>}</> : <EmptyState title="The feed is taking a breather" message="There aren’t any updates here yet. Try another topic or check back soon." />}
    {!user && <div className="sync-callout"><div className="sync-icon"><Sparkles size={17} /></div><p><strong>Make the feed yours.</strong> Sign in to tune your topics and keep your reading list in sync.</p><Link href="/settings">Set up your feed <ArrowRight size={14} /></Link></div>}
  </div>;
}
