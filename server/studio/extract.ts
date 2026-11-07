import { load } from 'cheerio';
import { randomUUID } from 'node:crypto';
import type { BrandKit, MediaAsset, SourcePage } from '../../shared/studio';
import { publicUrl } from './safety';

export const cleanText = (value: string, max = 12000) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
export function sameSite(a: URL, b: URL): boolean {
  const root = (host: string) => host.toLowerCase().replace(/^www\./, '');
  return root(a.hostname) === root(b.hostname);
}

export function usefulPage(url: URL): boolean {
  let path: string;
  try { path = decodeURIComponent(url.pathname).toLowerCase(); } catch { return false; }
  if (url.search || /(?:^|[/_.-])(?:admin|account|accounts|auth|login|signin|sign-in|signup|register|dashboard|private|cart|basket|checkout|logout|log-out|password|reset|wp-admin|wp-login|api|oauth|session)(?:$|[/_.-])/.test(path)) return false;
  return !/\.(?:pdf|zip|xml|json|css|js|png|jpe?g|gif|webp|svg|avif|ico|mp4|webm|mov|woff2?|ttf|eot)$/i.test(path);
}

function resolvedAsset(value: string | undefined, base: URL): string | undefined {
  if (!value || /^(?:data|blob|javascript):/i.test(value.trim())) return;
  try { return publicUrl(new URL(value.trim(), base).href).href; } catch { return; }
}
function srcsetValues(value: string | undefined): string[] {
  if (!value || value.includes('data:')) return [];
  return value.split(',').map(candidate => candidate.trim().split(/\s+/)[0]).filter(Boolean);
}
export interface ExtractedPage {
  page: SourcePage;
  description: string;
  media: MediaAsset[];
  links: string[];
  stylesheets: string[];
  scriptUrls: string[];
  inlineStyles: string;
  brand: Partial<BrandKit>;
}

