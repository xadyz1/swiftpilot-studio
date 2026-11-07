import { z } from 'zod';
import type { CrawlResult } from '../../shared/studio';
import { safeFetch, publicUrl, StudioError } from './safety';
import { assertRobotsAllowed, robotsForCrawl } from './robots';
import { brandSuggestions, extractPage, extractScriptStrings, sameSite, usefulPage } from './extract';

export const crawlInputSchema = z.object({ url: z.string().min(1).max(2048), maxPages: z.number().int().min(1).max(5).optional() }).strict();

export async function crawlWebsite(input: unknown, fetcher = safeFetch): Promise<CrawlResult> {
  const parsed = crawlInputSchema.safeParse(input);
  if (!parsed.success) throw new StudioError('Provide a public URL and an optional maxPages integer from 1 to 5.');
  const initial = publicUrl(parsed.data.url);
  if (!usefulPage(initial)) throw new StudioError('Only public content pages can be imported; account, private, cart, and action URLs are excluded.');
  const maxPages = parsed.data.maxPages ?? 5;
  const homepage = new URL('/', initial);
  const deadline = Date.now() + 60_000;
  const warnings: string[] = [];
  const getRobots = robotsForCrawl(deadline, warnings, fetcher);
  const result: CrawlResult = { url: initial.href, title: '', description: '', pages: [], media: [], brand: {}, warnings, fetchedAt: new Date().toISOString() };
  const queue = [homepage.href];
  if (initial.href !== homepage.href) queue.push(initial.href);
  const visited = new Set<string>();
  const mediaSeen = new Set<string>();
  const cssSeen = new Set<string>();
  let css = '';
  let attempts = 0;
  const guardPage = async (url: URL) => {
    if (!sameSite(initial, url) || !usefulPage(url)) throw new StudioError('The website redirected outside the permitted public site content.', 422);
    await assertRobotsAllowed(url, getRobots);
  };
  while (queue.length && result.pages.length < maxPages && attempts < 10) {
    if (Date.now() >= deadline) { warnings.push('The 60-second crawl deadline was reached; only completed pages were imported.'); break; }
    const next = queue.shift()!;
    if (visited.has(next)) continue;
    visited.add(next);
    attempts++;
    try {
      const response = await fetcher(next, { maxBytes: 2 * 1024 * 1024, accept: 'text/html,application/xhtml+xml', contentType: mime => ['text/html', 'application/xhtml+xml'].includes(mime), deadline, beforeRequest: guardPage });
      if (response.status < 200 || response.status >= 300) { warnings.push(`A public page could not be imported (HTTP ${response.status}).`); continue; }
      // Defense in depth for fetch adapters: verify final pages as well as every redirect.
      await guardPage(publicUrl(response.url));
      if (result.pages.some(page => page.url === response.url)) continue;
      visited.add(response.url);
      const extracted = extractPage(response.body.toString('utf8'), response.url);
      // JavaScript-rendered pages: recover readable copy from the app's own
      // script bundles (bounded, same-origin only) when the HTML is a shell.
      if (extracted.page.text.length < 120 && extracted.scriptUrls.length) {
        let bundleText = '';
        for (const scriptUrl of extracted.scriptUrls.slice(0, 2)) {
          if (Date.now() >= deadline) break;
          try {
            const script = await fetcher(scriptUrl, {
              maxBytes: 1024 * 1024, deadline,
              accept: '*/*',
              beforeRequest: async target => { if (!sameSite(initial, target)) throw new StudioError('Script bundle left the permitted origin.', 422); },
            });
            if (script.status >= 200 && script.status < 300) {
              bundleText = `${bundleText}\n${extractScriptStrings(script.body.toString('utf8'))}`;
            }
          } catch { /* A missing bundle only reduces recovered text. */ }
          if (bundleText.length >= 8000) break;
        }
        const recovered = (extracted.page.text + '\n' + bundleText).trim();
        if (recovered.length >= 60) {
          extracted.page.text = recovered.slice(0, 12000);
          warnings.push('This site renders content with JavaScript; copy was approximated from page data and bundled text. Review imported sources before generating drafts.');
        }
      }
      if (!extracted.page.text) { warnings.push('A page contained no readable text, even after JavaScript-content recovery.'); continue; }
      result.pages.push(extracted.page);
      if (result.pages.length === 1) {
        result.url = response.url;
        result.title = extracted.page.title;
        result.description = extracted.description;
        result.brand = extracted.brand;
      }
      css = (css + '\n' + extracted.inlineStyles).slice(0, 1024 * 1024);
      for (const asset of extracted.media) {
        if (!mediaSeen.has(asset.url) && result.media.length < 30) { result.media.push(asset); mediaSeen.add(asset.url); }
      }
      for (const link of extracted.links) {
        if (!visited.has(link) && !queue.includes(link) && queue.length < 30) queue.push(link);
      }
      for (const stylesheet of extracted.stylesheets) {
        if (cssSeen.size >= 2 || cssSeen.has(stylesheet) || Date.now() >= deadline) continue;
        cssSeen.add(stylesheet);
        try {
          const style = await fetcher(stylesheet, { maxBytes: 512 * 1024, accept: 'text/css', contentType: mime => mime === 'text/css', deadline });
          if (style.status >= 200 && style.status < 300) css = (css + '\n' + style.body.toString('utf8')).slice(0, 1024 * 1024);
          else warnings.push('An external stylesheet could not be imported; brand suggestions may be incomplete.');
        } catch { warnings.push('An external stylesheet could not be imported safely; brand suggestions may be incomplete.'); }
      }
    } catch (error) {
      warnings.push(error instanceof StudioError ? error.message : 'A public page could not be imported safely.');
    }
  }
  result.warnings = [...new Set(warnings)].slice(0, 20);
  if (!result.pages.length) throw new StudioError('No public text pages could be imported. Check the URL, robots policy, and whether the site blocks its content from being read.', 422, result.warnings);
  result.brand = { ...brandSuggestions(css), ...result.brand };
  if (!result.brand.name) result.brand.name = result.title.split(/\s[|–—-]\s/)[0].slice(0, 120);
  if (!result.media.length) result.warnings.push('No usable website media was found; text-only graphics can still be planned.');
  result.warnings.push('Brand colors and fonts are suggestions from static website styles; review them before publishing.');
  result.fetchedAt = new Date().toISOString();
  return result;
}
