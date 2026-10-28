import type { Category, Pulse } from "./types";

const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/$/, "");

async function request<T>(path: string, token?: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.success === false) throw new Error(json?.message || `Request failed (${response.status})`);
  return (json?.data ?? null) as T;
}

export const api = {
  feed: (token?: string | null, category?: string, cursor?: string | null) => request<{ content: Pulse[]; nextCursor: string | null; hasNext: boolean }>(`/feed?limit=30${category ? `&category=${encodeURIComponent(category)}` : ""}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, token),
  categories: () => request<Category[]>("/categories"),
  search: (query: string) => request<Pulse[]>(`/search?query=${encodeURIComponent(query)}`),
  event: (id: string, token?: string | null) => request<Pulse>(`/events/${encodeURIComponent(id)}`, token),
  bookmarks: (token: string) => request<Pulse[]>("/user/bookmarks", token),
  bookmark: (id: string, token: string) => request<void>("/user/bookmark", token, { method: "POST", body: JSON.stringify({ eventId: id }) }),
  removeBookmark: (id: string, token: string) => request<void>(`/user/bookmark/${encodeURIComponent(id)}`, token, { method: "DELETE" }),
  register: (user: { uid: string; email: string | null; displayName: string | null; photoUrl: string | null }, token: string) => request<{ hasPreferences: boolean }>("/users/register-or-login", token, { method: "POST", body: JSON.stringify(user) }),
  preferences: (token: string) => request<string[]>("/users/preferences", token),
  savePreferences: (categories: string[], token: string) => request<void>("/users/preferences", token, { method: "POST", body: JSON.stringify({ categories }) }),
  assistant: (prompt: string, history: { role: "user" | "assistant"; content: string }[], token: string) => request<{ message: { content: string } }>("/assistant/chat", token, { method: "POST", body: JSON.stringify({ prompt, history }) }),
  interaction: (eventId: string, type: string, token: string) => request<void>("/user/interaction", token, { method: "POST", body: JSON.stringify({ eventId, type }) }),
};
