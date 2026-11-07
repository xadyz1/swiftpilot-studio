import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { StudioError } from './safety';

/**
 * Bunny Storage upload adapter. Env-gated — without the zone/key the
 * endpoint reports {enabled:false} and clients keep browser-local blobs.
 */
const uploadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  mime: z.string().trim().regex(/^(image|video)\/[a-z0-9.+-]+$/i).max(60),
  data: z.string().min(1).max(30 * 1024 * 1024), // base64 payload
}).strict();

const env = () => {
  // Accept both BUNNY_* and this project's NEXT_BUNNY_* naming.
  const endpoint = (process.env.BUNNY_STORAGE_ENDPOINT ?? process.env.NEXT_BUNNY_STORAGE_ENDPOINT ?? '').trim();
  const zoneFromEndpoint = endpoint.match(/storage\.bunnycdn\.com\/([^/\s]+)/i)?.[1] ?? '';
  return {
    zone: (process.env.BUNNY_STORAGE_ZONE ?? '').trim() || zoneFromEndpoint,
    key: (process.env.BUNNY_API_KEY ?? process.env.NEXT_BUNNY_API_KEY ?? '').trim(),
    cdn: (process.env.BUNNY_CDN_HOSTNAME ?? process.env.NEXT_BUNNY_PULL_ZONE ?? '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    region: (process.env.BUNNY_REGION ?? '').trim(), // e.g. de, ny, la — empty = main
  };
};

export function uploadStatus(): { enabled: boolean; cdn?: string } {
  const { zone, key, cdn } = env();
  return zone && key && cdn ? { enabled: true, cdn } : { enabled: false };
}

const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadMedia(input: unknown, fetcher: typeof fetch = fetch): Promise<{ url: string; cdn: string }> {
  const { zone, key, cdn, region } = env();
  if (!zone || !key || !cdn) throw new StudioError('Bunny Storage is not configured — set BUNNY_STORAGE_ZONE, BUNNY_API_KEY, BUNNY_CDN_HOSTNAME.', 503);
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) throw new StudioError('Invalid upload. Provide a name, image/video mime type and base64 data.', 400);
  const body = Buffer.from(parsed.data.data, 'base64');
  if (!body.length || body.length > MAX_BYTES) throw new StudioError('The file is too large (20MB max).', 400);
  const ext = (parsed.data.name.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? 'bin').toLowerCase();
  const path = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  const host = `${region ? `${region}.` : ''}storage.bunnycdn.com`;
  const response = await fetcher(`https://${host}/${zone}/${path}`, {
    method: 'PUT',
    headers: { AccessKey: key, 'Content-Type': 'application/octet-stream' },
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new StudioError('The media upload was rejected by Bunny Storage. Check the zone and API key.', 502);
  }
  return { url: `https://${cdn}/${path}`, cdn };
}
