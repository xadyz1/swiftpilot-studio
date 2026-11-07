import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Download, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import type { MediaAsset, SiteProject } from '@shared/studio';
import { downloadOriginal, mediaProxyURL, uploadMedia, useMediaSource } from '@/lib/media';

interface MediaLibraryProps {
  project: SiteProject;
  onAdd: (assets: MediaAsset[]) => void;
  onRemove: (id: string) => void;
  onUse?: (asset: MediaAsset) => void;
}

function publicMediaURL(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a complete public media URL, starting with https:// or http://.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Media URLs must use HTTP or HTTPS and cannot contain usernames or passwords.');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  // Require a public domain instead of local hosts or IP literals. The server
  // performs the authoritative DNS / redirect checks before proxying media.
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':')
    || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)
    || host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
    throw new Error('Use a public website hostname. Local addresses and IP-literal media URLs are not accepted.');
  }
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { /* Keep the encoded path. */ }
  if (/\.svgz?(?:$|\/)/i.test(path)
    || [...url.searchParams.values()].some(item => /^(?:image\/)?svg(?:\+xml)?$/i.test(item))) {
    throw new Error('SVG files are not accepted. Use a PNG, JPG, WebP, GIF, AVIF, or a supported video.');
  }
  return url;
}

function safeSourceLink(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function MediaCard({
  asset,
  onRemove,
  onUse,
}: {
  asset: MediaAsset;
  onRemove: (id: string) => void;
  onUse?: (asset: MediaAsset) => void;
}) {
  const resolved = useMediaSource(asset.url);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setFailed(false); setError(''); }, [asset.url]);
  const preview = resolved ? mediaProxyURL(resolved) : '';
  const sourceLink = safeSourceLink(asset.sourceUrl || (asset.origin !== 'upload' ? asset.url : undefined));
  const origin = asset.origin === 'upload' || asset.url.startsWith('local-media:')
    ? 'Local upload'
    : asset.origin === 'website' ? 'Website import' : 'Public URL';

  async function download() {
    setError('');
    setDownloading(true);
    try {
      await downloadOriginal(asset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download the original file.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="media-card">
      <div className="media-preview">
        {!preview || failed ? (
          <div className="media-placeholder">
            <ImagePlus size={24} aria-hidden="true" />
            <span>{failed ? 'This source could not be previewed.' : 'Preview unavailable or loading…'}</span>
            {asset.url.startsWith('local-media:') && <small>If this upload is missing, add the original file again.</small>}
          </div>
        ) : asset.kind === 'video' ? (
          <video src={preview} controls playsInline preload="metadata" aria-label={asset.name} onError={() => setFailed(true)} />
        ) : (
          <img src={preview} alt={asset.name} loading="lazy" onError={() => setFailed(true)} />
        )}
        <span className="media-kind">{asset.kind === 'video' ? 'Video' : 'Image'}</span>
      </div>
      <div className="media-card-body">
        <h3 title={asset.name}>{asset.name}</h3>
        <p className="media-source">{origin}{sourceLink && <> · <a href={sourceLink} target="_blank" rel="noopener noreferrer">View source</a></>}</p>
        <div className="media-card-actions">
          {onUse && <button type="button" className="text-button" onClick={() => onUse(asset)}><Plus size={15} aria-hidden="true" /> Create post</button>}
          <button className="icon-button" type="button" aria-label={`Download original ${asset.name}`} title="Download original" disabled={downloading} onClick={download}><Download size={16} aria-hidden="true" /></button>
          <button className="icon-button" type="button" aria-label={`Remove ${asset.name} from this project`} title="Remove from project (keeps the stored file)" onClick={() => onRemove(asset.id)}><Trash2 size={16} aria-hidden="true" /></button>
        </div>
        {downloading && <p className="helper-text" role="status">Downloading original…</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </article>
  );
}

export default function MediaLibrary({ project, onAdd, onRemove, onUse }: MediaLibraryProps) {
  const id = useId();
  const [url, setURL] = useState('');
  const [kind, setKind] = useState<MediaAsset['kind']>('image');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);

  useEffect(() => {
    sequence.current += 1;
    setURL('');
    setName('');
    setKind('image');
    setBusy(false);
    setProgress('');
    setError('');
    setNotice('');
    return () => { sequence.current += 1; };
  }, [project.id]);

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const operation = ++sequence.current;
    setBusy(true);
    setError('');
    setNotice('');
    const assets: MediaAsset[] = [];
    const failures: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        if (operation !== sequence.current) return;
        setProgress(`Saving ${index + 1} of ${files.length}: ${file.name}`);
        try {
          assets.push(await uploadMedia(file));
        } catch (cause) {
          failures.push(`${file.name}: ${cause instanceof Error ? cause.message : 'Could not save this file.'}`);
        }
      }
      if (operation !== sequence.current) return;
      if (assets.length) {
        onAdd(assets);
        setNotice(`Added ${assets.length} ${assets.length === 1 ? 'file' : 'files'} to this project.`);
      }
      if (failures.length) setError(failures.join('\n'));
    } catch (cause) {
      if (operation === sequence.current) setError(cause instanceof Error ? cause.message : 'Could not add these files.');
    } finally {
      if (operation === sequence.current) {
        setBusy(false);
        setProgress('');
      }
    }
  }

  function addURL(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const parsed = publicMediaURL(url);
      let filename = parsed.pathname.split('/').filter(Boolean).pop() || `Website ${kind}`;
      try { filename = decodeURIComponent(filename); } catch { /* Use the URL segment. */ }
      const asset: MediaAsset = {
        id: crypto.randomUUID(),
        name: name.trim() || filename,
        url: parsed.href,
        kind,
        origin: 'url',
        sourceUrl: parsed.href,
      };
      if (project.media.some(item => item.url === asset.url)) {
        throw new Error('This media URL is already in the project.');
      }
      onAdd([asset]);
      setURL('');
      setName('');
      setNotice('Public media URL added. If its host restricts access, the preview may be unavailable.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add this media URL.');
    }
  }

  return (
    <section className="settings-panel" aria-labelledby={`${id}-title`}>
      <header className="settings-header">
        <span className="eyebrow">YOUR ASSETS</span>
        <h2 id={`${id}-title`}>Media library</h2>
        <p className="helper-text">Upload originals or add a public image or video URL for {project.name}.</p>
      </header>
      <div className="media-upload">
        <label className="button secondary upload-button" htmlFor={`${id}-upload`} aria-disabled={busy}>
          <Upload size={16} aria-hidden="true" /> {busy ? 'Saving uploads…' : 'Upload media'}
        </label>
        <input className="file-input" id={`${id}-upload`} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" disabled={busy} onChange={uploadFiles} />
        <p className="helper-text">PNG, JPG, WebP, GIF, AVIF, MP4, WebM, or MOV · up to 50 MB each. No SVG. Uploads are saved in this browser, not in a cloud library.</p>
      </div>
      <form className="media-url-form" onSubmit={addURL}>
        <fieldset className="setting-grid" disabled={busy}>
          <label className="field-label setting-full" htmlFor={`${id}-url`}>
            Public media URL
            <input id={`${id}-url`} type="url" required value={url} onChange={event => setURL(event.target.value)} placeholder="https://example.com/photo.jpg" />
          </label>
          <label className="field-label" htmlFor={`${id}-kind`}>
            Media type
            <select id={`${id}-kind`} value={kind} onChange={event => setKind(event.target.value as MediaAsset['kind'])}>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </label>
          <label className="field-label" htmlFor={`${id}-name`}>
            Display name (optional)
            <input id={`${id}-name`} value={name} maxLength={200} onChange={event => setName(event.target.value)} placeholder="A name you will recognize" />
          </label>
          <div className="settings-actions setting-full"><button className="button secondary" type="submit" disabled={!url.trim() || busy}><Plus size={16} aria-hidden="true" /> Add URL</button></div>
        </fieldset>
      </form>
      {busy && <p className="helper-text" role="status" aria-live="polite">{progress || 'Saving media to browser storage…'}</p>}
      {error && <p className="form-error" role="alert" style={{ whiteSpace: 'pre-line' }}>{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      <div className="media-library-heading"><h3>{project.media.length} {project.media.length === 1 ? 'asset' : 'assets'}</h3><span className="helper-text">Removing an asset only hides the project record; it does not delete the stored file.</span></div>
      {project.media.length ? (
        <div className="media-grid">{project.media.map(asset => <MediaCard key={asset.id} asset={asset} onRemove={onRemove} onUse={onUse} />)}</div>
      ) : (
        <div className="empty-state"><ImagePlus size={28} aria-hidden="true" /><h3>Your library is ready for its first asset</h3><p>Upload an original, add a media URL, or import images from your website.</p></div>
      )}
    </section>
  );
}
