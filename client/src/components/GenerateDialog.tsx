import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { SiteProject } from '@shared/studio';
import type { ContentTemplate } from '@/data/content';
import { loadAISettings } from '../lib/aiSettings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GenerationPlan {
  addToCalendar: boolean;
  startDate: string;
  daysBetween: number;
  time: string;
}

interface GenerateDialogProps {
  project: SiteProject;
  onClose: () => void;
  onGenerated: (templates: ContentTemplate[], plan: GenerationPlan) => void;
}

interface GeneratedResponse {
  templates: ContentTemplate[];
  provider: 'manus' | 'openai-compatible';
  model: string;
  warnings: string[];
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTemplate(value: unknown): value is ContentTemplate {
  if (!object(value)) return false;
  if (!['id', 'title', 'headline', 'campaign', 'theme', 'image'].every(key => typeof value[key] === 'string')) return false;
  if (!(value.id as string).trim() || !(value.title as string).trim()) return false;
  if (!['Image', 'Carousel', 'Video'].includes(String(value.format))) return false;
  if (!['mint', 'lavender', 'peach', 'yellow'].includes(String(value.tone))) return false;
  if (!Array.isArray(value.platforms) || !value.platforms.length
    || !value.platforms.every(platform => platform === 'instagram' || platform === 'tiktok')) return false;
  if (!object(value.variants)) return false;
  const variants = value.variants;
  return ['instagram', 'tiktok'].every(platform => {
    const variant = variants[platform];
    return object(variant) && ['caption', 'hashtags', 'cta', 'notes'].every(key => typeof variant[key] === 'string');
  });
}

function isGeneratedResponse(value: unknown): value is GeneratedResponse {
  if (!object(value) || (value.provider !== 'manus' && value.provider !== 'openai-compatible') || typeof value.model !== 'string'
    || !Array.isArray(value.warnings) || !value.warnings.every(warning => typeof warning === 'string')
    || !Array.isArray(value.templates) || !value.templates.length || !value.templates.every(isTemplate)) return false;
  const ids = value.templates.map(template => template.id);
  return new Set(ids).size === ids.length;
}

function responseMessage(body: unknown, raw: string): string {
  if (object(body)) {
    if (typeof body.error === 'string') return body.error.slice(0, 600);
    if (object(body.error) && typeof body.error.message === 'string') return body.error.message.slice(0, 600);
    if (typeof body.message === 'string') return body.message.slice(0, 600);
  }
  return raw.trim().slice(0, 400) || 'The server returned no error details.';
}

export default function GenerateDialog({ project, onClose, onGenerated }: GenerateDialogProps) {
  const id = useId();
  const [goal, setGoal] = useState('Promote website');
  const [count, setCount] = useState(4);
  const [language, setLanguage] = useState<'en' | 'pt'>('en');
  const [startDate, setStartDate] = useState(today);
  const [time, setTime] = useState('18:00');
  const [daysBetween, setDaysBetween] = useState(3);
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState<GeneratedResponse | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const sourceCharacters = project.sources.reduce((total, page) => total + page.text.trim().length, 0);
  const canGenerate = sourceCharacters >= 100;

  useEffect(() => {
    requestRef.current?.abort('project-change');
    requestRef.current = null;
    setGoal('Promote website');
    setCount(4);
    setLanguage('en');
    setStartDate(today());
    setTime('18:00');
    setDaysBetween(3);
    setAddToCalendar(true);
    setBusy(false);
    setElapsed(0);
    setError('');
    setReady(null);
    return () => {
      requestRef.current?.abort('unmounted');
      requestRef.current = null;
    };
  }, [project.id]);

  function closeDialog() {
    requestRef.current?.abort('closed');
    requestRef.current = null;
    onClose();
  }

  function plan(): GenerationPlan {
    const date = new Date(`${startDate}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(date.getTime())
      || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== startDate) {
      throw new Error('Choose a valid start date.');
    }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid publishing time.');
    if (!Number.isInteger(daysBetween) || daysBetween < 1 || daysBetween > 14) {
      throw new Error('Cadence must be between 1 and 14 days.');
    }
    return { addToCalendar, startDate, daysBetween, time };
  }

  async function generate() {
    if (requestRef.current) return;
    setError('');
    setReady(null);
    try {
      if (!canGenerate) throw new Error('Import at least 100 characters of website source text first.');
      if (!goal.trim()) throw new Error('Enter a goal for these drafts.');
      if (![4, 8, 12].includes(count)) throw new Error('Choose 4, 8, or 12 drafts.');
      plan();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check your generation settings.');
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setElapsed(0);
    const startedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      if (requestRef.current === controller) setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    const deadline = window.setTimeout(() => controller.abort('timeout'), 120_000);
    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ai: loadAISettings(),
          project: {
            name: project.name,
            url: project.url,
            description: project.description,
            brand: {
              tagline: project.brand.tagline,
              voice: project.brand.voice,
              audience: project.brand.audience,
            },
          },
          pages: project.sources,
          media: project.media,
          count,
          language,
          goal: goal.trim(),
        }),
      });
      const raw = await response.text();
      let result: unknown;
      try { result = JSON.parse(raw); } catch { result = null; }
      if (!response.ok) {
        throw new Error(`Generation failed (HTTP ${response.status}): ${responseMessage(result, raw)}`);
      }
      if (!isGeneratedResponse(result)) {
        throw new Error('The AI returned an empty or invalid draft response. No drafts were added. Please try again; there is no placeholder fallback.');
      }
      if (requestRef.current !== controller || controller.signal.aborted) return;
      // Keep the model and warnings visible before the user accepts drafts.
      // Receiving an AI response is not the same as saving or scheduling it.
      setReady(result);
    } catch (cause) {
      if (requestRef.current !== controller) return;
      if (controller.signal.aborted) {
        setError(controller.signal.reason === 'timeout'
          ? 'Generation timed out after 120 seconds. No drafts were added. Try fewer drafts or check the studio server. The submitted AI request may still have consumed project credits.'
          : 'Generation canceled. No drafts were added. A request already sent to the AI provider may still consume project credits.');
      } else {
        setError(cause instanceof Error
          ? `${cause.message}${cause instanceof TypeError ? ' Check your connection and that the studio server is running.' : ''}`
          : 'Generation failed. No drafts were added. Please try again.');
      }
    } finally {
      window.clearInterval(progressTimer);
      window.clearTimeout(deadline);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  function acceptDrafts() {
    if (!ready) return;
    setError('');
    try {
      onGenerated(ready.templates, plan());
      // If the parent leaves the dialog open, do not allow the same batch
      // to be accepted again accidentally.
      setReady(null);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add these drafts to the project. Please try again.');
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (ready) acceptDrafts();
    else void generate();
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) closeDialog(); }}>
      <DialogContent className="generate-dialog" showCloseButton={false}>
        <div className="generate-dialog-heading">
          <DialogHeader>
            <span className="eyebrow">FROM YOUR WEBSITE, FOR YOUR BRAND</span>
            <DialogTitle>Generate content drafts</DialogTitle>
            <DialogDescription>Turn verified sources for {project.name} into ideas you can review, edit, and publish yourself.</DialogDescription>
          </DialogHeader>
          <button type="button" className="icon-button" aria-label="Close generation dialog" onClick={closeDialog}><X size={20} aria-hidden="true" /></button>
        </div>
        <p className="generation-notice">AI generation uses this project's credits. Review every caption and claim before publishing. Calendar entries are plans only; publishing is manual.</p>
        {!canGenerate && (
          <p className="form-warning" role="status">
            Add at least 100 characters of readable website source text to generate grounded drafts. <a className="text-button" href="#website-import" onClick={closeDialog}>Import website first</a>.
          </p>
        )}
        <form className="generate-form" onSubmit={submit} noValidate>
          <fieldset className="setting-grid" disabled={busy}>
            <label className="field-label setting-full" htmlFor={`${id}-goal`}>
              What is your goal?
              <textarea id={`${id}-goal`} rows={2} maxLength={500} value={goal} onChange={event => { setGoal(event.target.value); setReady(null); setError(''); }} placeholder="Promote website" />
            </label>
            <label className="field-label" htmlFor={`${id}-count`}>
              Number of drafts
              <select id={`${id}-count`} value={count} onChange={event => { setCount(Number(event.target.value)); setReady(null); setError(''); }}>
                {[4, 8, 12].map(value => <option key={value} value={value}>{value} drafts</option>)}
              </select>
            </label>
            <label className="field-label" htmlFor={`${id}-language`}>
              Language
              <select id={`${id}-language`} value={language} onChange={event => { setLanguage(event.target.value as 'en' | 'pt'); setReady(null); setError(''); }}>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </label>
            <label className="checkbox-field setting-full">
              <input type="checkbox" checked={addToCalendar} onChange={event => setAddToCalendar(event.target.checked)} />
              Add these drafts to my calendar
            </label>
            <label className="field-label" htmlFor={`${id}-date`}>
              Start date
              <input id={`${id}-date`} type="date" value={startDate} disabled={!addToCalendar} onChange={event => setStartDate(event.target.value)} />
            </label>
            <label className="field-label" htmlFor={`${id}-time`}>
              Time (your local time)
              <input id={`${id}-time`} type="time" value={time} disabled={!addToCalendar} onChange={event => setTime(event.target.value)} />
            </label>
            <label className="field-label setting-full" htmlFor={`${id}-cadence`}>
              Cadence · one draft every {daysBetween} {daysBetween === 1 ? 'day' : 'days'}
              <input id={`${id}-cadence`} type="number" min={1} max={14} step={1} value={daysBetween} disabled={!addToCalendar} onChange={event => setDaysBetween(Number(event.target.value))} />
            </label>
          </fieldset>
          {busy && (
            <div className="request-progress" role="status" aria-live="polite">
              <progress aria-label="AI generation in progress" />
              <p>{elapsed < 30 ? 'Generating from your saved sources and brand voice…' : 'Still waiting for the AI provider. This can take up to two minutes.'} <span>{elapsed}s elapsed</span></p>
              <button type="button" className="text-button" onClick={() => requestRef.current?.abort('canceled')}>Cancel request</button>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {ready && (
            <div className="generated-result" role="status">
              <h3>{ready.templates.length} drafts ready to review</h3>
              <p className="helper-text">Provider: {ready.provider === 'openai-compatible' ? 'OpenAI-compatible' : 'Manus built-in'} · Model: {ready.model || 'Not reported'}. Nothing has been saved or scheduled yet.</p>
              {ready.warnings.length > 0 && <div className="generation-warnings"><h4>Generation notes</h4><ul>{ready.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul></div>}
              <ol className="generated-draft-list">{ready.templates.map(template => <li key={template.id}><strong>{template.title}</strong><span>{template.format} · {template.platforms.join(' / ')}</span></li>)}</ol>
              <p className="helper-text">Accept these drafts below, then review and edit the full copy in your project before publishing.</p>
            </div>
          )}
          <div className="settings-actions generate-dialog-footer">
            <button type="button" className="button secondary" onClick={closeDialog}>{busy ? 'Close & stop waiting' : 'Close'}</button>
            {ready && <button type="button" className="text-button" onClick={() => void generate()} disabled={!canGenerate}>Generate again (uses credits)</button>}
            <button className="button primary" type="submit" disabled={busy || (!ready && (!canGenerate || !goal.trim()))}>
              <Sparkles size={16} aria-hidden="true" />
              {busy ? 'Generating…' : ready ? addToCalendar ? 'Add drafts to calendar' : 'Save drafts to project' : `Generate ${count} drafts`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
