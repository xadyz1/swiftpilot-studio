export type AISettings = { baseUrl: string; model: string; apiKey: string };
const KEY = 'swiftpilot-ai-settings-v1';
const defaults: AISettings = { baseUrl: '', model: '', apiKey: '' };
export function loadAISettings(): AISettings {
  if (typeof window === 'undefined') return defaults;
  try { const raw = localStorage.getItem(KEY); if (!raw) return defaults; const parsed = JSON.parse(raw) as Partial<AISettings>; return { baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '', model: typeof parsed.model === 'string' ? parsed.model : '', apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '' }; } catch { return defaults; }
}
export function saveAISettings(value: AISettings): boolean {
  if (typeof window === 'undefined') return false;
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}
export function clearAISettings(): void { if (typeof window !== 'undefined') localStorage.removeItem(KEY); }
