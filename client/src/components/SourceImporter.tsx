import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight, Globe, RefreshCw } from 'lucide-react';
import type { CrawlResult, SiteProject } from '@shared/studio';

interface SourceImporterProps {
  project: SiteProject;
  onImported: (result: CrawlResult, applyBrand: boolean) => void;
}

function websiteURL(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a complete website URL, including https:// or http://.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error('Use an HTTP or HTTPS website URL with a hostname and no embedded credentials.');
  }
  return url.href;
}

function sourceLink(value: string): string | undefined {
  try { return websiteURL(value); } catch { return undefined; }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCrawlResult(value: unknown): value is CrawlResult {
  if (!object(value)) return false;
  return typeof value.url === 'string'
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && typeof value.fetchedAt === 'string'
    && object(value.brand)
    && Array.isArray(value.warnings)
    && value.warnings.every(warning => typeof warning === 'string')
    && Array.isArray(value.pages)
    && value.pages.every(page => object(page)
      && typeof page.url === 'string'
      && typeof page.title === 'string'
      && typeof page.text === 'string')
    && Array.isArray(value.media)
    && value.media.every(asset => object(asset)
      && typeof asset.id === 'string'
      && typeof asset.name === 'string'
      && typeof asset.url === 'string'
      && ['image', 'video'].includes(String(asset.kind)));
}

function responseMessage(body: unknown, raw: string): string {
  if (object(body)) {
    if (typeof body.error === 'string') return body.error.slice(0, 600);
    if (object(body.error) && typeof body.error.message === 'string') return body.error.message.slice(0, 600);
    if (typeof body.message === 'string') return body.message.slice(0, 600);
  }
  return raw.trim().slice(0, 400) || 'The server returned no error details.';
}

function importDate(value?: string): string {
  if (!value) return 'Not imported yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Import date unavailable' : date.toLocaleString();
}

export default function SourceImporter({ project, onImported }: SourceImporterProps) {
  const id = useId();
  const [url, setURL] = useState(project.url);
  const [maxPages, setMaxPages] = useState(3);
  const [applyBrand, setApplyBrand] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestRef.current?.abort('project-change');
    requestRef.current = null;
    setURL(project.url);
    setMaxPages(3);
    setApplyBrand(false);
    setBusy(false);
    setElapsed(0);
    setError('');
    setNotice('');
    return () => {
      requestRef.current?.abort('unmounted');
      requestRef.current = null;
    };
  }, [project.id, project.url]);

  async function importWebsite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestRef.current) return;
    setError('');
    setNotice('');
    let target: string;
    try {
      target = websiteURL(url);
      if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 5) {
        throw new Error('Choose between 1 and 5 pages to import.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check the website URL and page limit.');
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
    const deadline = window.setTimeout(() => controller.abort('timeout'), 75_000);
    // Capture the checkbox at submission, so a late response cannot silently
    // apply brand suggestions based on another project's UI state.
    const shouldApplyBrand = applyBrand;
    try {
      const response = await fetch('/api/studio/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target, maxPages }),
        signal: controller.signal,
      });
      const raw = await response.text();
      let result: unknown;
      try { result = JSON.parse(raw); } catch { result = null; }
      if (!response.ok) {
        throw new Error(`Website import failed (HTTP ${response.status}): ${responseMessage(result, raw)}`);
      }
      if (!isCrawlResult(result)) {
        throw new Error('The server returned an invalid website import response. No project data was changed. Please try again.');
      }
      if (requestRef.current !== controller || controller.signal.aborted) return;
      onImported(result, shouldApplyBrand);
      setNotice(`Imported ${result.pages.length} ${result.pages.length === 1 ? 'page' : 'pages'} and found ${result.media.length} media ${result.media.length === 1 ? 'asset' : 'assets'}.${shouldApplyBrand ? ' Detected brand suggestions were explicitly selected for this import.' : ' Your brand kit was left unchanged.'}`);
    } catch (cause) {
      if (requestRef.current !== controller) return;
      if (controller.signal.aborted) {
        setError(controller.signal.reason === 'timeout'
          ? 'The website did not finish responding within 75 seconds. No import was applied. Try importing one page, or check that the site is public and reachable.'
          : 'Import canceled. No imported data or brand changes were applied.');
      } else {
        setError(cause instanceof Error
          ? `${cause.message}${cause instanceof TypeError ? ' Check your connection and that the studio server is running.' : ''}`
          : 'Could not import this website. Check your connection and try again.');
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

  const discoveredMedia = project.media.filter(asset => asset.origin === 'website').length;

  return (
    <section id="website-import" className="settings-panel" aria-labelledby={`${id}-title`}>
      <header className="settings-header">
        <span className="eyebrow">GROUND YOUR CONTENT</span>
        <h2 id={`${id}-title`}>Website sources</h2>
        <p className="helper-text">Import public website text and discover media. This provides the facts used to generate drafts for {project.name}.</p>
      </header>
      <form className="source-import-form" onSubmit={importWebsite} noValidate>
        <fieldset className="setting-grid" disabled={busy}>
          <label className="field-label" htmlFor={`${id}-url`}>
            Project website URL
            <input id={`${id}-url`} type="url" required value={url} onChange={event => setURL(event.target.value)} placeholder="https://yourwebsite.com" />
          </label>
          <label className="field-label" htmlFor={`${id}-pages`}>
            Maximum pages
            <select id={`${id}-pages`} value={maxPages} onChange={event => setMaxPages(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map(count => <option key={count} value={count}>{count} {count === 1 ? 'page' : 'pages'}</option>)}
            </select>
          </label>
          <div className="setting-full">
            <label className="checkbox-field">
              <input type="checkbox" checked={applyBrand} onChange={event => setApplyBrand(event.target.checked)} />
              Apply detected brand suggestions from this import
            </label>
            <p className="helper-text">Off by default. {project.brandEdited ? 'You have edited this brand kit. ' : ''}Your colors, fonts, logo, and brand details are never overwritten unless you explicitly select this option.</p>
          </div>
          <div className="settings-actions setting-full">
            <button className="button primary" type="submit" disabled={busy || !url.trim()}>
              {project.sources.length ? <RefreshCw size={16} aria-hidden="true" /> : <Globe size={16} aria-hidden="true" />}
              {busy ? 'Importing website…' : project.sources.length ? 'Re-import website' : 'Import website'}
            </button>
          </div>
        </fieldset>
      </form>
      {busy && (
        <div className="request-progress" role="status" aria-live="polite">
          <progress aria-label="Website import in progress" />
          <p>{elapsed < 15 ? 'Reading public pages and looking for media…' : 'Still waiting for the website. Importing can take about 60 seconds.'} <span>{elapsed}s elapsed</span></p>
          <button className="text-button" type="button" onClick={() => requestRef.current?.abort('canceled')}>Cancel import</button>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      <div className="import-summary">
        <div><span className="eyebrow">SAVED SOURCES</span><strong>{project.sources.length} {project.sources.length === 1 ? 'page' : 'pages'}</strong></div>
        <div><span className="eyebrow">DISCOVERED MEDIA IN LIBRARY</span><strong>{discoveredMedia} {discoveredMedia === 1 ? 'asset' : 'assets'}</strong></div>
        <div><span className="eyebrow">LAST IMPORT</span><strong>{importDate(project.importedAt)}</strong></div>
      </div>
      {project.importWarnings.length > 0 && (
        <div className="import-warnings" role="status">
          <h3>Import notes</h3>
          <ul>{project.importWarnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>
        </div>
      )}
      {project.sources.length ? (
        <div className="source-list">
          {project.sources.map((page, index) => {
            const href = sourceLink(page.url);
            const excerpt = page.text.trim();
            return (
              <article className="source-card" key={`${page.url}-${index}`}>
                <h3>{page.title || 'Untitled page'}</h3>
                {href ? <a className="source-url" href={href} target="_blank" rel="noopener noreferrer">{page.url}<ArrowUpRight size={14} aria-hidden="true" /></a> : <span className="source-url">{page.url}</span>}
                <p className="source-excerpt">{excerpt ? `${excerpt.slice(0, 650)}${excerpt.length > 650 ? '…' : ''}` : 'No readable text was found on this page.'}</p>
                <small className="helper-text">{excerpt.length.toLocaleString()} characters of imported text</small>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state"><Globe size={28} aria-hidden="true" /><h3>Start with your website</h3><p>Import at least 100 characters of readable source text before asking AI to generate content. JavaScript-only pages, private sites, or blocked crawlers may not return usable text.</p></div>
      )}
    </section>
  );
}
