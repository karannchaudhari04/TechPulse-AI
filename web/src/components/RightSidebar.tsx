"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShieldAlert, Cpu, Activity, Zap, Terminal } from "lucide-react";
import { useState } from "react";

const advisoryTags = [
  { label: "Critical Vulnerabilities", type: "cve", color: "#EF4444", query: "CVE" },
  { label: "Breaking API Changes", type: "breaking", color: "#F59E0B", query: "breaking" },
  { label: "LTS Releases & GA", type: "release", color: "#10B981", query: "release" },
  { label: "AI Model Checkpoints", type: "model", color: "#8B5CF6", query: "model" },
];

const quickTechStack = [
  { name: "Next.js & React", query: "React" },
  { name: "Spring Boot & Java", query: "Spring" },
  { name: "Kubernetes & Cloud", query: "Kubernetes" },
  { name: "TypeScript & Node", query: "TypeScript" },
  { name: "LLM & GenAI", query: "AI" },
  { name: "Docker & Containers", query: "Docker" },
];

export function RightSidebar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleFilterClick(searchTerm: string) {
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  }

  return (
    <aside className="tp-right-panel">
      {/* Search Input with Developer Shortcut hint */}
      <div className="tp-search-box">
        <form className="tp-search-form" onSubmit={handleSearch}>
          <Search size={16} className="tp-search-icon" />
          <input
            type="text"
            className="tp-search-input"
            placeholder="Search technologies, CVEs, releases..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="tp-search-kbd">/</kbd>
        </form>
      </div>

      {/* Widget 1: Autonomous Ingestion Radar */}
      <div className="tp-radar-card">
        <div className="tp-radar-header">
          <div className="tp-radar-badge">
            <span className="tp-radar-pulse-dot" />
            <span className="tp-radar-title">INTELLIGENCE RADAR</span>
          </div>
          <Activity size={16} className="text-[#10B981]" />
        </div>

        <div className="tp-radar-metrics">
          <div className="tp-radar-metric-row">
            <span className="tp-metric-label">Ingestion Cadence</span>
            <span className="tp-metric-value">Every 8 Hours</span>
          </div>
          <div className="tp-radar-metric-row">
            <span className="tp-metric-label">Synthesis Engine</span>
            <span className="tp-metric-value">Gemini AI Pipeline</span>
          </div>
          <div className="tp-radar-metric-row">
            <span className="tp-metric-label">Deduplication</span>
            <span className="tp-metric-value">Jaro-Winkler ≥ 0.85</span>
          </div>
          <div className="tp-radar-metric-row">
            <span className="tp-metric-label">Cluster Sync</span>
            <span className="tp-metric-value text-[#10B981]">Healthy (ShedLock)</span>
          </div>
        </div>
      </div>

      {/* Widget 2: Release & Security Advisories */}
      <div className="tp-radar-card">
        <div className="tp-radar-header">
          <div className="tp-radar-title-group">
            <ShieldAlert size={16} className="text-[#EF4444]" />
            <h3 className="tp-radar-heading">Security & Velocity Radar</h3>
          </div>
          <Terminal size={14} className="text-[#71767b]" />
        </div>

        <p className="tp-radar-desc">
          Automated extraction of high-risk advisories and breaking migrations.
        </p>

        <div className="tp-advisories-list">
          {advisoryTags.map((adv, idx) => (
            <button
              key={idx}
              type="button"
              className="tp-advisory-item"
              onClick={() => handleFilterClick(adv.query)}
            >
              <div className="tp-advisory-left">
                <span
                  className="tp-advisory-dot"
                  style={{ backgroundColor: adv.color, boxShadow: `0 0 8px ${adv.color}` }}
                />
                <span className="tp-advisory-label">{adv.label}</span>
              </div>
              <span className="tp-advisory-arrow">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Widget 3: Quick Stack Navigator */}
      <div className="tp-radar-card">
        <div className="tp-radar-header">
          <div className="tp-radar-title-group">
            <Cpu size={16} className="text-[#8B5CF6]" />
            <h3 className="tp-radar-heading">Quick Stack Radar</h3>
          </div>
          <Zap size={14} className="text-[#F59E0B]" />
        </div>

        <div className="tp-stack-chips">
          {quickTechStack.map((tech, idx) => (
            <button
              key={idx}
              type="button"
              className="tp-stack-chip"
              onClick={() => handleFilterClick(tech.query)}
            >
              <span>{tech.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="tp-sidebar-footer">
        <span>TechPulse AI Platform • Autonomous Developer Intelligence</span>
      </div>
    </aside>
  );
}
