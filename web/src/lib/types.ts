export type Pulse = {
  id: string;
  eventId?: string;
  title?: string;
  headline?: string;
  summary?: string;
  contentSummary?: string;
  category?: string;
  categoryName?: string;
  technology?: string;
  technologies?: string[];
  sourceName?: string;
  sourceUrl?: string;
  originalSourceUrl?: string;
  articleUrl?: string;
  publishedTime?: string;
  fetchedAt?: string;
  thumbnailUrl?: string;
  technicalImpact?: string;
  developerImpact?: string;
  enterpriseImpact?: string;
  importanceScore?: number;
  credibilityScore?: number;
  bookmarked?: boolean;
};

export type Category = { id?: number | string; name: string };

