"use client";

import Link from "next/link";
import { Bookmark, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Pulse } from "@/lib/types";
import { EmptyState, ErrorState, LoadingCards, PulseCard } from "@/components/PulseCard";
import { useSession } from "@/components/AppShell";

export default function SavedPage() {
  const { user, token, ready } = useSession(); const [items, setItems] = useState<Pulse[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { if (!ready) return; if (!user || !token) { setLoading(false); return; } api.bookmarks(token).then(setItems).catch(err => setError(err.message)).finally(() => setLoading(false)); }, [ready, user, token]);
  return <div className="content-wrap"><div className="page-heading"><p className="eyebrow"><Bookmark size={13} /> YOUR LIBRARY</p><h1>Reading list<span className="heading-dot">.</span></h1><p>Good finds, kept close for later.</p></div>{loading ? <LoadingCards /> : !user ? <EmptyState title="Your reading list, wherever you go" message="Sign in to save updates and pick up right where you left off across devices." action={<Link className="button button-primary" href="/settings"><LockKeyhole size={15} /> Sign in to sync</Link>} /> : error ? <ErrorState message={error} /> : items.length ? <div className="pulse-list">{items.map(item => <PulseCard key={item.id} pulse={{ ...item, bookmarked: true }} />)}</div> : <EmptyState title="A little room for your next big idea" message="Save updates from your feed and they’ll show up here." action={<Link className="button button-secondary" href="/">Browse your feed</Link>} />}</div>;
}
