import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";

export class StudioError extends Error {
  constructor(message: string, public readonly status = 400, public readonly warnings?: string[]) {
    super(message);
    this.name = "StudioError";
  }
}

export type Resolver = (hostname: string) => Promise<LookupAddress[]>;
const systemResolver: Resolver = hostname => dnsLookup(hostname, { all: true, verbatim: true });

/** URL syntax checks are also used for extracted assets; DNS is checked before every fetch. */
export function publicUrl(input: string): URL {
  if (typeof input !== "string" || input.length > 2048) throw new StudioError("Provide a public HTTP or HTTPS URL.");
  let url: URL;
  try { url = new URL(input); } catch { throw new StudioError("Provide a valid public website URL."); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && url.port !== '80' && url.port !== '443')) {
    throw new StudioError("Only public HTTP/HTTPS URLs on ports 80 or 443 without credentials are allowed.");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (ipaddr.isValid(hostname.replace(/^\[|\]$/g, '')) || !hostname.includes('.') ||
      /(?:^|\.)(?:localhost|local|internal|intranet|lan|home|test|invalid|onion|arpa|localdomain|corp)$/.test(hostname)) {
    throw new StudioError("Local, internal, and IP-literal URLs are not allowed.");
  }
  url.hostname = hostname;
  url.hash = '';
  return url;
}

export function isPublicAddress(address: string): boolean {
  try {
    // Mapped IPv4, NAT64, 6to4, documentation, private, link-local, multicast and
    // reserved ranges are deliberately excluded, rather than translated.
    return ipaddr.parse(address).range() === 'unicast';
  } catch { return false; }
}

export async function withinDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new StudioError("The website request timed out.", 504);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new StudioError("The website request timed out.", 504)), remaining);
      timer.unref();
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function resolvePublic(url: URL, resolver: Resolver = systemResolver, deadline = Date.now() + 10_000): Promise<LookupAddress[]> {
  publicUrl(url.href);
  let records: LookupAddress[];
  try { records = await withinDeadline(resolver(url.hostname), deadline); }
  catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError("The public website hostname could not be resolved.", 422);
  }
  if (!records.length || records.some(record => ![4, 6].includes(record.family) || !isPublicAddress(record.address))) {
    throw new StudioError("The website resolves to a private or reserved network address.");
  }
  return records;
}

/** No second DNS resolution can occur at connect time (prevents DNS rebinding). */
export function pinnedLookup(hostname: string, records: LookupAddress[]): LookupFunction {
  return ((requested: string, options: { all?: boolean; family?: number } | number, callback: Function) => {
    if (requested.toLowerCase().replace(/\.$/, '') !== hostname.toLowerCase() ||
        records.length === 0 || records.some(record => !isPublicAddress(record.address))) {
      callback(new Error("Unsafe DNS lookup"));
      return;
    }
    const family = typeof options === 'number' ? options : options?.family;
    const selected = records.find(record => !family || record.family === family);
    if (!selected) { callback(new Error("No validated address for requested family")); return; }
    if (typeof options === 'object' && options.all) callback(null, [selected]);
    else callback(null, selected.address, selected.family);
  }) as LookupFunction;
}

export interface SafeResponse {
  url: string;
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}
export interface SafeFetchOptions {
  maxBytes: number;
  accept: string;
  contentType?: (mime: string) => boolean;
  deadline?: number;
  beforeRequest?: (url: URL) => Promise<void> | void;
  resolver?: Resolver;
}
const redirects = new Set([301, 302, 303, 307, 308]);
export function redirectTarget(current: URL, location: string): URL {
  if (location.length > 2048) throw new StudioError("The website returned an unsafe redirect.", 422);
  return publicUrl(new URL(location, current).href);
}

/** Native agents ignore HTTP(S)_PROXY; no cookies, auth, forms, or client headers are forwarded. */
export async function safeFetch(input: string, options: SafeFetchOptions): Promise<SafeResponse> {
  const deadline = Math.min(options.deadline ?? Infinity, Date.now() + 10_000);
  let url = publicUrl(input);
  for (let hop = 0; hop <= 4; hop++) {
    await withinDeadline(Promise.resolve(options.beforeRequest?.(url)), deadline);
    const records = await resolvePublic(url, options.resolver, deadline);
    const response = await requestPinned(url, records, options, deadline);
    if (!redirects.has(response.status)) return response;
    if (hop === 4 || !response.headers.location) throw new StudioError("The website returned too many or invalid redirects.", 422);
    url = redirectTarget(url, response.headers.location);
  }
  throw new StudioError("The website returned too many redirects.", 422);
}