export function extractPage(html: string, pageUrl: string): ExtractedPage {
  const url = publicUrl(pageUrl);
  const $ = load(html);
  const meta = (key: string) => cleanText($(`meta[name="${key}"],meta[property="${key}"]`).first().attr('content') ?? '', 1600);
  const title = cleanText($('title').first().text() || meta('og:title') || $('h1').first().text(), 300);
  const description = meta('description') || meta('og:description');
  const brand: Partial<BrandKit> = {};
  const siteName = meta('og:site_name');
  if (siteName) brand.name = cleanText(siteName, 120);
  const themeColor = parseColor(meta('theme-color'));
  if (themeColor) brand.primary = themeColor;
  const inlineStyles = $('style').map((_, el) => $(el).text()).get().join('\n').slice(0, 512 * 1024);
  const stylesheets: string[] = [];
  $('link[rel]').each((_, el) => {
    if (!/\bstylesheet\b/i.test($(el).attr('rel') ?? '')) return;
    const href = resolvedAsset($(el).attr('href'), url);
    if (href && stylesheets.length < 2 && !stylesheets.includes(href)) stylesheets.push(href);
  });
  const media: MediaAsset[] = [];
  const seen = new Set<string>();
  const add = (raw: string | undefined, kind: 'image' | 'video', name: string, logo = false) => {
    const href = resolvedAsset(raw, url);
    if (!href || seen.has(href) || media.length >= 30) return;
    const assetUrl = new URL(href);
    if (kind === 'image' && /\.(?:svg|html?|js|pdf)(?:$|\?)/i.test(assetUrl.pathname)) return;
    seen.add(href);
    media.push({ id: randomUUID(), name: cleanText(name || assetUrl.pathname.split('/').pop() || `${kind} from website`, 160), url: href, kind, sourceUrl: url.href, origin: 'website' });
    if (logo && !brand.logo) brand.logo = href;
  };
  // Remove elements hidden directly in HTML; scripts, forms and UI chrome never become source text.
  $('[hidden],[aria-hidden="true"],[style]').each((_, el) => {
    const node = $(el);
    if (node.is('[hidden],[aria-hidden="true"]') || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(node.attr('style') ?? '')) node.remove();
  });
  // JavaScript-rendered sites still carry useful facts: noscript fallbacks,
  // structured data (JSON-LD) and serialized app state hold readable copy.
  const embedded: string[] = [];
  $('noscript').each((_, el) => {
    const text = cleanText(load(`<div>${$(el).text()}</div>`)('div').first().text());
    if (text.length >= 40) embedded.push(text);
  });
  $('script').each((_, el) => {
    const node = $(el);
    const type = (node.attr('type') ?? '').toLowerCase();
    if (!/ld\+json|application\/json/.test(type) && node.attr('id') !== '__NEXT_DATA__' && node.attr('id') !== '__NUXT_DATA__') return;
    const raw = node.text();
    if (!raw || raw.length > 1024 * 1024) return;
    embedded.push(...jsonStrings(raw));
  });
  const scriptUrls: string[] = [];
  $('script[src]').each((_, el) => {
    const src = resolvedAsset($(el).attr('src'), url);
    if (!src || scriptUrls.length >= 4 || scriptUrls.includes(src)) return;
    const candidate = new URL(src);
    if (sameSite(url, candidate) && /\.m?js(?:$|\?)/i.test(candidate.pathname)) scriptUrls.push(src);
  });
  $('script,noscript,template,iframe,form,svg').remove();
  $('img').each((_, el) => {
    const node = $(el);
    const width = Number(node.attr('width'));
    const height = Number(node.attr('height'));
    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) return;
    const name = node.attr('alt') || '';
    const logo = /logo/i.test([name, node.attr('class'), node.attr('id')].join(' '));
    for (const attr of ['src', 'data-src', 'data-lazy-src']) add(node.attr(attr), 'image', name, logo);
    for (const attr of ['srcset', 'data-srcset']) for (const candidate of srcsetValues(node.attr(attr))) add(candidate, 'image', name, logo);
  });
  $('picture source').each((_, el) => {
    for (const candidate of srcsetValues($(el).attr('srcset'))) add(candidate, 'image', $(el).parent().find('img').attr('alt') || 'Website image');
  });
  for (const key of ['og:image', 'og:image:url', 'twitter:image']) add(meta(key), 'image', `${title || 'Website'} social image`);
  $('link[rel]').each((_, el) => {
    if (/\b(?:icon|apple-touch-icon|logo)\b/i.test($(el).attr('rel') ?? '')) add($(el).attr('href'), 'image', 'Website logo/icon', true);
  });
  $('video').each((_, el) => {
    const node = $(el);
    add(node.attr('src'), 'video', node.attr('title') || 'Website video');
    node.find('source').each((_, source) => add($(source).attr('src'), 'video', 'Website video'));
    add(node.attr('poster'), 'image', 'Video poster');
  });
  const scored = new Map<string, number>();
  $('a[href]').each((_, el) => {
    const node = $(el);
    const href = resolvedAsset(node.attr('href'), url);
    if (!href) return;
    const candidate = new URL(href);
    if (!sameSite(url, candidate) || !usefulPage(candidate) || candidate.href === url.href) return;
    const label = `${candidate.pathname} ${cleanText(node.text(), 100)}`.toLowerCase();
    const score = /about|story|mission|sobre|quem/.test(label) ? 10 : /product|service|collection|shop|produto|servi|loja/.test(label) ? 8 : /faq|contact|blog|guide|feature|contacto/.test(label) ? 5 : 1;
    if (scored.size < 100) scored.set(candidate.href, Math.max(scored.get(candidate.href) ?? 0, score));
    if (/instagram\.com|tiktok\.com/.test(candidate.hostname)) return;
  });
  $('a[href]').each((_, el) => {
    const href = resolvedAsset($(el).attr('href'), url);
    if (!href) return;
    const host = new URL(href).hostname;
    if (/^(?:www\.)?instagram\.com$/.test(host) && !brand.instagram) brand.instagram = href;
    if (/^(?:www\.)?tiktok\.com$/.test(host) && !brand.tiktok) brand.tiktok = href;
    if (/^(?:[a-z]{2}\.)?(?:www\.)?linkedin\.com$/.test(host) && !brand.linkedin) brand.linkedin = href;
    if (/^(?:www\.)?tiktok\.com$/.test(host) && !brand.tiktok) brand.tiktok = href;
  });
  $('style,head,nav,footer,header,button,input,select,textarea,[role="navigation"],[role="dialog"]').remove();
  let root = $('main').first();
  if (!root.length) root = $('article').first();
  if (!root.length) root = $('body');
  root.find('br,p,h1,h2,h3,h4,li,section,div').each((_, el) => { $(el).append('\n'); });
  let text = cleanText(root.text());
  // Sparse static HTML (JavaScript-rendered apps) falls back to embedded data
  // and metadata so source-grounded generation still has real copy to work with.
  if (text.length < 120 && embedded.length) {
    text = cleanText([text, ...embedded].join('\n'));
  }
  if (text.length < 120 && description) {
    text = cleanText(`${title}\n${description}`);
  }
  return { page: { url: url.href, title, text }, description, media,
    links: [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([href]) => href),
    stylesheets, scriptUrls, inlineStyles, brand: { ...brandSuggestions(inlineStyles), ...brand } };
}

