import { describe, expect, it } from 'vitest';
import { socialCampaigns } from '../data/socialCampaigns';
import { alternateLanguageTemplates, buildCalendarQueue } from './onboarding';

describe('bilingual campaign planning', () => {
  it('alternates available English and Portuguese templates without dropping an extra draft', () => {
    const campaigns = socialCampaigns.goldencreative;
    const english = campaigns.filter(template => template.language === 'en');
    const portuguese = campaigns.filter(template => template.language === 'pt');
    const result = alternateLanguageTemplates(english, portuguese);

    expect(result.languages).toEqual(['en', 'pt', 'en', 'pt', 'en', 'pt', 'en', 'pt']);
    expect(result.templates).toHaveLength(english.length + portuguese.length);
  });

  it('writes the language into each calendar entry', () => {
    const campaigns = socialCampaigns.swiftcal;
    const english = campaigns.filter(template => template.language === 'en');
    const portuguese = campaigns.filter(template => template.language === 'pt');
    const alternating = alternateLanguageTemplates(english, portuguese);
    const planned = buildCalendarQueue(alternating.templates, {
      weeks: 2,
      postsPerWeek: 4,
      startDate: '2026-11-16',
      time: '18:00',
    }, alternating.languages);

    expect(planned.map(post => post.language)).toEqual(alternating.languages);
    expect(planned.every(post => post.platform === 'instagram' || post.platform === 'tiktok')).toBe(true);
  });

  it('rejects invalid campaign start dates rather than returning an empty schedule', () => {
    expect(() => buildCalendarQueue([], {
      weeks: 1,
      postsPerWeek: 1,
      startDate: 'not-a-date',
      time: '18:00',
    })).toThrow('Choose a valid start date.');
  });
});
