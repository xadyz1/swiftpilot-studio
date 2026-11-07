import { useMemo, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Globe, ImagePlus, Loader2, Mail, Sparkles, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import type { CrawlResult, MediaAsset, SiteProject } from '@shared/studio';
import type { ContentTemplate } from '../data/content';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { createProject, applyWebsiteImport } from '../lib/studio';
import { uploadMedia, mediaProxyURL, useMediaSource } from '../lib/media';
import { FONT_CHOICES, safeFont } from '../lib/brand';
import { loadAISettings } from '../lib/aiSettings';
import { buildCSV } from '../lib/planner';
import { renderStudioCanvas } from '../lib/studio-canvas';
import { BUSINESS_TYPES, GOALS, NICHE_PILLARS, buildGoalText, buildCalendarQueue, type BusinessType, type Goal, type PostLanguage } from '../lib/onboarding';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: SiteProject) => void;
}

const STEPS = ['Website', 'Media & logos', 'Brand', 'Business type', 'Goals & plan', 'Review & generate'];
const blank = { name: '', url: '', extraText: '' };

function LogoThumb({ source }: { source: string }) {
  const resolved = useMediaSource(source);
  if (!resolved) return null;
  return <img className="ob-logo-thumb" src={mediaProxyURL(resolved)} alt="" />;
}

