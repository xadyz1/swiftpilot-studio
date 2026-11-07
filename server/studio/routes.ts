import type { Express, Request, Response } from 'express';
import { applyLimit } from './limits';
import { StudioError, safeFetch, MEDIA_MIMES, mediaSignatureMatches, publicUrl } from './safety';
import { crawlWebsite } from './crawl';
import { generateContent } from './generate';
import { sendNotify } from './mail';
import { login, logout, me, adminUsers, studioStateHandler, leadsHandler } from './auth';
import { uploadMedia, uploadStatus } from './upload';

function sendError(res: Response, error: unknown): void {
  if (error instanceof StudioError) {
    res.status(error.status).json({ error: error.message, ...(error.warnings?.length ? { warnings: error.warnings } : {}) });
    return;
  }
  console.error('Studio endpoint error:', error instanceof Error ? error.message : 'unknown');
  res.status(500).json({ error: 'The studio request could not be completed safely.' });
}

export function registerStudioRoutes(app: Express): void {
  app.post('/api/studio/crawl', async (req, res) => {
    if (!applyLimit(req, res, 'crawl')) return;
    try {
      const result = await crawlWebsite(req.body);
      res.json(result);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/studio/generate', async (req, res) => {
    if (!applyLimit(req, res, 'ai')) return;
    try {
      const result = await generateContent(req.body);
      res.json(result);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/studio/notify', async (req, res) => {
    try {
      const result = await sendNotify(req.body);
      res.json(result);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/studio/auth/login', async (req, res) => {
    try { await login(req, res); } catch (error) { sendError(res, error); }
  });
  app.post('/api/studio/auth/logout', async (req, res) => {
    try { logout(req, res); } catch (error) { sendError(res, error); }
  });
  app.get('/api/studio/auth/me', async (req, res) => {
    try { await me(req, res); } catch (error) { sendError(res, error); }
  });
  app.all('/api/studio/admin/users', async (req, res) => {
    try { await adminUsers(req, res); } catch (error) { sendError(res, error); }
  });
  app.all('/api/studio/state', async (req, res) => {
    try { await studioStateHandler(req, res); } catch (error) { sendError(res, error); }
  });

  app.all('/api/studio/leads', async (req, res) => {
    try { await leadsHandler(req, res); } catch (error) { sendError(res, error); }
  });

  app.get('/api/studio/upload/status', (_req, res) => res.json(uploadStatus()));
  app.post('/api/studio/upload', async (req, res) => {
    if (!applyLimit(req, res, 'media')) return;
    try { res.json(await uploadMedia(req.body)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/studio/media', async (req, res) => {
    if (!applyLimit(req, res, 'media')) return;
    try {
      const raw = typeof req.query.url === 'string' ? req.query.url : '';
      if (!raw) throw new StudioError('Provide a public media URL.');
      const target = publicUrl(raw);
      const response = await safeFetch(target.href, {
        maxBytes: 25 * 1024 * 1024,
        accept: [...MEDIA_MIMES].join(','),
        contentType: mime => MEDIA_MIMES.has(mime),
      });
      const mime = String(response.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!MEDIA_MIMES.has(mime) || !mediaSignatureMatches(mime, response.body)) {
        throw new StudioError('The source did not return a supported image or video file.', 415);
      }
      res.set('Cache-Control', 'public, max-age=3600');
      res.type(mime).send(response.body);
    } catch (error) { sendError(res, error); }
  });
}
