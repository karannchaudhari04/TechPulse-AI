import { apiSlice } from '../../../api/apiSlice';

export interface GraphNodeData {
  id: string;
  label: string;
  type: 'technology' | 'company' | 'language' | 'cve' | 'cloud' | 'library';
  details?: string;
}

export interface GraphEdgeData {
  source: string;
  target: string;
  relation: string;
}

export interface KnowledgeGraphResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface TechDetails {
  id: string;
  name: string;
  overview: string;
  latestVersion: string;
  trendingScore: number;
  breakingChanges: string[];
  companiesUsing: string[];
  relatedTechIds: string[];
}

export interface CompanyDetails {
  id: string;
  name: string;
  announcements: string[];
  releases: string[];
  aiSummary: string;
  blogCount: number;
}

export interface ComparisonResponse {
  features: string[];
  ratings: Record<string, string[]>; // keyed by techId, values match features length
  summary: string;
}

export interface TimelineEvent {
  id: string;
  version: string;
  date: string;
  headline: string;
  description: string;
}

export interface ReleaseDetails {
  id: string;
  version: string;
  notes: string;
  migrationGuide?: string;
  compatibility: string;
}

export interface CveDetails {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  affectedVersions: string[];
  mitigation: string;
  aiExplanation: string;
}

export interface TechBrief {
  id: string;
  title: string;
  content: string;
  generatedAt: string;
}

/**
 * Purpose: RTK Query endpoints for knowledge graphs, technology details,
 * company records, version timelines, CVE metrics, and tech brief generators.
 */
export const intelligenceApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getKnowledgeGraph: builder.query<KnowledgeGraphResponse, void>({
      query: () => ({
        url: '/intelligence/graph',
        method: 'GET',
      }),
      providesTags: ['Graph'],
    }),
    getTechnologyDetails: builder.query<TechDetails, string>({
      query: (id) => ({
        url: `/intelligence/technology/${id}`,
        method: 'GET',
      }),
      providesTags: ['Intelligence'],
    }),
    getCompanyDetails: builder.query<CompanyDetails, string>({
      query: (id) => ({
        url: `/intelligence/company/${id}`,
        method: 'GET',
      }),
      providesTags: ['Intelligence'],
    }),
    compareTechnologies: builder.mutation<ComparisonResponse, { techIds: string[] }>({
      query: (payload) => ({
        url: '/intelligence/compare',
        method: 'POST',
        data: payload,
      }),
    }),
    getTimeline: builder.query<TimelineEvent[], string>({
      query: (id) => ({
        url: `/intelligence/timeline/${id}`,
        method: 'GET',
      }),
      providesTags: ['Intelligence'],
    }),
    getReleaseDetails: builder.query<ReleaseDetails, string>({
      query: (id) => ({
        url: `/intelligence/release/${id}`,
        method: 'GET',
      }),
      providesTags: ['Intelligence'],
    }),
    getCveDetails: builder.query<CveDetails, string>({
      query: (id) => ({
        url: `/intelligence/cve/${id}`,
        method: 'GET',
      }),
      providesTags: ['Intelligence'],
    }),
    generateTechBrief: builder.mutation<TechBrief, { topic: string; format: 'markdown' | 'pdf' }>({
      query: (payload) => ({
        url: '/intelligence/brief',
        method: 'POST',
        data: payload,
      }),
    }),
  }),
});

export const {
  useGetKnowledgeGraphQuery,
  useGetTechnologyDetailsQuery,
  useGetCompanyDetailsQuery,
  useCompareTechnologiesMutation,
  useGetTimelineQuery,
  useGetReleaseDetailsQuery,
  useGetCveDetailsQuery,
  useGenerateTechBriefMutation,
} = intelligenceApiSlice;