function requestPinned(url: URL, records: LookupAddress[], options: SafeFetchOptions, deadline: number): Promise<SafeResponse> {
  return new Promise((resolve, reject) => {
    const secure = url.protocol === 'https:';
    const agentOptions = { keepAlive: false, maxSockets: 1, lookup: pinnedLookup(url.hostname, records) };
    const agent = secure ? new https.Agent(agentOptions) : new http.Agent(agentOptions);
    let settled = false;
    let req: http.ClientRequest;
    const finish = (error?: StudioError, result?: SafeResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) { req?.destroy(); reject(error); }
      else resolve(result!);
      agent.destroy();
    };
    const timer = setTimeout(() => finish(new StudioError("The website request timed out.", 504)), Math.max(1, deadline - Date.now()));
    timer.unref();
    req = (secure ? https : http).request(url, {
      method: 'GET', agent, family: records[0].family,
      headers: { 'User-Agent': 'SwiftPilotStudio/1.0', Accept: options.accept, 'Accept-Encoding': 'identity' },
    }, res => {
      const status = res.statusCode ?? 502;
      const result = { url: url.href, status, headers: res.headers, body: Buffer.alloc(0) };
      if (status < 200 || status >= 300) { res.destroy(); finish(undefined, result); return; }
      const mime = String(res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (options.contentType && !options.contentType(mime)) {
        res.destroy(); finish(new StudioError("The website returned an unsupported content type.", 415)); return;
      }
      if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') {
        res.destroy(); finish(new StudioError("Compressed website responses are not supported.", 415)); return;
      }
      const declared = Number(res.headers['content-length']);
      if (Number.isFinite(declared) && declared > options.maxBytes) {
        res.destroy(); finish(new StudioError("The website response exceeds the download limit.", 413)); return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > options.maxBytes) { res.destroy(); finish(new StudioError("The website response exceeds the download limit.", 413)); }
        else chunks.push(chunk);
      });
      res.on('end', () => finish(undefined, { ...result, body: Buffer.concat(chunks, size) }));
      res.on('aborted', () => finish(new StudioError("The website response was interrupted.", 502)));
      res.on('error', () => finish(new StudioError("The website response could not be read.", 502)));
    });
    req.on('error', () => finish(new StudioError("The public website could not be reached.", 502)));
    req.end();
  });
}

export const MEDIA_MIMES = new Set(['image/jpeg', 'image/png', 'image/apng', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
export function mediaSignatureMatches(mime: string, body: Buffer): boolean {
  if (body.length < 12) return false;
  const ascii = (start: number, end: number) => body.toString('ascii', start, end);
  switch (mime) {
    case 'image/jpeg': return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
    case 'image/png': case 'image/apng': return body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/gif': return ['GIF87a', 'GIF89a'].includes(ascii(0, 6));
    case 'image/webp': return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'image/avif': return ascii(4, 8) === 'ftyp' && /^(avif|avis)$/.test(ascii(8, 12));
    case 'image/bmp': return ascii(0, 2) === 'BM';
    case 'image/x-icon': case 'image/vnd.microsoft.icon': return body.readUInt32LE(0) === 0x00010000;
    case 'video/mp4': return ascii(4, 8) === 'ftyp' && /^(?:isom|iso[2-9]|mp4[12]|avc1|M4V |dash|MSNV)/.test(ascii(8, 12));
    case 'video/quicktime': return ascii(4, 8) === 'ftyp' && ascii(8, 12) === 'qt  ';
    case 'video/webm': return body.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) && body.subarray(0, 4096).includes(Buffer.from('webm'));
    case 'video/ogg': return ascii(0, 4) === 'OggS' && body.subarray(0, 4096).includes(Buffer.from('theora'));
    default: return false;
  }
}