const PROSE_LIKE = /[a-zà-ÿ]{2,}\s+[a-zà-ÿ]/i;
/** Pulls readable strings out of JSON documents (LD+JSON, Next/Nuxt state). */
function jsonStrings(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    const found: string[] = [];
    const visit = (value: unknown) => {
      if (found.length >= 40) return;
      if (typeof value === 'string') {
        const text = cleanText(value, 500);
        if (text.length >= 30 && PROSE_LIKE.test(text) && !/^(?:https?:|data:|\/|\.|#)/.test(text)) found.push(text);
      } else if (Array.isArray(value)) value.slice(0, 60).forEach(visit);
      else if (value && typeof value === 'object') Object.values(value).slice(0, 60).forEach(visit);
    };
    visit(parsed);
    return [...new Set(found)];
  } catch { return []; }
}

/**
 * Extracts prose from a JavaScript bundle for JavaScript-rendered sites.
 * Only sentence-like literals are kept; minified code identifiers are skipped.
 */
export function extractScriptStrings(source: string): string {
  const found = new Set<string>();
  for (const match of source.matchAll(/(["'`])((?:\\.|(?!\1).){29,400})\1/g)) {
    const literal = match[2]
      .replace(/\\[nrt]/g, ' ')
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\(.)/g, '$1');
    const text = cleanText(literal, 400);
    if (text.length < 30 || text.length > 300) continue;
    if (!PROSE_LIKE.test(text)) continue;
    if ((text.match(/ /g) ?? []).length < 3) continue;
    // Anything carrying code punctuation or identifiers is not page copy.
    if (/[{}<>()[\];=|_\\`$^~#@*+]/.test(text)) continue;
    if (/\w\.\w|[a-z][A-Z]|=>|&&|\|\|/.test(text)) continue;
    if (/https?:|data:|www\.|webpack|function\s*\(|localhost/i.test(text)) continue;
    if (/^[\w.:/-]+$/.test(text)) continue;
    const tokens = text.split(/\s+/);
    // Utility-class strings ("bg-card flex rounded-xl") are styling, not copy.
    const classTokens = tokens.filter(token => /^[a-z][a-z0-9]*(?:[:/-][\w%.-]+)+$/.test(token)).length;
    if (classTokens >= Math.max(2, tokens.length * 0.35)) continue;
    found.add(text);
    if (found.size >= 80) break;
  }
  return [...found].slice(0, 60).join('\n');
}

export function parseColor(value: string): string | undefined {
  const hex = value.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i);
  if (hex) return '#' + (hex[1].length === 3 ? hex[1].split('').map(char => char + char).join('') : hex[1]).toLowerCase();
  const rgb = value.trim().match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*(?:1|1\.0+))?\s*\)$/i);
  if (rgb && rgb.slice(1).every(component => Number(component) <= 255)) return '#' + rgb.slice(1).map(component => Number(component).toString(16).padStart(2, '0')).join('');
  return;
}

export function brandSuggestions(css: string): Partial<BrandKit> {
  const brand: Partial<BrandKit> = {};
  const fonts = [...css.matchAll(/font-family\s*:\s*([^;}]+)/gi)].map(match => cleanText(match[1].split(',')[0].replace(/["']/g, ''), 80)).filter(font => /^[\w \-]+$/.test(font) && !/^(?:inherit|initial|unset|var|sans-serif|serif|monospace|system-ui)$/i.test(font));
  if (fonts[0]) brand.bodyFont = fonts[0];
  const heading = css.match(/(?:h[1-6]|\.heading|\.title)[^{]*\{[^}]*font-family\s*:\s*([^;}]+)/i)?.[1];
  if (heading) {
    const font = cleanText(heading.split(',')[0].replace(/["']/g, ''), 80);
    if (/^[\w \-]+$/.test(font) && !/^(inherit|unset|initial)$/.test(font)) brand.headingFont = font;
  } else if (fonts[1]) brand.headingFont = fonts[1];
  const frequency = new Map<string, number>();
  for (const match of css.matchAll(/(?:^|[;{\s])(?:--[\w-]+|(?:background-)?color|background|border-color)\s*:\s*(#[a-f\d]{3,8}\b|rgba?\([^)]*\))/gi)) {
    const color = parseColor(match[1]);
    if (color) frequency.set(color, (frequency.get(color) ?? 0) + 1);
  }
  const colors = [...frequency].sort((a, b) => b[1] - a[1]).map(([color]) => color);
  const chromatic = colors.filter(color => !/^#([a-f\d]{2})\1\1$/i.test(color));
  if (chromatic[0]) brand.primary = chromatic[0];
  if (chromatic[1]) brand.secondary = chromatic[1];
  const background = css.match(/(?:body|:root)[^{]*\{[^}]*background(?:-color)?\s*:\s*(#[a-f\d]{3,6}\b|rgba?\([^)]*\))/i)?.[1];
  const text = css.match(/(?:body|:root)[^{]*\{[^}]*\bcolor\s*:\s*(#[a-f\d]{3,6}\b|rgba?\([^)]*\))/i)?.[1];
  if (background && parseColor(background)) brand.background = parseColor(background);
  if (text && parseColor(text)) brand.text = parseColor(text);
  return brand;
}
