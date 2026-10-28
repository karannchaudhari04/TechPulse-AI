"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
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
  useEffect(() => { cursorRef.current = null; setItems([]); load(); }, [load]);
  const visibleCategories = categories.slice(0, 6);
  return <div className="content-wrap">
    <section className="welcome-row"><div><h1>{user ? `Welcome back${user.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}` : "Latest updates"}<span className="heading-dot">.</span></h1><p className="welcome-sub">{user ? "Your technology briefing, picked for you." : "The latest in technology, with the useful context up front."}</p></div><div className="date-stamp">{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</div></section>
    <div className="feed-toolbar"><span>Filter by topic</span><Link className="manage-topics" href="/topics"><SlidersHorizontal size={14} /> Edit topics</Link></div>
    <div className="topic-chips"><button className={`topic-chip ${selected === "" ? "chip-selected" : ""}`} onClick={() => setSelected("")}>All</button>{visibleCategories.map(category => <button key={category.name} className={`topic-chip ${selected === category.name ? "chip-selected" : ""}`} onClick={() => setSelected(selected === category.name ? "" : category.name)}>{category.name}</button>)}{categories.length > 6 && <Link className="more-topics" href="/topics">More topics</Link>}</div>
    {loading && !items.length ? <LoadingCards /> : error && !items.length ? <ErrorState message={error} onRetry={() => load()} /> : items.length ? <><div className="pulse-list">{items.map(item => <PulseCard key={item.id} pulse={item} />)}</div>{loading && <LoadingCards />}{hasNext && <button className="load-more" onClick={() => load(true)}>Load more updates <ArrowRight size={15} /></button>}</> : <EmptyState title="The feed is taking a breather" message="There aren’t any updates here yet. Try another topic or check back soon." />}
    {!user && <div className="guest-hint">Want a personalized feed? <Link href="/settings">Sign in with Google <ArrowRight size={14} /></Link></div>}
  </div>;
}
