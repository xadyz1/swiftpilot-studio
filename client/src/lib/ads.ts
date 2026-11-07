import type { BrandKit, SiteProject } from '@shared/studio';
import { downloadableMediaURL } from './media';

export type AdLayout = 'square' | 'landscape' | 'portrait' | 'story';
export type AdCopy = { eyebrow: string; headline: string; body: string; cta: string };
export const adDimensions: Record<AdLayout, { width: number; height: number; label: string }> = {
  square: { width: 1080, height: 1080, label: 'Square · 1080 × 1080' },
  landscape: { width: 1200, height: 628, label: 'Landscape · 1200 × 628' },
  portrait: { width: 1080, height: 1350, label: 'Portrait · 1080 × 1350' },
  story: { width: 1080, height: 1920, label: 'Story / Reel · 1080 × 1920' },
};

function escapeHTML(value: string): string { return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character)); }
function download(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function loadImage(source: string): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('This ad image could not be loaded. Try another asset.')); image.src = source; }); }

export async function downloadAdPNG(project: SiteProject, layout: AdLayout, copy: AdCopy, background?: string): Promise<void> {
  const { width, height } = adDimensions[layout];
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser does not support graphics export.');
  const brand = project.brand;
  ctx.fillStyle = brand.background; ctx.fillRect(0, 0, width, height);
  if (background) { try { const image = await loadImage(await downloadableMediaURL(background)); const scale = Math.max(width / image.width, height / image.height); const iw = image.width * scale; const ih = image.height * scale; ctx.globalAlpha = 0.28; ctx.drawImage(image, (width - iw) / 2, (height - ih) / 2, iw, ih); ctx.globalAlpha = 1; } catch { /* Text-only export remains useful when source media is unavailable. */ } }
  ctx.fillStyle = brand.primary; ctx.fillRect(0, 0, width, 18);
  const pad = layout === 'landscape' ? 74 : 66;
  ctx.fillStyle = brand.text; ctx.font = `700 ${layout === 'landscape' ? 42 : 48}px Arial, sans-serif`; ctx.fillText(brand.name, pad, pad + 8, width - pad * 2);
  ctx.fillStyle = brand.primary; ctx.font = `700 ${layout === 'landscape' ? 24 : 28}px Arial, sans-serif`; ctx.fillText(copy.eyebrow.toUpperCase(), pad, height * 0.48, width - pad * 2);
  ctx.fillStyle = brand.text; let size = layout === 'landscape' ? 76 : 96; ctx.font = `700 ${size}px Arial, sans-serif`; while (ctx.measureText(copy.headline).width > width - pad * 2 && size > 34) { size -= 2; ctx.font = `700 ${size}px Arial, sans-serif`; } ctx.fillText(copy.headline, pad, height * 0.58, width - pad * 2);
  ctx.font = `400 ${layout === 'landscape' ? 25 : 30}px Arial, sans-serif`; ctx.fillText(copy.body, pad, height * 0.66, width - pad * 2);
  ctx.fillStyle = brand.primary; ctx.fillRect(pad, height - 150, Math.min(330, width - pad * 2), 64); ctx.fillStyle = brand.background; ctx.font = '700 24px Arial, sans-serif'; ctx.fillText(copy.cta, pad + 22, height - 110, Math.min(285, width - pad * 2 - 40));
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The ad PNG export failed.')), 'image/png'));
  download(blob, `${project.id}-${layout}-${width}x${height}.png`);
}

