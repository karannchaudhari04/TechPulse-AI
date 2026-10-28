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
  return <div className="content-wrap"><div className="page-heading"><p className="eyebrow"><Bookmark size={13} /> SAVED</p><h1>Saved updates<span className="heading-dot">.</span></h1><p>Updates you want to come back to.</p></div>{loading ? <LoadingCards /> : !user ? <EmptyState title="Your saved updates, on every device" message="Sign in with Google to save updates and sync your reading list." action={<Link className="button button-primary" href="/settings"><LockKeyhole size={15} /> Sign in with Google</Link>} /> : error ? <ErrorState message={error} /> : items.length ? <div className="pulse-list">{items.map(item => <PulseCard key={item.id} pulse={{ ...item, bookmarked: true }} />)}</div> : <EmptyState title="Nothing saved yet" message="Select the bookmark on any update to save it here." action={<Link className="button button-secondary" href="/">Browse updates</Link>} />}</div>;
}
