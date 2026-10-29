"use client";

import Link from "next/link";
import { Bookmark, Bot, Globe, Sparkles, X, RefreshCw, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import type { Pulse } from "@/lib/types";
import { api } from "@/lib/api";
import { useSession } from "@/components/AppShell";

const categoryFallbackImages: Record<string, string> = {
  "AI & Machine Learning": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80",
  "Cloud & DevOps": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
  "Cybersecurity": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
  "System Design & Backend": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
  "Development": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80",
  "Product & UI/UX": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80",
  "Open Source & GitHub": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=800&q=80",
};

const defaultFallbackImage = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80";

export function PulseCard({ pulse, compact = false }: { pulse: Pulse; compact?: boolean }) {
  const { user, token, openAuth } = useSession();
  const [saved, setSaved] = useState(Boolean(pulse.bookmarked));
  const [busy, setBusy] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  // Explain modal state
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const title = pulse.headline || pulse.title || "Technology update";
  const categoryName = pulse.category || pulse.categoryName || "Tech";
  const targetUrl = pulse.originalSourceUrl || pulse.sourceUrl || pulse.articleUrl || "";

  // Domain & Favicon extraction
  const domain = useMemo(() => {
    try {
      if (!targetUrl) return "";
      const matches = targetUrl.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
      return matches && matches[1] ? matches[1].replace(/^www\./i, "") : "";
    } catch {
      return "";
    }
  }, [targetUrl]);

  const faviconUrl = domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : "";

  // Dynamic Image URL
  const heroImage = useMemo(() => {
    if (imgError) return categoryFallbackImages[categoryName] || defaultFallbackImage;
    return pulse.thumbnailUrl || categoryFallbackImages[categoryName] || defaultFallbackImage;
  }, [pulse.thumbnailUrl, categoryName, imgError]);

  // Bullet-point parsed summary
  const summaryPoints = useMemo(() => {
    const raw = pulse.contentSummary || pulse.summary || "A new development worth keeping an eye on.";
    let points = raw.includes("•")
      ? raw.split("•").map(p => p.trim()).filter(Boolean)
      : raw.split(/\.\s+/).map(p => p.trim()).filter(p => p.length > 5);
    if (!points.length) points = [raw];
    return points.slice(0, 3);
  }, [pulse.contentSummary, pulse.summary]);

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !token) {
      openAuth();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        await api.removeBookmark(pulse.id || pulse.eventId || "", token);
      } else {
        await api.bookmark(pulse.id || pulse.eventId || "", token);
      }
      setSaved(!saved);
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleExplain(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setExplainOpen(true);
    if (explanation) return;

    if (token) {
      setExplainLoading(true);
      setExplainError(null);
      try {
        const prompt = `Explain this technology update in 2-3 concise, intuitive bullet points for a developer:\n\nTitle: ${title}\nContext: ${pulse.contentSummary || pulse.summary || ""}\nImpact: ${pulse.developerImpact || pulse.technicalImpact || ""}`;
        const res = await api.assistant(prompt, [], token);
        setExplanation(res?.message?.content || "No explanation generated.");
      } catch (err) {
        if (pulse.developerImpact || pulse.technicalImpact || pulse.summary) {
          setExplanation(pulse.developerImpact || pulse.technicalImpact || pulse.summary || "");
        } else {
          setExplainError(err instanceof Error ? err.message : "Failed to load explanation.");
        }
      } finally {
        setExplainLoading(false);
      }
    } else {
      setExplanation(
        pulse.developerImpact
          ? `Developer Impact:\n${pulse.developerImpact}\n\n${pulse.technicalImpact ? `Technical Impact:\n${pulse.technicalImpact}` : ""}`
          : pulse.summary || pulse.contentSummary || "Sign in with Google to get real-time conversational AI explanations for any tech update."
      );
    }
  }

  const detailPath = `/updates/${encodeURIComponent(pulse.id || pulse.eventId || "")}`;

  return (
    <>
      <article className={`bite-card ${compact ? "bite-card-compact" : ""}`}>
        {/* Top Hero Section with Badges */}
        <div className="bite-hero">
          <img
            src={heroImage}
            alt={title}
            className="bite-hero-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          <div className="bite-hero-overlay" />

          {/* Floating Badges */}
          <div className="bite-badge-row">
            <span className="bite-category-badge">{categoryName}</span>
            <div className="bite-top-pick-badge">
              <Sparkles size={12} className="bite-sparkle-icon" />
              <span>Top Pick</span>
            </div>
          </div>
        </div>

        {/* Card Content Section */}
        <div className="bite-content">
          <Link href={detailPath} className="bite-title">
            {title}
          </Link>

          {/* Structured Bullet Points */}
          <ul className="bite-summary-list">
            {summaryPoints.map((point, idx) => (
              <li key={idx} className="bite-bullet-row">
                <span className="bite-bullet-dot">•</span>
                <span className="bite-bullet-text">
                  {point.replace(/^[•\-\*]\s*/, "")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom Floating Action Bar */}
        <div className="bite-action-bar">
          {/* Left Action: Save / Bookmark */}
          <button
            type="button"
            className={`bite-action-btn ${saved ? "is-bookmarked" : ""}`}
            onClick={toggleSave}
            disabled={busy}
            title={saved ? "Remove from bookmarks" : "Save bookmark"}
          >
            <Bookmark
              size={18}
              fill={saved ? "#8B5CF6" : "none"}
              color={saved ? "#8B5CF6" : "currentColor"}
            />
            <span className="bite-action-label">{saved ? "Saved" : "Save"}</span>
          </button>

          {/* Central Source Action with live Domain Favicon */}
          <div className="bite-center-source-wrapper">
            {targetUrl ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bite-center-source-btn"
                title={`Open source: ${domain || "Original Article"}`}
                onClick={e => e.stopPropagation()}
              >
                {faviconUrl && !faviconError ? (
                  <img
                    src={faviconUrl}
                    alt={domain || "Source"}
                    className="bite-source-logo"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <Globe size={18} color="#8B5CF6" />
                )}
              </a>
            ) : (
              <Link href={detailPath} className="bite-center-source-btn" title="View details">
                <Globe size={18} color="#8B5CF6" />
              </Link>
            )}
            <span className="bite-center-source-text">
              {domain ? (domain.length > 12 ? `${domain.slice(0, 10)}…` : domain) : "Source"}
            </span>
          </div>

          {/* Right Action: Explain AI */}
          <button
            type="button"
            className="bite-action-btn bite-explain-btn"
            onClick={handleExplain}
            title="Explain simply with AI"
          >
            <Bot size={19} color="#8B5CF6" />
            <span className="bite-action-label">Explain</span>
          </button>
        </div>

        {/* Purple Bottom Accent Line */}
        <div className="bite-progress-bar">
          <div className="bite-progress-fill" />
        </div>
      </article>

      {/* AI Explain Modal */}
      {explainOpen && (
        <div className="bite-modal-backdrop" onClick={() => setExplainOpen(false)}>
          <div className="bite-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="bite-modal-handle" />

            <div className="bite-modal-header">
              <span className="bite-modal-kicker">AI Deep Dive</span>
              <button
                type="button"
                className="bite-modal-close"
                onClick={() => setExplainOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="bite-modal-title">{title}</h2>

            <div className="bite-modal-body">
              {explainLoading ? (
                <div className="bite-modal-loading">
                  <RefreshCw size={28} className="animate-spin text-indigo-400" />
                  <p>Simplifying for you with Gemini AI...</p>
                </div>
              ) : explainError ? (
                <div className="bite-modal-error">
                  <AlertCircle size={32} color="#EF4444" />
                  <p>{explainError}</p>
                  {token && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={handleExplain}
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : (
                <div className="bite-modal-insight">
                  <div className="bite-explanation-text">
                    {explanation?.split("\n").map((line, i) =>
                      line.trim() ? (
                        <p key={i}>{line}</p>
                      ) : (
                        <div key={i} className="bite-explanation-spacing" />
                      )
                    )}
                  </div>

                  <div className="bite-modal-footer-callout">
                    <Sparkles size={14} color="#8B5CF6" />
                    <span>Insight generated by Gemini AI tailored for software engineers.</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="bite-modal-dismiss"
              onClick={() => setExplainOpen(false)}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function LoadingCards() {
  return (
    <div className="pulse-list">
      {[1, 2, 3, 4].map(i => (
        <div className="bite-card bite-card-skeleton" key={i}>
          <div className="bite-skeleton-hero" />
          <div className="bite-skeleton-content">
            <div className="skeleton-line skeleton-title" style={{ width: "80%", height: "22px", marginBottom: "14px" }} />
            <div className="skeleton-line" style={{ width: "95%", height: "14px", marginBottom: "8px" }} />
            <div className="skeleton-line" style={{ width: "90%", height: "14px", marginBottom: "8px" }} />
            <div className="skeleton-line" style={{ width: "70%", height: "14px" }} />
          </div>
          <div className="bite-skeleton-bar" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">!</div>
      <h3>We couldn’t load your updates</h3>
      <p>{message || "Check your connection and give it another try."}</p>
      {onRetry && (
        <button className="button button-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Sparkles size={20} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
