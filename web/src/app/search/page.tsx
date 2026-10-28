"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Pulse } from "@/lib/types";
import { EmptyState, ErrorState, LoadingCards, PulseCard } from "@/components/PulseCard";

function SearchResults() {
  const params = useSearchParams(); const query = params.get("q") || "";
  const [items, setItems] = useState<Pulse[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (!query.trim()) { setItems([]); return; } let active = true; setLoading(true); setError(""); api.search(query).then(results => { if (active) setItems(results.map((item: any) => ({ ...item, id: item.id || item.eventId, summary: item.summary || item.matchReasons?.join(" · ") || "A relevant match in the TechPulse update library." }))); }).catch(err => active && setError(err.message)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [query]);
  return <div className="content-wrap"><div className="page-heading"><p className="eyebrow"><Search size={13} /> SEARCH</p><h1>Search updates<span className="heading-dot">.</span></h1><p>Find updates by topic, company, or keyword.</p></div>{query && <div className="results-label">Results for <strong>“{query}”</strong></div>}{loading ? <LoadingCards /> : error ? <ErrorState message={error} /> : items.length ? <div className="pulse-list">{items.map(item => <PulseCard key={item.id} pulse={item} compact />)}</div> : <EmptyState title={query ? "No matches yet" : "What are you looking for?"} message={query ? "Try a different word or a broader topic." : "Search for a technology, company, or release."} action={!query && <div className="search-suggestions">{["AI", "Android", "Kubernetes", "Open source"].map(term => <a className="topic-chip" key={term} href={`/search?q=${encodeURIComponent(term)}`}><Sparkles size={12} /> {term}</a>)}</div>} />}</div>;
}
export default function SearchPage() { return <Suspense fallback={<main className="content-wrap"><LoadingCards /></main>}><SearchResults /></Suspense>; }
