import { useMemo, useState } from 'react';
import type { SiteProject } from '@shared/studio';
import { adDimensions, downloadAdHTML, downloadAdPNG, type AdCopy, type AdLayout } from '../lib/ads';

type Props = { project: SiteProject; onClose?: () => void };
const defaultCopy = (project: SiteProject): AdCopy => ({ eyebrow: 'MADE FOR YOUR MOMENT', headline: project.name, body: project.description || project.brand.tagline, cta: 'Explore now' });

export default function AdsStudio({ project, onClose }: Props) {
  const [layout, setLayout] = useState<AdLayout>('square');
  const [copy, setCopy] = useState<AdCopy>(() => defaultCopy(project));
  const [background, setBackground] = useState(project.media[0]?.url ?? '');
  const [busy, setBusy] = useState<'png' | 'html' | ''>('');
  const [message, setMessage] = useState('');
  const dimensions = adDimensions[layout];
  const selectedAsset = project.media.find(asset => asset.url === background);
  const previewStyle = useMemo(() => ({ backgroundColor: project.brand.background, color: project.brand.text, borderTopColor: project.brand.primary }) as React.CSSProperties, [project.brand]);
  const update = (field: keyof AdCopy, value: string) => setCopy(previous => ({ ...previous, [field]: value }));
  async function exportPNG() { setBusy('png'); setMessage(''); try { await downloadAdPNG(project, layout, copy, background); setMessage('PNG downloaded.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not export the PNG.'); } finally { setBusy(''); } }
  async function exportHTML() { setBusy('html'); setMessage(''); try { await downloadAdHTML(project, layout, copy, background); setMessage(selectedAsset?.kind === 'image' && /^https?:\/\//i.test(background) ? 'Interactive HTML downloaded with public media.' : 'Interactive HTML downloaded with a text-only media fallback.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not export the HTML file.'); } finally { setBusy(''); } }

  return <section className="ads-studio" aria-labelledby="ads-studio-title">
    <header className="ads-studio-header"><div><span className="eyebrow">ADS STUDIO</span><h2 id="ads-studio-title">Make a campaign-ready ad</h2><p>Design a responsive standalone ad for {project.name}. This is an export tool, not a submission flow.</p></div>{onClose && <button type="button" className="icon-button" onClick={onClose} aria-label="Close ads studio">×</button>}</header>
    <div className="ads-studio-layout">
      <div className="ads-studio-preview-wrap"><div className={`ads-studio-preview ads-layout-${layout}`} style={previewStyle}>{background && <img src={background} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}<div className="ads-studio-preview-content"><strong>{project.name}</strong><span>{copy.eyebrow}</span><h3>{copy.headline}</h3><p>{copy.body}</p><b>{copy.cta}</b></div></div><p className="ads-studio-dimensions">Output: <strong>{dimensions.width} × {dimensions.height}</strong></p></div>
      <form className="ads-studio-controls" onSubmit={event => event.preventDefault()}>
        <fieldset><legend>Ad layout</legend><div className="ads-layout-options">{(Object.entries(adDimensions) as [AdLayout, typeof dimensions][]).map(([value, option]) => <label key={value} className={layout === value ? 'selected' : ''}><input type="radio" name="ad-layout" value={value} checked={layout === value} onChange={() => setLayout(value)} /><strong>{option.label.split(' · ')[0]}</strong><small>{option.width} × {option.height}</small></label>)}</div></fieldset>
        <label>Background / media<select value={background} onChange={event => setBackground(event.target.value)}><option value="">Brand colors only</option>{project.media.map(asset => <option value={asset.url} key={asset.id}>{asset.name} · {asset.kind}</option>)}</select></label>
        <label>Eyebrow<input value={copy.eyebrow} maxLength={50} onChange={event => update('eyebrow', event.target.value)} /></label>
        <label>Headline<input value={copy.headline} maxLength={90} onChange={event => update('headline', event.target.value)} /></label>
        <label>Body<textarea value={copy.body} rows={3} maxLength={220} onChange={event => update('body', event.target.value)} /></label>
        <label>CTA label<input value={copy.cta} maxLength={35} onChange={event => update('cta', event.target.value)} /></label>
        <div className="ads-studio-actions"><button type="button" className="button secondary" disabled={!!busy} onClick={exportPNG}>{busy === 'png' ? 'Preparing…' : 'Download PNG'}</button><button type="button" className="button primary" disabled={!!busy} onClick={exportHTML}>{busy === 'html' ? 'Preparing…' : 'Download interactive HTML'}</button></div>
        {message && <p className="ads-studio-status" role="status">{message}</p>}
        <p className="ads-studio-note">The HTML file links to the selected project website URL. Local media cannot travel inside a downloaded file, so it falls back to text-only when needed.</p>
      </form>
    </div>
  </section>;
}
