import type { ContentTemplate } from '../data/content';
import type { PlannedPost } from './planner';

export type BusinessType = 'local' | 'saas' | 'ecommerce' | 'dropshipping' | 'services' | 'personal';
export type Goal = 'leads' | 'subscriptions' | 'emails' | 'traffic' | 'engagement';
export type PostLanguage = 'en' | 'pt' | 'both';

export const BUSINESS_TYPES: { id: BusinessType; label: { en: string; pt: string }; hint: { en: string; pt: string } }[] = [
  { id: 'local', label: { en: 'Local business', pt: 'Negócio local' }, hint: { en: 'Store, restaurant, studio with a physical location', pt: 'Loja, restaurante ou estúdio com local físico' } },
  { id: 'saas', label: { en: 'SaaS / app', pt: 'SaaS / aplicação' }, hint: { en: 'Software product or subscription platform', pt: 'Produto de software ou plataforma por subscrição' } },
  { id: 'ecommerce', label: { en: 'Ecommerce', pt: 'Ecommerce' }, hint: { en: 'Online store with its own catalog', pt: 'Loja online com catálogo próprio' } },
  { id: 'dropshipping', label: { en: 'Dropshipping', pt: 'Dropshipping' }, hint: { en: 'Reselling catalog products online', pt: 'Revenda online de produtos de catálogo' } },
  { id: 'services', label: { en: 'Services / agency', pt: 'Serviços / agência' }, hint: { en: 'Freelance, consulting, professional services', pt: 'Freelance, consultoria, serviços profissionais' } },
  { id: 'personal', label: { en: 'Personal brand', pt: 'Marca pessoal' }, hint: { en: 'Creator, expert or community presence', pt: 'Criador, especialista ou presença de comunidade' } },
];

export const GOALS: { id: Goal; label: { en: string; pt: string } }[] = [
  { id: 'leads', label: { en: 'Get leads', pt: 'Gerar contactos' } },
  { id: 'subscriptions', label: { en: 'Sell subscriptions', pt: 'Vender subscrições' } },
  { id: 'emails', label: { en: 'Collect emails', pt: 'Captar emails' } },
  { id: 'traffic', label: { en: 'Website traffic', pt: 'Tráfego para o site' } },
  { id: 'engagement', label: { en: 'Social engagement', pt: 'Interação nas redes' } },
];

/** Content pillars per niche — used to steer generation and the weekly plan. */
export const NICHE_PILLARS: Record<BusinessType, string[]> = {
  local: ['Behind the counter', 'Menu / service spotlight', 'Customer moments', 'Location & hours reminder', 'Team story', 'Weekend offer'],
  saas: ['Feature spotlight', 'Use-case walkthrough', 'Tip & workflow', 'Changelog / what is new', 'Founder note', 'Customer outcome'],
  ecommerce: ['Product spotlight', 'Collection / drop', 'Styling & use', 'Reviews & social proof', 'Behind the brand', 'Offer & bundle'],
  dropshipping: ['Trending product', 'Problem → product fit', 'Unboxing feel', 'Comparison & why us', 'UGC-style demo', 'Limited bundle'],
  services: ['Expertise proof', 'Process breakdown', 'Client result', 'FAQ answered', 'Tool we use', 'Booking reminder'],
  personal: ['Opinion / hot take', 'Story & journey', 'Lesson learned', 'Day in the life', 'Quick tips', 'Community question'],
};

/** Default weekly cadence mixes per niche: [Image, Carousel, Video] counts per week. */
export const NICHE_CADENCE: Record<BusinessType, { image: number; carousel: number; video: number; postsPerWeek: number }> = {
  local: { image: 3, carousel: 1, video: 1, postsPerWeek: 5 },
  saas: { image: 2, carousel: 2, video: 1, postsPerWeek: 5 },
  ecommerce: { image: 2, carousel: 2, video: 1, postsPerWeek: 5 },
  dropshipping: { image: 2, carousel: 1, video: 2, postsPerWeek: 5 },
  services: { image: 2, carousel: 2, video: 1, postsPerWeek: 5 },
  personal: { image: 2, carousel: 1, video: 2, postsPerWeek: 5 },
};

/** Goal → CTA emphasis appended to the generation goal text. */
export const GOAL_HINTS: Record<Goal, string> = {
  leads: 'Drive qualified inquiries; CTAs invite contact or booking.',
  subscriptions: 'Emphasize the subscription value; CTAs invite signup or trial.',
  emails: 'Encourage newsletter/community signup; CTAs invite joining the list.',
  traffic: 'Send readers to the website; CTAs invite visiting key pages.',
  engagement: 'Spark comments, saves and shares; CTAs invite opinions and interaction.',
};

/** Build the generation goal string from niche + goals. */
export function buildGoalText(business: BusinessType, goals: Goal[], custom: string): string {
  const hints = goals.map(g => GOAL_HINTS[g]).join(' ');
  return `${custom.trim()} Business type: ${business}. ${hints}`.trim();
}

export interface PlanConfig {
  weeks: number;
  postsPerWeek: number;
  startDate: string; // YYYY-MM-DD
  time: string; // HH:mm
}

/** Spread planned posts evenly Mon–Sat across weeks, alternating platforms. */
export function buildCalendarQueue(templates: ContentTemplate[], config: PlanConfig): Omit<PlannedPost, 'id'>[] {
  const days: Omit<PlannedPost, 'id'>[] = [];
  const start = new Date(`${config.startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return days;
  // Weekday slots: Tue, Thu, Sat, Mon, Wed, Fri (keeps a natural rhythm)
  const slotOrder = [2, 4, 6, 1, 3, 5];
  const perWeek = Math.max(1, Math.min(6, config.postsPerWeek));
  let cursor = 0;
  for (const template of templates) {
    const week = Math.floor(cursor / perWeek);
    const slot = slotOrder[cursor % perWeek];
    const day = new Date(start);
    day.setDate(day.getDate() + week * 7 + ((slot - ((start.getDay() || 7))) + 7) % 7);
    days.push({
      templateId: template.id,
      platform: cursor % 3 === 2 ? 'tiktok' : 'instagram',
      date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
      time: config.time,
      status: 'scheduled',
    });
    cursor++;
  }
  return days;
}

/** Pick a sensible cadence for a niche + a goal text. */
export function goalLabel(goal: Goal, lang: 'en' | 'pt'): string {
  return GOALS.find(g => g.id === goal)?.label[lang] ?? goal;
}
