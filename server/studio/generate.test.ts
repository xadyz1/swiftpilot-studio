import { afterEach, describe, expect, it, vi } from 'vitest';
import { generationRuntimeConfig, normalizeGenerationBase, STUDIO_MODEL } from './generate';

afterEach(() => { vi.unstubAllEnvs(); });

describe('generation provider configuration', () => {
  it('defaults to the Manus built-in provider', () => {
    expect(generationRuntimeConfig({ MANUS_API_URL: 'https://manus.example/', MANUS_API_KEY: 'manus-secret' })).toEqual({
      provider: 'manus', model: STUDIO_MODEL, endpoint: 'https://manus.example/v1/chat/completions', key: 'manus-secret',
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
