"use client";

import Link from "next/link";
import { ArrowUpRight, Cpu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { useSession } from "@/components/AppShell";

export default function TopicsPage() {
  const { user, token } = useSession(); const [categories, setCategories] = useState<Category[]>([]); const [followed, setFollowed] = useState<string[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { api.categories().then(setCategories).catch(() => setMessage("Could not load topics from the API.")).finally(() => setLoading(false)); if (token) api.preferences(token).then(saved => { if (saved.length) setFollowed(saved); }).catch(() => {}); else { try { const draft = JSON.parse(localStorage.getItem("techpulse-topic-draft") || "[]"); if (Array.isArray(draft)) setFollowed(draft); } catch {} } }, [token]);
  const toggle = (name: string) => setFollowed(current => { const next = current.includes(name) ? current.filter(item => item !== name) : [...current, name]; try { localStorage.setItem("techpulse-topic-draft", JSON.stringify(next)); } catch {} return next; });
  async function save() { if (!token) return; setSaving(true); setMessage(""); try { await api.savePreferences(followed, token); setMessage("Your interests are saved. Your feed will reflect your choices."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your interests."); } finally { setSaving(false); } }
  return <div className="content-wrap"><div className="page-heading"><p className="eyebrow"><Cpu size={13} /> PREFERENCES</p><h1>Your topics<span className="heading-dot">.</span></h1><p>Choose topics to shape the updates in your feed.</p></div>{!user && <div className="topic-signin"><Sparkles size={18} /><p><strong>Browsing as a guest.</strong> Choose topics now; sign in to sync them.</p><Link href="/settings">Sign in <ArrowUpRight size={14} /></Link></div>}{loading ? <div className="topic-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}</div> : <div className="topic-grid">{categories.map((category, index) => <button key={category.name} className={`topic-card ${followed.includes(category.name) ? "topic-followed" : ""}`} onClick={() => toggle(category.name)}><span className={`topic-symbol symbol-${index % 5}`}><Cpu size={18} /></span><span className="topic-card-name">{category.name}</span><span className="topic-card-action">{followed.includes(category.name) ? "Selected" : "Select"}</span></button>)}</div>}{!categories.length && !loading && <p className="inline-message">No topics are available right now.</p>}{message && <p className="inline-message">{message}</p>}<div className="topic-save-row"><span>{followed.length} selected</span>{user && <button className="button button-primary" onClick={save} disabled={saving || !followed.length}>{saving ? "Saving…" : "Save topics"}</button>}</div></div>;
}
