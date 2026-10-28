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
  articleUrl?: string;
  publishedTime?: string;
  fetchedAt?: string;
  technicalImpact?: string;
  developerImpact?: string;
  enterpriseImpact?: string;
  imageUrl?: string;
  bookmarked?: boolean;
};

export type Category = { id?: number | string; name: string };
