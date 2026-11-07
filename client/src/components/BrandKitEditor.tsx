import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Check, Upload } from 'lucide-react';
import type { BrandKit, SiteProject } from '@shared/studio';
import { FONT_CHOICES, loadBrandFonts, safeFont } from '@/lib/brand';
import { mediaProxyURL, uploadLocalMedia, useMediaSource } from '@/lib/media';

interface BrandKitEditorProps {
  project: SiteProject;
  onSave: (brand: BrandKit) => void;
}

type ColorKey = 'primary' | 'secondary' | 'background' | 'text';
const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text' },
];
const IMAGE_TYPES = /^image\/(png|jpeg|webp|gif|avif)$/;

function normalizedHex(value: string): string | null {
  const hex = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex.slice(1).split('').map(char => char + char).join('')}`.toUpperCase();
  }
  return null;
}

function webLink(value: string, label: string): string {
  if (!value.trim()) return '';
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${label} must be a complete https:// or http:// URL.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error(`${label} must use HTTP or HTTPS, with a hostname and no embedded credentials.`);
  }
  return url.href;
}

function FontField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (font: string) => void;
}) {
  const [custom, setCustom] = useState(!FONT_CHOICES.includes(value));
  return (
    <div className="font-control">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={custom ? '__custom__' : value}
        onChange={event => {
          const next = event.target.value;
          setCustom(next === '__custom__');
          if (next !== '__custom__') onChange(next);
        }}
      >
        {FONT_CHOICES.map(font => <option key={font} value={font}>{font}</option>)}
        <option value="__custom__">Custom font family…</option>
      </select>
      {custom && (
        <input
          aria-label={`Custom ${label.toLowerCase()} family`}
          type="text"
          maxLength={100}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="e.g. Source Sans 3"
        />
      )}
    </div>
  );
}

function LogoPreview({ source, name }: { source: string; name: string }) {
  const resolved = useMediaSource(source);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  if (!source || !resolved || failed) return null;
  return (
    <img
      className="preview-logo"
      src={mediaProxyURL(resolved)}
      alt={`${name || 'Brand'} logo`}
      onError={() => setFailed(true)}
    />
  );
}

export default function BrandKitEditor({ project, onSave }: BrandKitEditorProps) {
  const id = useId();
  const [draft, setDraft] = useState<BrandKit>({ ...project.brand });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const activeProject = useRef(project.id);
  const uploadedLogos = useRef(new Set<string>());
  const uploadSequence = useRef(0);

  useEffect(() => {
    activeProject.current = project.id;
    uploadSequence.current += 1;
    setDraft({ ...project.brand });
    setError('');
    setSaved(false);
    setUploading(false);
    uploadedLogos.current.clear();
  }, [project.id, project.brand]);

  useEffect(() => {
    loadBrandFonts({
      ...draft,
      headingFont: safeFont(draft.headingFont),
      bodyFont: safeFont(draft.bodyFont),
    });
  }, [draft.headingFont, draft.bodyFont]);

  useEffect(() => () => { uploadSequence.current += 1; }, []);

  function update<K extends keyof BrandKit>(key: K, value: BrandKit[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    setError('');
    setSaved(false);
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.test(file.type)) {
      setError('Choose a raster image: PNG, JPG, WebP, GIF, or AVIF. Videos and SVG logos are not accepted.');
      return;
    }
    const sequence = ++uploadSequence.current;
    const projectId = project.id;
    setUploading(true);
    setError('');
    try {
      const asset = await uploadLocalMedia(file);
      if (sequence !== uploadSequence.current || activeProject.current !== projectId) return;
      uploadedLogos.current.add(asset.url);
      update('logo', asset.url);
    } catch (cause) {
      if (sequence === uploadSequence.current) {
        setError(cause instanceof Error ? cause.message : 'Could not upload your logo. Please try again.');
      }
    } finally {
      if (sequence === uploadSequence.current) setUploading(false);
    }
  }

  function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      if (!draft.name.trim()) throw new Error('Enter a brand name before saving.');
      const colors = {} as Pick<BrandKit, ColorKey>;
      for (const { key, label } of COLOR_FIELDS) {
        const color = normalizedHex(draft[key]);
        if (!color) throw new Error(`${label} color must be a valid HEX color, such as #4F46E5.`);
        colors[key] = color;
      }
      if (!draft.headingFont.replace(/[^a-zA-Z0-9 _-]/g, '').trim()
        || !draft.bodyFont.replace(/[^a-zA-Z0-9 _-]/g, '').trim()) {
        throw new Error('Enter a valid heading and body font family.');
      }
      let logo = draft.logo.trim();
      const isSavedLogo = logo === project.brand.logo
        || uploadedLogos.current.has(logo)
        || project.media.some(asset => asset.kind === 'image' && asset.url === logo);
      if (logo && !isSavedLogo) logo = webLink(logo, 'Logo URL');
      if (logo && /\.svgz?(?:[?#]|$)/i.test(logo)) {
        throw new Error('SVG logos are not accepted. Choose a raster image instead.');
      }
      const next: BrandKit = {
        ...draft,
        ...colors,
        name: draft.name.trim(),
        tagline: draft.tagline.trim(),
        logo,
        headingFont: safeFont(draft.headingFont),
        bodyFont: safeFont(draft.bodyFont),
        voice: draft.voice.trim(),
        audience: draft.audience.trim(),
        instagram: webLink(draft.instagram, 'Instagram profile'),
        tiktok: webLink(draft.tiktok, 'TikTok profile'),
        radius: Math.min(24, Math.max(0, Number(draft.radius) || 0)),
      };
      onSave(next);
      setDraft(next);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your brand kit.');
    }
  }

  const images = project.media.filter(asset => asset.kind === 'image');
  const previewColors = {
    primary: normalizedHex(draft.primary) || '#4F46E5',
    secondary: normalizedHex(draft.secondary) || '#06B6D4',
    background: normalizedHex(draft.background) || '#FFFFFF',
    text: normalizedHex(draft.text) || '#111827',
  };
  const previewLogo = draft.logo.startsWith('local-media:') || draft.logo.startsWith('/')
    || /^https?:\/\//i.test(draft.logo) ? draft.logo : '';

  return (
    <section className="settings-panel" aria-labelledby={`${id}-title`}>
      <header className="settings-header">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2 id={`${id}-title`}>Brand kit</h2>
        <p className="helper-text">A consistent look and voice for {project.name}. Changes stay in this form until you save.</p>
      </header>
      <form onSubmit={saveBrand} noValidate>
        <fieldset className="setting-grid" disabled={uploading}>
          <label className="field-label" htmlFor={`${id}-name`}>
            Brand name
            <input id={`${id}-name`} value={draft.name} maxLength={120} onChange={event => update('name', event.target.value)} />
          </label>
          <label className="field-label" htmlFor={`${id}-tagline`}>
            Tagline
            <input id={`${id}-tagline`} value={draft.tagline} maxLength={200} onChange={event => update('tagline', event.target.value)} placeholder="Your brand in a few words" />
          </label>
          <div className="setting-full">
            <label className="field-label" htmlFor={`${id}-logo`}>Logo URL or saved upload</label>
            <input id={`${id}-logo`} type="text" value={draft.logo} onChange={event => update('logo', event.target.value)} placeholder="https://example.com/logo.png" />
            <div className="settings-actions">
              <label className="button secondary upload-button" htmlFor={`${id}-logo-upload`}>
                <Upload size={16} aria-hidden="true" /> {uploading ? 'Saving logo…' : 'Upload logo'}
              </label>
              <input className="file-input" id={`${id}-logo-upload`} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={uploadLogo} />
              {draft.logo && <button type="button" className="text-button" onClick={() => update('logo', '')}>Clear logo</button>}
            </div>
            <p className="helper-text">Raster images only, up to 50 MB. Uploads stay in this browser.</p>
            <label className="field-label" htmlFor={`${id}-project-logo`}>Or choose a project image</label>
            <select id={`${id}-project-logo`} value={images.some(asset => asset.url === draft.logo) ? draft.logo : ''} onChange={event => { if (event.target.value) update('logo', event.target.value); }}>
              <option value="">Select an image…</option>
              {images.map(asset => <option key={asset.id} value={asset.url}>{asset.name}</option>)}
            </select>
          </div>
          <FontField key={`${project.id}-heading-${project.brand.headingFont}`} id={`${id}-heading-font`} label="Heading font" value={draft.headingFont} onChange={value => update('headingFont', value)} />
          <FontField key={`${project.id}-body-${project.brand.bodyFont}`} id={`${id}-body-font`} label="Body font" value={draft.bodyFont} onChange={value => update('bodyFont', value)} />
          <p className="helper-text setting-full">Custom families are sanitized on save. Google Fonts load when available; other families must be installed on your device.</p>
          {COLOR_FIELDS.map(({ key, label }) => (
            <div className="color-control" key={key}>
              <label className="field-label" htmlFor={`${id}-${key}`}>{label} color</label>
              <div className="color-inputs">
                <input type="color" aria-label={`Pick ${label.toLowerCase()} color`} value={previewColors[key]} onChange={event => update(key, event.target.value)} />
                <input id={`${id}-${key}`} type="text" spellCheck={false} maxLength={7} value={draft[key]} onChange={event => update(key, event.target.value)} placeholder="#4F46E5" />
              </div>
            </div>
          ))}
          <label className="field-label" htmlFor={`${id}-style`}>
            Visual style
            <select id={`${id}-style`} value={draft.style} onChange={event => update('style', event.target.value as BrandKit['style'])}>
              <option value="bold">Bold</option>
              <option value="editorial">Editorial</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
          <label className="field-label" htmlFor={`${id}-radius`}>
            Corner radius · {draft.radius}px
            <input id={`${id}-radius`} type="range" min={0} max={24} step={1} value={draft.radius} onChange={event => update('radius', Number(event.target.value))} />
          </label>
          <label className="checkbox-field setting-full">
            <input type="checkbox" checked={draft.uppercase} onChange={event => update('uppercase', event.target.checked)} />
            Uppercase headings
          </label>
          <label className="field-label setting-full" htmlFor={`${id}-voice`}>
            Brand voice
            <textarea id={`${id}-voice`} rows={3} value={draft.voice} onChange={event => update('voice', event.target.value)} placeholder="e.g. Warm, direct, helpful. Avoid hype and unsupported claims." />
          </label>
          <label className="field-label setting-full" htmlFor={`${id}-audience`}>
            Audience
            <textarea id={`${id}-audience`} rows={2} value={draft.audience} onChange={event => update('audience', event.target.value)} placeholder="Who are you speaking to?" />
          </label>
          <label className="field-label" htmlFor={`${id}-instagram`}>
            Instagram profile URL
            <input id={`${id}-instagram`} type="url" value={draft.instagram} onChange={event => update('instagram', event.target.value)} placeholder="https://instagram.com/yourbrand" />
          </label>
          <label className="field-label" htmlFor={`${id}-tiktok`}>
            TikTok profile URL
            <input id={`${id}-tiktok`} type="url" value={draft.tiktok} onChange={event => update('tiktok', event.target.value)} placeholder="https://tiktok.com/@yourbrand" />
          </label>
        </fieldset>

        <div
          className={`brand-live-preview preview-${draft.style}`}
          style={{
            background: previewColors.background,
            color: previewColors.text,
            borderRadius: `${draft.radius}px`,
            fontFamily: `"${safeFont(draft.bodyFont)}", sans-serif`,
          }}
          aria-label="Unsaved brand preview"
        >
          <span className="eyebrow">LIVE PREVIEW · NOT SAVED</span>
          <LogoPreview source={previewLogo} name={draft.name} />
          <h3 className="brand-preview-heading" style={{ fontFamily: `"${safeFont(draft.headingFont)}", sans-serif`, textTransform: draft.uppercase ? 'uppercase' : 'none', color: previewColors.primary, fontWeight: draft.style === 'bold' ? 700 : 500 }}>
            {draft.name.trim() || 'Your brand name'}
          </h3>
          <p className="brand-preview-tagline">{draft.tagline.trim() || 'A memorable line, in your own voice.'}</p>
          <p className="brand-preview-body">Thoughtful ideas. A clear message. A look that feels like you. Aa Bb Cc · 0123456789</p>
          <div className="brand-swatches" aria-label="Brand colors">
            {COLOR_FIELDS.map(({ key, label }) => <span key={key} className="brand-swatch" title={`${label}: ${previewColors[key]}`} style={{ backgroundColor: previewColors[key] }} />)}
          </div>
          <span className="brand-preview-cta" style={{ background: previewColors.secondary, color: previewColors.background, borderRadius: `${draft.radius}px` }}>Your next chapter</span>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {saved && <p className="form-success" role="status"><Check size={16} aria-hidden="true" /> Brand kit saved.</p>}
        <div className="settings-actions">
          <button className="button primary" type="submit" disabled={uploading}>{uploading ? 'Saving logo…' : 'Save brand kit'}</button>
          <button className="text-button" type="button" disabled={uploading} onClick={() => { setDraft({ ...project.brand }); setError(''); setSaved(false); }}>Reset unsaved changes</button>
        </div>
      </form>
    </section>
  );
}
