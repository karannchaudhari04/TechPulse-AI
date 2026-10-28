import type { Metadata } from "next";
import "./styles.css";
import "./assistant.css";
import "./dark.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "TechPulse AI — Technology, made clearer", template: "%s | TechPulse AI" },
  description: "A calmer way to keep up with the technology that matters. AI-curated updates, useful context, and a feed tuned to you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
