import type { ContentTemplate } from '../client/src/data/content';
import type { PlannerState } from '../client/src/lib/planner';

export interface BrandKit {
  name: string;
  logo: string;
  headingFont: string;
  bodyFont: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  uppercase: boolean;
  style: 'bold' | 'editorial' | 'minimal';
  radius: number;
  tagline: string;
  voice: string;
  audience: string;
  instagram: string;
  tiktok: string;
  linkedin: string;
}
export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  kind: 'image' | 'video';
  sourceUrl?: string;
  origin?: 'website' | 'upload' | 'url';
}
export interface SourcePage { url: string; title: string; text: string; }
export interface CrawlResult {
  url: string;
  title: string;
  description: string;
  pages: SourcePage[];
  media: MediaAsset[];
  brand: Partial<BrandKit>;
  warnings: string[];
  fetchedAt: string;
}
export interface SiteProject {
  id: string;
  name: string;
  url: string;
  description: string;
  brand: BrandKit;
  media: MediaAsset[];
  sources: SourcePage[];
  templates: ContentTemplate[];
  planner: PlannerState;
  importedAt?: string;
  importWarnings: string[];
  brandEdited?: boolean;
}
export interface StudioState { version: 2; activeProjectId: string; projects: SiteProject[]; }
export interface GenerateInput {
  project: { name: string; url: string; brand: Pick<BrandKit,'tagline'|'voice'|'audience'>; description: string };
  pages: SourcePage[];
  media: MediaAsset[];
  count: number;
  language: 'en' | 'pt';
  goal: string;
  ai?: { baseUrl: string; model: string; apiKey: string };
}
export type GenerationProvider = 'manus' | 'openai-compatible';
export interface GenerationResponse {
  templates: ContentTemplate[];
  provider: GenerationProvider;
  model: string;
  warnings: string[];
}
