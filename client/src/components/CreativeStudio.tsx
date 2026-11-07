import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AspectRatioFormat, ContentTemplate, Platform } from '../data/content';
import type { BrandKit, MediaAsset } from '@shared/studio';
import { hungryBrand } from '../lib/brand';
import { downloadCreative } from '../lib/creative';
import { animationDimensions, exportAnimatedWebM, exportAdAnimation, type AnimationFormat, type AnimationStyle } from '../lib/animation';
import { mediaProxyURL, useMediaSource } from '../lib/media';
import { AD_DIMENSIONS, AD_FORMATS, canvasDimensions, isAdFormat, loadMediaAsset, renderStudioCanvas, exportCanvasPNG } from '../lib/studio-canvas';
import { downloadAdCode } from '../lib/ads';

export type CreativeStudioProps = {
  template: ContentTemplate;
  brand?: BrandKit;
  website?: string;
  media?: MediaAsset[];
  platform?: Platform;
  onChange?: (template: ContentTemplate) => void;
  onSave?: (template: ContentTemplate) => void;
  onClose?: () => void;
};

function AdCanvasPreview({ template, brand }: { template: ContentTemplate; brand: BrandKit }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [assets, setAssets] = useState<{ media?: CanvasImageSource; logo?: CanvasImageSource }>({});
  useEffect(() => {
    let dead = false;
    setAssets({});
    Promise.all([
      template.image ? loadMediaAsset(template.image, template.mediaKind ?? 'image').catch(() => undefined) : Promise.resolve(undefined),
      brand.logo ? loadMediaAsset(brand.logo, 'image').catch(() => undefined) : Promise.resolve(undefined),
    ]).then(([media, logo]) => {
      if (dead) return;
      if (media instanceof HTMLVideoElement) { media.muted = true; media.loop = true; media.playsInline = true; void media.play().catch(() => {}); }
      setAssets({ media, logo });
    });
    return () => { dead = true; };
  }, [template.image, template.mediaKind, brand.logo]);
  useEffect(() => {
    let dead = false;
    let timer: number | undefined;
    const draw = () => {
      const c = ref.current;
      if (!dead && c) void renderStudioCanvas(c, template, {
        brand,
        format: template.aspectRatio,
        layout: template.layout,
        textAlign: template.textAlign,
        headlineFontSize: template.headlineFontSize,
        headlineUppercase: template.headlineUppercase,
        showLogo: template.showLogo,
        logoPosition: template.logoPosition,
        logoSize: template.logoSize,
        overlayOpacity: template.overlayOpacity,
        contentPadding: template.contentPadding,
        preloadedMedia: assets.media,
        preloadedLogo: assets.logo,
      }).catch(() => {});
    };
    draw();
    // Videos get a live preview: re-render frames while the clip plays.
    if (assets.media instanceof HTMLVideoElement) timer = window.setInterval(draw, 150);
    return () => { dead = true; if (timer) window.clearInterval(timer); };
  }, [template, brand, assets]);
  return <canvas ref={ref} className="ad-canvas-preview" />;
}

const formats: ReadonlyArray<readonly [AnimationFormat, string, string]> = [
  ['square', '1:1', '1080 × 1080'],
  ['portrait', '4:5', '1080 × 1350'],
  ['vertical', '9:16', '1080 × 1920'],
];

