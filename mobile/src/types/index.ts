export interface Bite {
  id: number;
  title: string;
  contentSummary: string;     // Note: contentSummary, not summary
  originalSourceUrl: string;
  authorAttribution?: string;
  thumbnailUrl?: string;
  categoryName: string;       // from DTO
  publishedAt?: string;
}

export type CategoryColorMap = {
  [key: string]: string;
};
