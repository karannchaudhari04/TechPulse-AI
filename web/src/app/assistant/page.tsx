"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Code2, Sparkles, WandSparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/components/AppShell";
import { EmptyState } from "@/components/PulseCard";

type Message = { role: "user" | "assistant"; content: string };
const starters = ["Explain a recent AI breakthrough", "Compare React and Svelte for a new project", "What should I know before upgrading Node.js?"];

export default function AssistantPage() {
  const { user, token } = useSession(); const [messages, setMessages] = useState<Message[]>([]); const [prompt, setPrompt] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  async function send(event?: FormEvent, suggested?: string) {
    event?.preventDefault(); const value = (suggested ?? prompt).trim(); if (!value || busy || !token) return;
    const history = messages; const next = [...messages, { role: "user" as const, content: value }]; setMessages(next); setPrompt(""); setBusy(true); setError("");
    try { const result = await api.assistant(value, history, token); setMessages([...next, { role: "assistant", content: result.message?.content || "I couldn’t generate a response just now." }]); }
    catch (err) { setError(err instanceof Error ? err.message : "The assistant is unavailable right now."); setMessages(history); setPrompt(value); }
    finally { setBusy(false); }
  }
  if (!user) return <div className="content-wrap"><div className="page-heading"><p className="eyebrow"><Sparkles size={13} /> TECHPULSE ASSISTANT</p><h1>Think it through<span className="heading-dot">.</span></h1><p>Get help with technology questions, coding decisions, and release changes.</p></div><EmptyState title="Your technology copilot" message="Sign in to ask questions and get clear, practical answers from the TechPulse assistant." action={<Link href="/settings" className="button button-primary">Sign in to continue</Link>} /></div>;
  return <div className="content-wrap assistant-wrap"><div className="assistant-heading"><div><p className="eyebrow"><Sparkles size={13} /> TECHPULSE ASSISTANT</p><h1>Think it through<span className="heading-dot">.</span></h1><p>Your space for clearer answers and better technical decisions.</p></div><span className="assistant-status"><i /> READY TO HELP</span></div><div className={`assistant-chat ${messages.length ? "has-messages" : ""}`}>
    {!messages.length && <div className="assistant-welcome"><div className="assistant-emblem"><Bot size={25} /></div><h2>What’s on your mind?</h2><p>Ask about a technology, compare tools, or work through a technical problem.</p><div className="prompt-starters">{starters.map((item, index) => <button key={item} onClick={() => send(undefined, item)}><span>{index === 0 ? <Sparkles size={15} /> : index === 1 ? <Code2 size={15} /> : <WandSparkles size={15} />}</span>{item}</button>)}</div></div>}
    {messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${index}-${message.role}`}><span className="chat-avatar">{message.role === "assistant" ? <Sparkles size={15} /> : (user.displayName || user.email || "Y").slice(0, 1).toUpperCase()}</span><div className="chat-content"><span className="chat-name">{message.role === "assistant" ? "TechPulse AI" : "You"}</span><p>{message.content}</p></div></div>)}
    {busy && <div className="chat-message assistant"><span className="chat-avatar"><Sparkles size={15} /></span><div className="chat-content"><span className="chat-name">TechPulse AI</span><div className="typing-dots"><i /><i /><i /></div></div></div>}{error && <p className="assistant-error">{error}</p>}<div ref={bottom} /></div>
    <form className="assistant-composer" onSubmit={send}><textarea value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask a technology question..." rows={2} maxLength={4000} aria-label="Message the TechPulse assistant" /><div className="composer-footer"><span>AI can make mistakes. Verify details that matter.</span><button className="send-button" disabled={busy || !prompt.trim()} aria-label="Send message"><ArrowUp size={17} /></button></div></form><p className="assistant-retention">Conversations are temporary and are not saved to your account.</p>
  </div>;
}