export default function OnboardingWizard({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [site, setSite] = useState(blank);
  const [crawl, setCrawl] = useState<CrawlResult | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [logos, setLogos] = useState<{ dark?: string; light?: string; compact?: string }>({});
  const [brand, setBrand] = useState({ headingFont: '', bodyFont: '', primary: '#1d84f5', secondary: '#ff7300', instagram: '', tiktok: '', linkedin: '' });
  const [business, setBusiness] = useState<BusinessType>('ecommerce');
  const [goals, setGoals] = useState<Goal[]>(['traffic', 'engagement']);
  const [language, setLanguage] = useState<PostLanguage>('en');
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [weeks, setWeeks] = useState(2);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [postTime, setPostTime] = useState('18:00');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [done, setDone] = useState<{ zipName: string; queued: number } | null>(null);

  const draft: SiteProject | null = useMemo(() => {
    if (!site.url.trim()) return null;
    try { return createProject(site.name, site.url); } catch { return null; }
  }, [site.name, site.url]);

  async function runCrawl() {
    setError(''); setBusy('crawl');
    try {
      const res = await fetch('/api/studio/crawl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: site.url, maxPages: 3 }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Import failed (HTTP ${res.status})`);
      setCrawl(body as CrawlResult);
      const b = (body as CrawlResult).brand;
      setBrand(prev => ({
        ...prev,
        headingFont: b.headingFont || prev.headingFont,
        bodyFont: b.bodyFont || prev.bodyFont,
        primary: b.primary || prev.primary,
        secondary: b.secondary || prev.secondary,
        instagram: b.instagram || prev.instagram,
        tiktok: b.tiktok || prev.tiktok,
      }));
      if (!site.name.trim() && (body as CrawlResult).title) setSite(s => ({ ...s, name: (body as CrawlResult).title.split(/[|–—-]/)[0].trim().slice(0, 60) }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Crawl failed.'); }
    finally { setBusy(''); }
  }

  async function upload(e: ChangeEvent<HTMLInputElement>, target: 'media' | keyof typeof logos) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const asset = await uploadMedia(file);
      if (target === 'media') setMedia(m => [...m, asset]);
      else setLogos(l => ({ ...l, [target]: asset.url }));
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
  }

  async function finish() {
    if (!draft) return;
    setError(''); setBusy('generate');
    try {
      let project = draft;
      if (crawl) project = applyWebsiteImport(project, crawl, false);
      const sources = [...project.sources];
      if (site.extraText.trim().length >= 100) sources.push({ url: project.url, title: 'Owner notes', text: site.extraText.trim().slice(0, 12000) });
      project = { ...project, sources, media: [...project.media, ...media] };
      project.brand = { ...project.brand, name: site.name.trim() || project.brand.name, headingFont: safeFont(brand.headingFont || project.brand.headingFont), bodyFont: safeFont(brand.bodyFont || project.brand.bodyFont), primary: brand.primary, secondary: brand.secondary, instagram: brand.instagram, tiktok: brand.tiktok, linkedin: brand.linkedin, logo: logos.dark ?? logos.light ?? logos.compact ?? project.brand.logo };

      const lang = language === 'both' ? 'en' : language;
      const goal = buildGoalText(business, goals, `Onboarding plan for ${project.name}.`);
      const count = Math.min(12, Math.max(4, weeks * postsPerWeek));
      const res = await fetch('/api/studio/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai: loadAISettings(), project: { name: project.name, url: project.url, description: project.description, brand: { tagline: project.brand.tagline, voice: project.brand.voice, audience: project.brand.audience } }, pages: sources, media: project.media, count, language: lang, goal }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Generation failed (HTTP ${res.status})`);
      const templates = body.templates as ContentTemplate[];
      if (language === 'both') {
        const res2 = await fetch('/api/studio/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ai: loadAISettings(), project: { name: project.name, url: project.url, description: project.description, brand: { tagline: project.brand.tagline, voice: project.brand.voice, audience: project.brand.audience } }, pages: sources, media: project.media, count: Math.min(12, Math.ceil(count / 2)), language: 'pt', goal }) });
        if (res2.ok) { const b2 = await res2.json(); templates.push(...(b2.templates as ContentTemplate[])); }
      }
      const planned = buildCalendarQueue(templates, { weeks, postsPerWeek, startDate, time: postTime });
      project = { ...project, templates: [...project.templates, ...templates], planner: { ...project.planner, posts: [...project.planner.posts, ...planned.map(p => ({ ...p, id: crypto.randomUUID() }))] } };

      // ZIP: schedule CSV + summary + a PNG per queued template (first 12)
      setBusy('zip');
      const zip = new JSZip();
      zip.file('calendar-schedule.csv', buildCSV(planned as never, templates));
      zip.file('plan-summary.txt', `${project.name} — ${planned.length} queued posts, ${weeks} weeks @ ${postsPerWeek}/wk, ${business}, goals: ${goals.join(', ')}, lang: ${language}`);
      const used = new Set(planned.map(p => p.templateId));
      for (const t of templates.filter(t => used.has(t.id)).slice(0, 12)) {
        try {
          const canvas = document.createElement('canvas');
          await renderStudioCanvas(canvas, t, { brand: project.brand, website: project.url, format: t.aspectRatio ?? 'square', layout: t.layout, scale: 1 });
          const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
          if (blob) zip.file(`posts/${t.title.replace(/[^\w\d]+/g, '-').slice(0, 40)}.png`, blob);
        } catch { /* skip render failures */ }
      }
      const out = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(out);
      a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-plan.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);

      if (notifyEmail.trim()) {
        fetch('/api/studio/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: notifyEmail.trim(), subject: `Your ${project.name} plan is ready`, text: `${planned.length} posts are queued in your calendar. Your ZIP download has started.` }) }).catch(() => {});
      }
      setDone({ zipName: a.download, queued: planned.length });
      onCreated(project);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not complete onboarding.'); }
    finally { setBusy(''); }
  }

  const canNext = [
    () => !!draft && site.url.trim().length > 3,
    () => true, () => true,
    () => !!business,
    () => goals.length > 0,
    () => true,
  ][step]();
  const pillars = NICHE_PILLARS[business];

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose(); }}>
      <DialogContent className="onboarding-dialog" showCloseButton={false}>
        <div className="ob-head">
          <div><span className="eyebrow">NEW PROJECT · STEP {step + 1} OF {STEPS.length}</span>
          <DialogTitle>{STEPS[step]}</DialogTitle></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ob-progress">{STEPS.map((s, i) => <span key={s} className={i <= step ? 'done' : ''} />)}</div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {busy && <p className="helper-text ob-busy"><Loader2 size={14} className="spin" /> {busy === 'crawl' ? 'Crawling website…' : busy === 'generate' ? 'Generating posts…' : 'Building your ZIP…'}</p>}

        {step === 0 && (
          <div className="ob-step">
            <label className="field-label">Project name<input value={site.name} onChange={e => setSite({ ...site, name: e.target.value })} placeholder="My brand" /></label>
            <label className="field-label">Website URL *<input required value={site.url} onChange={e => setSite({ ...site, url: e.target.value })} placeholder="https://yourwebsite.com" /></label>
            <div className="ob-row"><button type="button" className="button secondary" onClick={runCrawl} disabled={!draft || !!busy}><Globe size={15} /> {crawl ? 'Re-crawl' : 'Crawl website'}</button>
              {crawl && <span className="form-success ob-crawl-ok"><Check size={13} /> {crawl.pages.length} pages · {crawl.media.length} media</span>}</div>
            <label className="field-label">Extra content for posts (optional)<textarea rows={4} value={site.extraText} onChange={e => setSite({ ...site, extraText: e.target.value })} placeholder="Paste offers, about text, product details — anything the AI should use." /></label>
          </div>
        )}

        {step === 1 && (
          <div className="ob-step">
            <div className="ob-upload-row">
              <label className="button secondary upload-button" htmlFor="ob-media"><ImagePlus size={15} /> Add media</label>
              <input id="ob-media" type="file" className="file-input" multiple accept="image/*,video/mp4,video/webm,video/quicktime" onChange={e => upload(e, 'media')} />
              <span className="helper-text">{media.length} added</span>
            </div>
            <div className="ob-media-grid">{media.map(m => <div key={m.id} className="ob-media-item"><span>{m.name.slice(0, 26)}</span><button onClick={() => setMedia(media.filter(x => x.id !== m.id))} aria-label="Remove"><Trash2 size={13} /></button></div>)}</div>
            <span className="eyebrow" style={{ marginTop: 8 }}>LOGO VARIANTS</span>
            <div className="ob-logo-row">
              {(['dark', 'light', 'compact'] as const).map(v => (
                <label key={v} className="ob-logo-slot" htmlFor={`ob-logo-${v}`}>
                  {logos[v] ? <LogoThumb source={logos[v]!} /> : <Upload size={16} />}
                  <span>{v} logo</span>
                  <input id={`ob-logo-${v}`} type="file" className="file-input" accept="image/*" onChange={e => upload(e, v)} />
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step">
            <div className="ob-2col">
              <label className="field-label">Heading font<select value={brand.headingFont} onChange={e => setBrand({ ...brand, headingFont: e.target.value })}><option value="">Crawl / default</option>{FONT_CHOICES.map(f => <option key={f}>{f}</option>)}</select></label>
              <label className="field-label">Body font<select value={brand.bodyFont} onChange={e => setBrand({ ...brand, bodyFont: e.target.value })}><option value="">Crawl / default</option>{FONT_CHOICES.map(f => <option key={f}>{f}</option>)}</select></label>
              <label className="field-label">Primary<input type="color" value={brand.primary} onChange={e => setBrand({ ...brand, primary: e.target.value })} /></label>
              <label className="field-label">Secondary<input type="color" value={brand.secondary} onChange={e => setBrand({ ...brand, secondary: e.target.value })} /></label>
            </div>
            <label className="field-label">Instagram URL<input value={brand.instagram} onChange={e => setBrand({ ...brand, instagram: e.target.value })} placeholder="https://instagram.com/…" /></label>
            <label className="field-label">TikTok URL<input value={brand.tiktok} onChange={e => setBrand({ ...brand, tiktok: e.target.value })} placeholder="https://tiktok.com/@…" /></label>
            <label className="field-label">LinkedIn URL<input value={brand.linkedin} onChange={e => setBrand({ ...brand, linkedin: e.target.value })} placeholder="https://linkedin.com/company/…" /></label>
          </div>
        )}

        {step === 3 && (
          <div className="ob-step ob-biz-grid">
            {BUSINESS_TYPES.map(t => (
              <button key={t.id} type="button" className={`ob-biz-card ${business === t.id ? 'active' : ''}`} onClick={() => setBusiness(t.id)}>
                <strong>{t.label.en}</strong><span>{t.hint.en}</span>
              </button>
            ))}
            <p className="helper-text setting-full">Content pillars: {pillars.join(' · ')}</p>
          </div>
        )}

        {step === 4 && (
          <div className="ob-step">
            <span className="field-label">Main goals</span>
            <div className="ob-goal-row">{GOALS.map(g => <button key={g.id} type="button" className={`filter-button ${goals.includes(g.id) ? 'selected' : ''}`} onClick={() => setGoals(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}>{g.label.en}</button>)}</div>
            <div className="ob-2col">
              <label className="field-label">Language<select value={language} onChange={e => setLanguage(e.target.value as PostLanguage)}><option value="en">English</option><option value="pt">Português</option><option value="both">Both (alternate)</option></select></label>
              <label className="field-label">Posts / week<input type="number" min={1} max={6} value={postsPerWeek} onChange={e => setPostsPerWeek(Number(e.target.value))} /></label>
              <label className="field-label">Weeks<select value={weeks} onChange={e => setWeeks(Number(e.target.value))}><option value={1}>1 week</option><option value={2}>2 weeks</option><option value={3}>3 weeks</option></select></label>
              <label className="field-label">Start date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
              <label className="field-label">Time<input type="time" value={postTime} onChange={e => setPostTime(e.target.value)} /></label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="ob-step">
            {done ? (
              <div className="form-success"><Check size={16} /> {done.queued} posts queued · {done.zipName} downloaded{notifyEmail ? ` · email sent to ${notifyEmail}` : ''}. Open the project to review each draft.</div>
            ) : (
              <>
                <ul className="ob-review">
                  <li><strong>{site.name || 'Untitled'}</strong> · {site.url}</li>
                  <li>{crawl ? `${crawl.pages.length} crawled pages` : 'No crawl yet'} · {media.length} extra media · {site.extraText.trim() ? 'extra notes included' : 'no extra notes'}</li>
                  <li>Business: {business} · pillars: {pillars.slice(0, 3).join(', ')}…</li>
                  <li>Plan: {weeks}wk × {postsPerWeek}/wk from {startDate} @ {postTime} · {language} · goals: {goals.join(', ')}</li>
                </ul>
                <label className="field-label">Notify me by email (optional)<span className="secret-input"><Mail size={14} /><input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="you@email.com" /></span></label>
              </>
            )}
          </div>
        )}

        <div className="ob-foot">
          {step > 0 && !done && <button className="button secondary" onClick={() => setStep(step - 1)} disabled={!!busy}><ArrowLeft size={15} /> Back</button>}
          <div style={{ flex: 1 }} />
          {done ? <button className="button primary" onClick={onClose}><Check size={15} /> Open project</button>
            : step < STEPS.length - 1 ? <button className="button primary" onClick={() => setStep(step + 1)} disabled={!canNext || !!busy}>Next <ArrowRight size={15} /></button>
            : <button className="button primary" onClick={finish} disabled={!!busy}><Sparkles size={15} /> {busy ? 'Working…' : 'Generate plan & posts'}</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
