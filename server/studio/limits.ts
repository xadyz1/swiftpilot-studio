import type { Request, Response } from 'express';
import ipaddr from 'ipaddr.js';

/** Bounded sliding-window buckets; full maps fail closed instead of evicting active limits. */
export class WindowLimit {
  private readonly buckets = new Map<string, number[]>();
  constructor(public readonly count: number, public readonly windowMs: number, private readonly maxKeys = 10_000) {}
  consume(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
    for (const [storedKey, values] of this.buckets) {
      const active = values.filter(time => time > now - this.windowMs);
      if (!active.length) this.buckets.delete(storedKey);
      else this.buckets.set(storedKey, active);
    }
    let values = this.buckets.get(key);
    if (!values && this.buckets.size >= this.maxKeys) return { allowed: false, retryAfter: Math.ceil(this.windowMs / 1000) };
    values ??= [];
    if (values.length >= this.count) return { allowed: false, retryAfter: Math.max(1, Math.ceil((values[0] + this.windowMs - now) / 1000)) };
    values.push(now);
    this.buckets.set(key, values);
    return { allowed: true, retryAfter: 0 };
  }
  get size(): number { return this.buckets.size; }
}

const crawlLimit = new WindowLimit(10, 60_000);
const mediaLimit = new WindowLimit(120, 60_000);
const aiIpLimit = new WindowLimit(10, 60 * 60_000);
const aiGlobalLimit = new WindowLimit(30, 60 * 60_000, 1);

export function requestIp(req: Request): string {
  // Do not trust arbitrary X-Forwarded-For. Respect only Express's explicitly
  // configured trust proxy policy; this app defaults to the socket peer.
  const raw = req.ip || req.socket.remoteAddress || 'unknown';
  try {
    const parsed = ipaddr.process(raw);
    if (parsed.kind() === 'ipv6') {
      // Group IPv6 clients by /64 to prevent trivial address rotation.
      const bytes = parsed.toByteArray();
      bytes.fill(0, 8);
      return ipaddr.fromByteArray(bytes).toString() + '/64';
    }
    return parsed.toString();
  } catch { return 'unknown'; }
}

export function applyLimit(req: Request, res: Response, kind: 'crawl' | 'media' | 'ai'): boolean {
  const perIp = (kind === 'crawl' ? crawlLimit : kind === 'media' ? mediaLimit : aiIpLimit).consume(requestIp(req));
  const decision = perIp.allowed && kind === 'ai' ? aiGlobalLimit.consume('global') : perIp;
  if (!decision.allowed) {
    res.set('Retry-After', String(decision.retryAfter)).status(429).json({ error: 'Request limit reached. Please try again later.' });
    return false;
  }
  return true;
}