export default function CreativeStudio({
  template,
  brand = hungryBrand,
  website = 'https://hungrypockets.eu/',
  media = [],
  platform = template.platforms[0] ?? 'instagram',
  onChange,
  onSave,
  onClose,
}: CreativeStudioProps) {
  const [format, setFormat] = useState<AnimationFormat>(template.format === 'Video' ? 'vertical' : 'portrait');
  const [style, setStyle] = useState<AnimationStyle>('soft-fade');
  const [duration, setDuration] = useState<4 | 6 | 8>(6);
  const [busy, setBusy] = useState<'png' | 'webm' | 'gif' | ''>('');
  const adDims = isAdFormat(template.aspectRatio) ? canvasDimensions(template.aspectRatio) : null;
  const [message, setMessage] = useState('');
  const selectedAsset = media.find(item => item.url === template.image);
  const mediaKind = selectedAsset?.kind ?? template.mediaKind ?? 'image';
  const mediaSource = useMediaSource(template.image);
  const dimensions = animationDimensions[format];
  const previewStyle = useMemo(() => ({ '--creative-image': template.image ? `url("${mediaProxyURL(mediaSource || template.image)}")` : 'none' }) as CSSProperties, [mediaSource, template.image]);
  const supportingCopy = template.supportingCopy ?? template.variants[platform]?.caption ?? '';
  const cta = template.cta ?? template.variants[platform]?.cta ?? '';
  const update = (patch: Partial<ContentTemplate>) => onChange?.({ ...template, ...patch });
  const updateVariant = (field: 'caption' | 'cta', value: string) => {
    onChange?.({
      ...template,
      ...(field === 'cta' ? { cta: value } : { supportingCopy: value }),
      variants: { ...template.variants, [platform]: { ...template.variants[platform], [field]: value } },
    });
  };
  const chooseMedia = (url: string) => {
    const asset = media.find(item => item.url === url);
    update({ image: url, mediaKind: asset?.kind ?? 'image' });
  };
  async function exportPNG() {
    setBusy('png'); setMessage('');
    try { await downloadCreative(template, format === 'vertical' ? 'tiktok' : 'instagram', brand, website, format); setMessage('PNG downloaded.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not export the PNG.'); }
    finally { setBusy(''); }
  }
  async function exportWebM() {
    setBusy('webm'); setMessage('');
    try { await exportAnimatedWebM(template, brand, website, { format, style, duration }); setMessage('Animated WebM downloaded.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not export the animation.'); }
    finally { setBusy(''); }
  }
  const adOpts = {
    brand, website,
    format: template.aspectRatio, layout: template.layout,
    showLogo: template.showLogo, textAlign: template.textAlign,
    headlineFontSize: template.headlineFontSize, headlineUppercase: template.headlineUppercase,
    logoPosition: template.logoPosition, logoSize: template.logoSize,
    overlayOpacity: template.overlayOpacity, contentPadding: template.contentPadding,
  };
  async function exportAdPNG() {
    setBusy('png'); setMessage('');
    try { await exportCanvasPNG(template, { ...adOpts, scale: 2 }); setMessage('PNG downloaded.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'PNG export failed.'); }
    finally { setBusy(''); }
  }
  async function exportAdAnim(kind: 'gif' | 'webm') {
    if (!adDims) return;
    setBusy(kind); setMessage('');
    try {
      await exportAdAnimation(template, brand, { dimensions: adDims, renderOptions: adOpts, duration, kind, filename: `ad-${adDims.width}x${adDims.height}` });
      setMessage(`${kind.toUpperCase()} downloaded.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Animation export failed.'); }
    finally { setBusy(''); }
  }
  function exportAdHTML() {
    if (!adDims) return;
    downloadAdCode({ id: template.id, name: brand.name, url: website, brand }, template, adDims);
    setMessage('HTML5 ad unit downloaded.');
  }
  return <section className="creative-studio" aria-labelledby="creative-studio-title">
    <header className="creative-studio-header">
      <div><span className="eyebrow">CREATIVE STUDIO</span><h2 id="creative-studio-title">Shape the visual</h2><p>Edit the words, media, format and motion in one workspace. Your changes stay attached to this post.</p></div>
      {onClose && <button type="button" className="icon-button" onClick={onClose} aria-label="Close creative studio">×</button>}
    </header>
    <div className="creative-studio-layout">
      <div className={`creative-studio-preview format-${format}`} style={previewStyle}>
        {adDims ? <AdCanvasPreview template={template} brand={brand} /> : (
        <div className="creative-studio-preview-surface">
          {mediaSource && (mediaKind === 'video' ? <video className="creative-studio-preview-media" src={mediaProxyURL(mediaSource)} controls muted loop playsInline /> : <img className="creative-studio-preview-media" src={mediaProxyURL(mediaSource)} alt={template.title} />)}
          <div className="creative-studio-preview-overlay"><span className="creative-preview-eyebrow">{template.eyebrow || brand.name}</span><strong>{template.headline || 'Add a headline'}</strong><p>{supportingCopy || 'Add supporting copy to give the idea context.'}</p><b>{cta || 'Add a call to action'}</b></div>
        </div>)}
        <p className="creative-studio-dimensions">Output: <strong>{adDims ? `${adDims.width} × ${adDims.height}` : `${dimensions.width} × ${dimensions.height}`}</strong></p>
      </div>
      <form className="creative-studio-controls" onSubmit={event => { event.preventDefault(); onSave?.(template); }}>
        <div className="creative-editor-fields">
          <label>Eyebrow<input value={template.eyebrow ?? ''} maxLength={42} placeholder={brand.name} onChange={event => update({ eyebrow: event.target.value })} /></label>
          <label>Headline<input value={template.headline} maxLength={90} onChange={event => update({ headline: event.target.value })} /></label>
          <label>Supporting copy<textarea rows={3} value={supportingCopy} onChange={event => updateVariant('caption', event.target.value)} /></label>
          <label>Call to action<textarea rows={2} value={cta} onChange={event => updateVariant('cta', event.target.value)} /></label>
        </div>
        <label>Selected media<select value={template.image} onChange={event => chooseMedia(event.target.value)}><option value="">Text-only graphic</option>{template.image && !media.some(item => item.url === template.image) && <option value={template.image}>Current media · {mediaKind}</option>}{media.map(item => <option key={item.id} value={item.url}>{item.name} · {item.kind}</option>)}</select></label>
        {adDims && (
          <label>Ad size
            <select value={template.aspectRatio} onChange={e => update({ aspectRatio: e.target.value as AspectRatioFormat })}>
              {AD_FORMATS.map(f => <option key={f} value={f}>{AD_DIMENSIONS[f].label} · {AD_DIMENSIONS[f].width} × {AD_DIMENSIONS[f].height}</option>)}
            </select>
          </label>
        )}
        {!adDims && <fieldset><legend>Format</legend><div className="creative-choice-grid">{formats.map(([value, label, size]) => <label key={value} className={format === value ? 'selected' : ''}><input type="radio" name="creative-format" value={value} checked={format === value} onChange={() => setFormat(value)} /><strong>{label}</strong><small>{size}</small></label>)}</div></fieldset>}
        <div className="creative-control-row"><label>Animation style<select value={style} onChange={event => setStyle(event.target.value as AnimationStyle)}><option value="soft-fade">Soft fade</option><option value="slow-zoom">Slow zoom</option><option value="text-rise">Text rise</option><option value="cinematic-pan">Cinematic pan</option></select></label><label>Duration<select value={duration} onChange={event => setDuration(Number(event.target.value) as 4 | 6 | 8)}><option value={4}>4 seconds</option><option value={6}>6 seconds</option><option value={8}>8 seconds</option></select></label></div>
        <div className="creative-studio-actions">{adDims ? (<>
            <button type="button" className="button secondary" onClick={exportAdPNG} disabled={!!busy}>{busy === 'png' ? 'Preparing…' : 'PNG'}</button>
            <button type="button" className="button secondary" onClick={() => exportAdAnim('gif')} disabled={!!busy}>{busy === 'gif' ? 'Encoding…' : 'GIF'}</button>
            <button type="button" className="button secondary" onClick={() => exportAdAnim('webm')} disabled={!!busy}>{busy === 'webm' ? 'Rendering…' : 'WebM'}</button>
            <button type="button" className="button primary" onClick={exportAdHTML}>HTML code</button>
            {onSave && <button type="submit" className="button secondary" disabled={!!busy}>Save visual edits</button>}
          </>) : (<>
            <button type="button" className="button secondary" onClick={exportPNG} disabled={!!busy}>{busy === 'png' ? 'Preparing…' : 'Download PNG'}</button>
            <button type="button" className="button primary" onClick={exportWebM} disabled={!!busy}>{busy === 'webm' ? 'Rendering…' : 'Export animated WebM'}</button>
            {onSave && <button type="submit" className="button secondary" disabled={!!busy}>Save visual edits</button>}
          </>)}</div>
        {message && <p className="creative-studio-status" role="status">{message}</p>}
        <p className="creative-studio-note">Video assets are previewed as a real muted, looping player. Exports remain local to this browser; no platform submission is performed.</p>
      </form>
    </div>
  </section>;
}
