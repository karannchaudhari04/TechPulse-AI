export type CategoryStyle = {
  primary: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
};

export const CATEGORY_THEMES: Record<string, CategoryStyle> = {
  "AI & Machine Learning": {
    primary: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.2)",
    border: "rgba(139, 92, 246, 0.5)",
    text: "#DDD6FE",
    dot: "#8B5CF6",
  },
  "Cloud & DevOps": {
    primary: "#0EA5E9",
    bg: "rgba(14, 165, 233, 0.2)",
    border: "rgba(14, 165, 233, 0.5)",
    text: "#BAE6FD",
    dot: "#0EA5E9",
  },
  "Cybersecurity": {
    primary: "#EF4444",
    bg: "rgba(239, 68, 68, 0.2)",
    border: "rgba(239, 68, 68, 0.5)",
    text: "#FECACA",
    dot: "#EF4444",
  },
  "System Design & Backend": {
    primary: "#10B981",
    bg: "rgba(16, 185, 129, 0.2)",
    border: "rgba(16, 185, 129, 0.5)",
    text: "#A7F3D0",
    dot: "#10B981",
  },
  "Development": {
    primary: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.2)",
    border: "rgba(245, 158, 11, 0.5)",
    text: "#FDE68A",
    dot: "#F59E0B",
  },
  "Open Source & GitHub": {
    primary: "#06B6D4",
    bg: "rgba(6, 182, 212, 0.2)",
    border: "rgba(6, 182, 212, 0.5)",
    text: "#A5F3FC",
    dot: "#06B6D4",
  },
  "Product & UI/UX": {
    primary: "#EC4899",
    bg: "rgba(236, 72, 153, 0.2)",
    border: "rgba(236, 72, 153, 0.5)",
    text: "#FBCFE8",
    dot: "#EC4899",
  },
  "Data Science & Analytics": {
    primary: "#6366F1",
    bg: "rgba(99, 102, 241, 0.2)",
    border: "rgba(99, 102, 241, 0.5)",
    text: "#C7D2FE",
    dot: "#6366F1",
  },
};

const DEFAULT_THEME: CategoryStyle = {
  primary: "#6366F1",
  bg: "rgba(99, 102, 241, 0.2)",
  border: "rgba(99, 102, 241, 0.5)",
  text: "#E0E7FF",
  dot: "#6366F1",
};

export function getCategoryTheme(name?: string): CategoryStyle {
  if (!name) return DEFAULT_THEME;
  for (const [key, theme] of Object.entries(CATEGORY_THEMES)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      return theme;
    }
  }
  return DEFAULT_THEME;
}
