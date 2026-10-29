"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category, Pulse } from "@/lib/types";
import { EmptyState, ErrorState, LoadingCards, PulseCard } from "@/components/PulseCard";
import { useSession } from "@/components/AppShell";
import { getCategoryTheme } from "@/lib/categoryTheme";

export default function HomePage() {
  const { user, token } = useSession();
  const [items, setItems] = useState<Pulse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userPicked, setUserPicked] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cursorRef = useRef<string | null>(null);
  const [hasNext, setHasNext] = useState(false);

  // Load user picked topics
  useEffect(() => {
    if (token) {
      api.preferences(token)
        .then(res => {
          if (Array.isArray(res) && res.length) setUserPicked(res);
        })
        .catch(() => {});
    } else {
      try {
        const draft = JSON.parse(localStorage.getItem("techpulse-topic-draft") || "[]");
        if (Array.isArray(draft) && draft.length) setUserPicked(draft);
      } catch {}
    }
  }, [token]);

  // Load available categories
  useEffect(() => {
    api.categories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async (append = false) => {
    setLoading(true);
    setError("");
    try {
      const page = await api.feed(token, selected || undefined, append ? cursorRef.current : undefined);
      setItems(current => append ? [...current, ...page.content] : page.content);
      cursorRef.current = page.nextCursor;
      setHasNext(page.hasNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the TechPulse API.");
    } finally {
      setLoading(false);
    }
  }, [selected, token]);

  useEffect(() => {
    cursorRef.current = null;
    setItems([]);
    load();
  }, [load]);

  // Use user-picked categories, or fallback to default top categories
  const displayCategories = useMemo(() => {
    if (userPicked.length > 0) return userPicked;
    return categories.slice(0, 6).map(c => c.name);
  }, [userPicked, categories]);

  return (
    <div className="tp-center-timeline">
      {/* Sticky Header: "Updates" first, then side-by-side user-picked categories */}
      <header className="tp-timeline-header">
        <div className="tp-updates-row">
          <h1 className="tp-updates-title">Updates</h1>

          <div className="tp-categories-track">
            <button
              type="button"
              className={`tp-cat-chip ${selected === "" ? "is-selected" : ""}`}
              onClick={() => setSelected("")}
            >
              <span className="tp-cat-dot all-dot" />
              <span>All</span>
            </button>

            {displayCategories.map(catName => {
              const theme = getCategoryTheme(catName);
              const isSelected = selected === catName;
              return (
                <button
                  key={catName}
                  type="button"
                  className={`tp-cat-chip ${isSelected ? "is-selected" : ""}`}
                  style={isSelected ? { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text } : undefined}
                  onClick={() => setSelected(isSelected ? "" : catName)}
                >
                  <span className="tp-cat-dot" style={{ backgroundColor: theme.dot }} />
                  <span>{catName}</span>
                </button>
              );
            })}

            <Link href="/topics" className="tp-edit-topics-btn" title="Edit your picked topics">
              <SlidersHorizontal size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Timeline Feed Stream */}
      {loading && !items.length ? (
        <LoadingCards />
      ) : error && !items.length ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : items.length ? (
        <div className="x-timeline-feed">
          {items.map(item => (
            <PulseCard key={item.id} pulse={item} />
          ))}

          {loading && <LoadingCards />}

          {hasNext && (
            <div className="x-load-more-container">
              <button
                type="button"
                className="x-load-more-btn"
                onClick={() => load(true)}
              >
                <span>Show more updates</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No updates found"
          message="There aren’t any updates for this topic yet. Try choosing another category."
        />
      )}

      {!user && (
        <div className="tp-guest-banner">
          <div className="tp-guest-banner-copy">
            <strong>Personalize your feed</strong>
            <p>Sign in to sync your picked categories and reading list across devices.</p>
          </div>
          <Link href="/settings" className="tp-btn-primary">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
