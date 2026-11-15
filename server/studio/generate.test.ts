import { afterEach, describe, expect, it, vi } from 'vitest';
import { generationRuntimeConfig, normalizeGenerationBase, STUDIO_MODEL, validatedTemplates } from './generate';
import type { GenerateInput } from '../../shared/studio';

afterEach(() => { vi.unstubAllEnvs(); });

describe('generation provider configuration', () => {
  it('defaults to the Manus built-in provider', () => {
    expect(generationRuntimeConfig({ MANUS_API_URL: 'https://manus.example/', MANUS_API_KEY: 'manus-secret' })).toEqual({
      provider: 'manus', model: STUDIO_MODEL, endpoint: 'https://manus.example/v1/chat/completions', key: 'manus-secret',
    });

    describe('source-grounded alternating generation', () => {
      const input: GenerateInput = {
        project: {
          name: 'Example',
          url: 'https://example.com/',
          description: '',
          brand: { tagline: '', voice: '', audience: '' },
        },
        pages: [{ url: 'https://example.com/', title: 'Example', text: 'A real product detail from the website.' }],
        media: [],
        count: 2,
        language: 'alternating',
        goal: 'Introduce the project',
      };
      const idea = (language: 'en' | 'pt', title: string) => ({
        title,
        headline: title,
        campaign: 'Introduction',
        theme: 'Product',
        language,
        format: 'Image',
        tone: 'mint',
        sourceIndex: 0,
        mediaIndex: -1,
        evidence: 'A real product detail from the website.',
        variants: {
          instagram: { caption: title, hashtags: '#Example', cta: 'Discover more', notes: 'Use a text-only graphic.' },
          tiktok: { caption: title, hashtags: '#Example', cta: 'Discover more', notes: 'Use a text-only graphic.' },
        },
      });

      it('accepts alternating Portuguese and English and records each language', () => {
        const result = validatedTemplates({
          templates: [idea('pt', 'Descubra o produto'), idea('en', 'Discover the product')],
        }, input);

        expect(result.map(template => template.language)).toEqual(['pt', 'en']);
        expect(result[0].sourceEvidence).toBe('A real product detail from the website.');
      });

      it('rejects generated ideas that do not follow the requested language order', () => {
        expect(() => validatedTemplates({
          templates: [idea('en', 'Discover the product'), idea('pt', 'Descubra o produto')],
        }, input)).toThrow('language order');
      });
    });
  });

  it('selects an OpenAI-compatible provider and allows a missing local key', () => {
    expect(generationRuntimeConfig({ LLM_BASE_URL: 'http://127.0.0.1:11434/v1/', LLM_MODEL: 'local-model' })).toEqual({
      provider: 'openai-compatible', model: 'local-model', endpoint: 'http://127.0.0.1:11434/v1/chat/completions', key: undefined,
    });
  });

  it('normalizes base, v1, and completion endpoint URLs without credentials', () => {
    expect(normalizeGenerationBase('https://llm.example')).toBe('https://llm.example/v1/chat/completions');
    expect(normalizeGenerationBase('https://llm.example/v1')).toBe('https://llm.example/v1/chat/completions');
    expect(normalizeGenerationBase('https://llm.example/v1/chat/completions')).toBe('https://llm.example/v1/chat/completions');
    expect(() => normalizeGenerationBase('https://user:secret@llm.example')).toThrow('invalid');
    expect(() => normalizeGenerationBase('ftp://llm.example')).toThrow('invalid');
  });

  it('never includes configured credentials in configuration errors', () => {
    const secret = 'super-secret-token';
    try {
      generationRuntimeConfig({ LLM_BASE_URL: `https://user:${secret}@llm.example` });
      throw new Error('expected configuration to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
