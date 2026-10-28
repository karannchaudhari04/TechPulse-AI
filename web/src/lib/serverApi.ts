import type { Pulse } from "./types";

export async function getPublicPulse(id: string): Promise<Pulse | null> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/events/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    const result = await response.json();
    return result?.success === false ? null : (result?.data as Pulse) || null;
  } catch {
    return null;
  }
}
