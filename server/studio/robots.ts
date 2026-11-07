import { safeFetch, StudioError } from './safety';

export const ROBOT_AGENT = 'swiftpilotstudio';
type Rule = { allow: boolean; pattern: string };
type Group = { agents: string[]; rules: Rule[] };
export type RobotsPolicy = { rules: Rule[]; unavailable?: boolean };

function normalizePath(value: string): string {
  // Decode only unreserved octets; encoded separators remain significant.
  return value.replace(/%[a-f\d]{2}/gi, token => {
    const char = String.fromCharCode(parseInt(token.slice(1), 16));
    return /^[a-z\d._~-]$/i.test(char) ? char : token.toUpperCase();
  }).replace(/[^\x00-\x7f]/g, char => encodeURIComponent(char));
}

export function parseRobots(text: string, agent = ROBOT_AGENT): RobotsPolicy {
  const groups: Group[] = [];
  let current: Group | undefined;
  let hasRules = false;
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.split('#', 1)[0].trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!value) continue;
      if (!current || hasRules) { current = { agents: [], rules: [] }; groups.push(current); hasRules = false; }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) {
      hasRules = true;
      if (value && value.startsWith('/')) current.rules.push({ allow: key === 'allow', pattern: normalizePath(value) });
    }
  }
  const matchLength = (group: Group) => Math.max(-1, ...group.agents.map(token => token === '*' ? 0 : agent.toLowerCase().includes(token) ? token.length : -1));
  const best = Math.max(-1, ...groups.map(matchLength));
  return { rules: best < 0 ? [] : groups.filter(group => matchLength(group) === best).flatMap(group => group.rules) };
}

export function robotsAllows(policy: RobotsPolicy, input: URL | string): boolean {
  if (policy.unavailable) return false;
  const url = typeof input === 'string' ? new URL(input) : input;
  const path = normalizePath(url.pathname + url.search);
  let length = -1;
  let allowed = true;
  for (const rule of policy.rules) {
    const anchored = rule.pattern.endsWith('$');
    const pattern = anchored ? rule.pattern.slice(0, -1) : rule.pattern;
    const regex = '^' + pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : '');
    if (!new RegExp(regex).test(path)) continue;
    const specificity = Buffer.byteLength(pattern.replace(/\*/g, ''));
    if (specificity > length || (specificity === length && rule.allow)) { length = specificity; allowed = rule.allow; }
  }
  return allowed;
}

/** Policies are cached only within one bounded crawl, not across visitors. */
export function robotsForCrawl(deadline: number, warnings: string[], fetcher = safeFetch) {
  const policies = new Map<string, Promise<RobotsPolicy>>();
  return async (url: URL): Promise<RobotsPolicy> => {
    if (!policies.has(url.origin)) {
      policies.set(url.origin, (async () => {
        try {
          const response = await fetcher(new URL('/robots.txt', url).href, {
            maxBytes: 256 * 1024, accept: 'text/plain,text/html,*/*', deadline,
          });
          if (response.status === 404) return { rules: [] };
          if (response.status >= 200 && response.status < 300) {
            const body = response.body.toString('utf8');
            const head = body.slice(0, 4096);
            // Many shared hosts answer robots.txt with a branded HTML error or
            // placeholder page. That is an absent policy, not a restrictive one.
            if (/<!doctype|<html[\s>]/i.test(head) || !/(?:^|\n)\s*user-agent\s*:/i.test(body)) {
              warnings.push('No usable robots.txt was published; the site was crawled as unrestricted.');
              return { rules: [] };
            }
            return parseRobots(body);
          }
          warnings.push(`Robots policy could not be verified (HTTP ${response.status}); pages on this origin were not crawled.`);
        } catch {
          warnings.push('Robots policy could not be verified; pages on this origin were not crawled.');
        }
        return { rules: [], unavailable: true };
      })());
    }
    return policies.get(url.origin)!;
  };
}

export async function assertRobotsAllowed(url: URL, getPolicy: (url: URL) => Promise<RobotsPolicy>): Promise<void> {
  const policy = await getPolicy(url);
  if (!robotsAllows(policy, url)) throw new StudioError(policy.unavailable ? 'The robots policy could not be verified; crawling was stopped.' : 'This page is disallowed by the website robots policy.', 422);
}