export async function downloadAdHTML(project: SiteProject, layout: AdLayout, copy: AdCopy, background?: string): Promise<void> {
  const dimensions = adDimensions[layout];
  const publicMedia = background && /^https?:\/\//i.test(background) ? background : '';
  const media = publicMedia ? `<img class="ad-media" src="${escapeHTML(publicMedia)}" alt="" />` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(copy.headline)} · ${escapeHTML(project.name)}</title><style>:root{--primary:${escapeHTML(project.brand.primary)};--background:${escapeHTML(project.brand.background)};--text:${escapeHTML(project.brand.text)}}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef0f3;font-family:Arial,sans-serif;color:var(--text)}.ad{width:min(100%,${dimensions.width}px);aspect-ratio:${dimensions.width}/${dimensions.height};position:relative;overflow:hidden;padding:6%;display:flex;flex-direction:column;justify-content:center;background:var(--background)}.ad:before{content:"";position:absolute;inset:0 0 auto;height:18px;background:var(--primary)}.ad-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.22}.content{position:relative;z-index:1}.brand{font-weight:700;position:absolute;top:6%;left:6%}.eyebrow{color:var(--primary);font-weight:700;letter-spacing:.12em;font-size:clamp(12px,2vw,24px)}h1{font-size:clamp(28px,7vw,96px);line-height:1.02;margin:.35em 0;max-width:95%}p{font-size:clamp(14px,2.4vw,30px);max-width:75%;line-height:1.35}.cta{display:inline-block;background:var(--primary);color:var(--background);padding:1em 1.3em;margin-top:1.5em;text-decoration:none;font-weight:700;transition:transform .2s,filter .2s}.cta:hover,.cta:focus-visible{transform:translateY(-3px);filter:brightness(.9)}@media(max-width:600px){.ad{min-height:70vh}}</style></head><body><main class="ad" aria-label="${escapeHTML(copy.headline)} ad">${media}<div class="brand">${escapeHTML(project.name)}</div><div class="content"><div class="eyebrow">${escapeHTML(copy.eyebrow)}</div><h1>${escapeHTML(copy.headline)}</h1><p>${escapeHTML(copy.body)}</p><a class="cta" href="${escapeHTML(project.url)}">${escapeHTML(copy.cta)}</a></div></main></body></html>`;
  download(new Blob([html], { type: 'text/html;charset=utf-8' }), `${project.id}-${layout}-ad.html`);
}

import type { ContentTemplate } from '../data/content';
import type { CanvasDimensions } from './studio-canvas';
import { safeFont, siteDomain } from './brand';

/** Standalone, self-contained HTML5 ad unit driven by the visual template + brand kit. */
export function downloadAdCode(project: { id: string; name: string; url: string; brand: BrandKit }, template: ContentTemplate, dimensions: CanvasDimensions): void {
  const brand = project.brand;
  const slide = template.slides?.[0];
  const mediaUrl = slide?.image ?? template.image ?? '';
  const publicMedia = /^https?:\/\//i.test(mediaUrl) ? mediaUrl : '';
  const eyebrow = template.eyebrow || brand.name;
  const headline = template.headline || brand.tagline || project.name;
  const body = (slide?.supportingCopy ?? template.supportingCopy ?? '').slice(0, 220);
  const cta = slide?.cta ?? template.cta ?? `Explore ${siteDomain(project.url)}`;
  const wide = dimensions.width >= dimensions.height * 2.2;
  const heading = safeFont(brand.headingFont);
  const bodyF = safeFont(brand.bodyFont);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="ad.size" content="width=${dimensions.width},height=${dimensions.height}"><title>${escapeHTML(headline)} · ${escapeHTML(project.name)}</title><style>
*{box-sizing:border-box;margin:0}body{display:grid;place-items:center;min-height:100vh;background:#1a1e26;font-family:"${bodyF}",Arial,sans-serif}
.ad{width:${dimensions.width}px;height:${dimensions.height}px;position:relative;overflow:hidden;display:flex;${wide ? 'align-items:center' : 'flex-direction:column;justify-content:center'};background:${escapeHTML(brand.background)};color:${escapeHTML(brand.text)};text-decoration:none;border-top:${Math.max(4, Math.round(dimensions.height * 0.06))}px solid ${escapeHTML(brand.primary)}}
.media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.22}
.content{position:relative;z-index:1;display:flex;${wide ? 'align-items:center;flex:1' : 'flex-direction:column'};gap:${Math.max(4, dimensions.height * 0.05)}px;padding:${wide ? '0 ' + Math.round(dimensions.height * 0.14) + 'px' : Math.round(dimensions.height * 0.09) + 'px'}}
.eyebrow{color:${escapeHTML(brand.primary)};font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:${Math.max(9, dimensions.height * 0.1)}px}
h1{font-family:"${heading}",sans-serif;font-weight:800;line-height:1.04;font-size:${wide ? dimensions.height * 0.36 : Math.min(dimensions.height * 0.14, dimensions.width * 0.11)}px;${brand.uppercase ? 'text-transform:uppercase;' : ''}}
.body{opacity:.72;line-height:1.4;font-size:${Math.max(10, dimensions.height * 0.055)}px;${wide ? 'display:none' : ''}}
.cta{${wide ? 'margin-left:auto;flex-shrink:0;' : 'align-self:flex-start;margin-top:auto;'}background:${escapeHTML(brand.primary)};color:#fff;font-weight:700;border-radius:${Math.min(dimensions.height * 0.26, brand.radius || 8)}px;padding:${Math.max(6, dimensions.height * 0.14)}px ${Math.max(12, dimensions.height * 0.22)}px;font-size:${Math.max(9, dimensions.height * 0.15)}px;white-space:nowrap}
</style></head><body><a class="ad" href="${escapeHTML(project.url)}" target="_blank" rel="noopener">${publicMedia ? `<img class="media" src="${escapeHTML(publicMedia)}" alt="">` : ''}<div class="content"><div><div class="eyebrow">${escapeHTML(eyebrow)}</div><h1>${escapeHTML(headline)}</h1>${body ? `<p class="body">${escapeHTML(body)}</p>` : ''}</div><span class="cta">${escapeHTML(cta)}</span></div></a></body></html>`;
  download(new Blob([html], { type: 'text/html;charset=utf-8' }), `${project.id}-ad-${dimensions.width}x${dimensions.height}.html`);
}
