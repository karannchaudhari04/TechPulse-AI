"use client";

import Link from "next/link";
import { Bookmark, Bot, Check, ExternalLink, Share2, Sparkles, X, RefreshCw, AlertCircle } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
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
  const sourceName = pulse.sourceName || pulse.technology || "TechPulse";

  // Domain & Favicon
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
  const handleTag = `@${(sourceName || domain || "techpulse").toLowerCase().replace(/[^a-z0-9_]/g, "")}`;

  // Image fallback
  const heroImage = useMemo(() => {
    if (imgError) return categoryFallbackImages[categoryName] || defaultFallbackImage;
    return pulse.thumbnailUrl || categoryFallbackImages[categoryName] || defaultFallbackImage;
  }, [pulse.thumbnailUrl, categoryName, imgError]);

  // Bullet summary
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

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = typeof window !== "undefined"
      ? `${window.location.origin}/updates/${encodeURIComponent(pulse.id || pulse.eventId || "")}`
      : targetUrl;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
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
  const dateFormatted = formatDate(pulse.publishedTime || pulse.fetchedAt || "");

  return (
    <>
      <article className="x-post-article">
        {/* Left Column: Author/Source Avatar */}
        <div className="x-post-avatar-col">
          <div className="x-post-avatar">
            {faviconUrl && !faviconError ? (
              <img
                src={faviconUrl}
                alt={sourceName}
                className="x-avatar-img"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <span className="x-avatar-initial">
                {sourceName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Tweet Content & Actions */}
        <div className="x-post-main">
          {/* Header Line: Name · Verified · Handle · Time · Category */}
          <div className="x-post-header">
            <div className="x-post-user-info">
              <strong className="x-post-name">{sourceName}</strong>
              <svg className="x-verified-badge" viewBox="0 0 22 22" aria-label="Verified Source">
                <path
                  fill="#1d9bf0"
                  d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.68.132-.636.075-1.298-.164-1.902.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.136 2.136 5.405-5.404 1.293 1.302-6.7 6.696z"
                />
              </svg>
              <span className="x-post-handle">{handleTag}</span>
              <span className="x-post-dot">·</span>
              <span className="x-post-time">{dateFormatted}</span>
            </div>
          </div>

          {/* Post Text & Bullets */}
          <Link href={detailPath} className="x-post-title">
            {title}
          </Link>

          <ul className="x-post-bullets">
            {summaryPoints.map((point, idx) => (
              <li key={idx} className="x-post-bullet-item">
                <span className="x-bullet-icon">•</span>
                <span>{point.replace(/^[•\-\*]\s*/, "")}</span>
              </li>
            ))}
          </ul>

          {/* Embedded X Link Card Preview */}
          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="x-link-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="x-link-card-media">
                <img
                  src={heroImage}
                  alt={title}
                  className="x-link-card-img"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
                <div className="x-link-card-domain-badge">{domain || "Original Article"}</div>
              </div>
              <div className="x-link-card-content">
                <span className="x-link-card-domain">{domain}</span>
                <strong className="x-link-card-title">{title}</strong>
                <p className="x-link-card-desc">
                  {summaryPoints[0]?.slice(0, 110) || "Read the full coverage and release announcements on the source site."}…
                </p>
              </div>
            </a>
          )}

          {/* X Post Action Bar */}
          <div className="x-post-actions">
            {/* 💬 Explain Button */}
            <button
              type="button"
              className="x-action-btn x-action-explain"
              onClick={handleExplain}
              title="Explain simply with AI"
            >
              <span className="x-action-icon-circle">
                <Bot size={18} />
              </span>
              <span className="x-action-count">Explain</span>
            </button>

            {/* 🔄 Source Link Button */}
            <a
              href={targetUrl || detailPath}
              target={targetUrl ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="x-action-btn x-action-source"
              title={`Read on ${domain || "Source"}`}
              onClick={e => e.stopPropagation()}
            >
              <span className="x-action-icon-circle">
                <ExternalLink size={18} />
              </span>
              <span className="x-action-count">Source</span>
            </a>

            {/* 🔖 Bookmark Button */}
            <button
              type="button"
              className={`x-action-btn x-action-save ${saved ? "is-saved" : ""}`}
              onClick={toggleSave}
              disabled={busy}
              title={saved ? "Remove Bookmark" : "Bookmark"}
            >
              <span className="x-action-icon-circle">
                <Bookmark
                  size={18}
                  fill={saved ? "#1d9bf0" : "none"}
                  color={saved ? "#1d9bf0" : "currentColor"}
                />
              </span>
              <span className="x-action-count">{saved ? "Saved" : "Save"}</span>
            </button>

            {/* 📤 Share Button */}
            <button
              type="button"
              className={`x-action-btn x-action-share ${copied ? "is-copied" : ""}`}
              onClick={handleShare}
              title="Copy link to clipboard"
            >
              <span className="x-action-icon-circle">
                {copied ? <Check size={18} color="#00ba7c" /> : <Share2 size={18} />}
              </span>
              <span className="x-action-count">{copied ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </div>
      </article>

      {/* AI Explain Modal Sheet */}
      {explainOpen && (
        <div className="bite-modal-backdrop" onClick={() => setExplainOpen(false)}>
          <div className="bite-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="bite-modal-handle" />

            <div className="bite-modal-header">
              <span className="bite-modal-kicker">TechPulse AI Insight</span>
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
                  <RefreshCw size={28} className="animate-spin text-[#1d9bf0]" />
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
                    <Sparkles size={14} color="#1d9bf0" />
                    <span>Structured AI intelligence generated for developers.</span>
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
    <div className="x-timeline-feed">
      {[1, 2, 3, 4].map(i => (
        <div className="x-post-article x-skeleton-post" key={i}>
          <div className="x-post-avatar-col">
            <div className="x-skeleton-circle" />
          </div>
          <div className="x-post-main">
            <div className="skeleton-line" style={{ width: "40%", height: "16px", marginBottom: "12px" }} />
            <div className="skeleton-line" style={{ width: "90%", height: "20px", marginBottom: "12px" }} />
            <div className="skeleton-line" style={{ width: "98%", height: "14px", marginBottom: "8px" }} />
            <div className="skeleton-line" style={{ width: "75%", height: "14px", marginBottom: "16px" }} />
            <div className="x-skeleton-card" />
          </div>
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
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
