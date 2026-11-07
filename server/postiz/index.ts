import type { Express, Response as ExpressResponse } from "express";
import { z } from "zod";

const POSTIZ_PATH = "/api/public/v1";
const PROVIDERS = ["instagram", "instagram-standalone", "tiktok"] as const;
const SECRET_KEY = /(authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret|cookie|jwt|credential)/i;

export class PostizConfigError extends Error {}

export interface PostizConfig {
  baseUrl: string;
  baseHost: string;
  apiKey: string;
}

export function normalizePostizBase(raw: string): string {
  const value = raw.trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PostizConfigError("POSTIZ_BASE_URL must be a valid http or https URL");
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    throw new PostizConfigError("POSTIZ_BASE_URL must use http/https and contain no credentials");
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname === "" || pathname === POSTIZ_PATH) url.pathname = POSTIZ_PATH;
  else if (pathname.endsWith(POSTIZ_PATH)) url.pathname = pathname;
  else url.pathname = `${pathname}${POSTIZ_PATH}`;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function getPostizConfig(env: NodeJS.ProcessEnv = process.env): PostizConfig | null {
  const apiKey = env.POSTIZ_API_KEY?.trim();
  const rawBase = env.POSTIZ_BASE_URL?.trim();
  if (!apiKey || !rawBase) return null;
  try {
    const baseUrl = normalizePostizBase(rawBase);
    return { baseUrl, baseHost: new URL(baseUrl).host, apiKey };
  } catch {
    return null;
  }
}

const httpUrl = z.string().trim().url().refine(value => {
  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, "must be an http(s) URL without credentials");
const nonEmptyId = z.string().trim().min(1).max(200);
const imageSchema = z.object({
  id: nonEmptyId,
  path: httpUrl,
  alt: z.string().max(1000).optional(),
  thumbnailTimestamp: z.number().finite().nonnegative().optional(),
}).strict();
const valueSchema = z.object({ content: z.string().max(100_000), image: z.array(imageSchema).max(100).optional() }).strict();
const instagramSettings = z.object({ __type: z.enum(["instagram", "instagram-standalone"]), post_type: z.enum(["post", "story"]) }).strict();
const tiktokSettings = z.object({
  __type: z.literal("tiktok"),
  privacy_level: z.string().max(100).optional(),
  duet: z.boolean().optional(),
  stitch: z.boolean().optional(),
  comment: z.boolean().optional(),
  autoAddMusic: z.boolean().optional(),
  brand_content_toggle: z.boolean().optional(),
  brand_organic_toggle: z.boolean().optional(),
  content_posting_method: z.string().max(100).optional(),
  title: z.string().max(2200).optional(),
}).strict();
const postSchema = z.object({
  integration: z.object({ id: nonEmptyId }).strict(),
  value: z.array(valueSchema).min(1).max(100),
  settings: z.union([instagramSettings, tiktokSettings]),
}).strict();
export const postPayloadSchema = z.object({
  type: z.enum(["draft", "schedule", "now"]),
  date: z.string().datetime({ offset: true }).optional(),
  posts: z.array(postSchema).min(1).max(100),
  tags: z.array(nonEmptyId).max(100).optional(),
  shortLink: z.boolean().optional(),
}).strict().superRefine((payload, ctx) => {
  if (payload.type === "schedule" && !payload.date) ctx.addIssue({ code: "custom", path: ["date"], message: "date is required for scheduled posts" });
  if (payload.type !== "schedule" && payload.date) ctx.addIssue({ code: "custom", path: ["date"], message: "date is only allowed for scheduled posts" });
});

export function validatePostPayload(input: unknown) {
  return postPayloadSchema.safeParse(input);
}

function sanitizeUnknown(value: unknown, depth = 0): unknown {
  if (depth > 8) return undefined;
  if (Array.isArray(value)) return value.map(item => sanitizeUnknown(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    output[key] = sanitizeUnknown(item, depth + 1);
  }
  return output;
}

export function sanitizeIntegrations(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map(item => {
    if (!item || typeof item !== "object") return {};
    const source = item as Record<string, unknown>;
    return sanitizeUnknown({ id: source.id, name: source.name, identifier: source.identifier, picture: source.picture, disabled: source.disabled, profile: source.profile, customer: source.customer });
  });
}

export function sanitizeIntegrationSettings(input: unknown) {
  if (!input || typeof input !== "object") return { output: [], maxLength: undefined, settings: {}, tools: [] };
  const source = input as Record<string, unknown>;
  return sanitizeUnknown({ output: source.output, rules: source.rules, maxLength: source.maxLength, settings: source.settings, tools: source.tools });
}

export function sanitizeProxyResult(input: unknown): unknown {
  return sanitizeUnknown(input);
}

function safeMessage(status: number): string {
  if (status === 400) return "Postiz rejected the request";
  if (status === 401 || status === 403) return "Postiz authentication failed";
  if (status === 404) return "Postiz endpoint was not found";
  if (status === 413) return "Postiz request is too large";
  if (status === 429) return "Postiz rate limit exceeded";
  return "Postiz upstream request failed";
}

async function readJson(response: globalThis.Response): Promise<unknown> {
  const type = response.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("json")) return undefined;
  try { return await response.json(); } catch { return undefined; }
}

async function proxy(config: PostizConfig, path: string, init: RequestInit = {}): Promise<{ status: number; body?: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: { Authorization: config.apiKey, ...(init.headers ?? {}) },
    });
    const body = await readJson(response);
    if (!response.ok) throw Object.assign(new Error(safeMessage(response.status)), { status: response.status });
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    throw Object.assign(new Error("Unable to connect to Postiz"), { status: 502 });
  } finally { clearTimeout(timeout); }
}

function unavailable(res: ExpressResponse) { return res.status(503).json({ error: "Postiz is not configured on this server" }); }
function handleError(res: ExpressResponse, error: unknown) {
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 502;
  return res.status(status).json({ error: error instanceof Error ? error.message : "Postiz upstream request failed" });
}

export function registerPostizRoutes(app: Express): void {
  app.get("/api/postiz/status", async (_req, res) => {
    const config = getPostizConfig();
    if (!config) return res.json({ configured: false, baseHost: null, connected: false });
    try {
      const result = await proxy(config, "/integrations");
      const body = result.body as Record<string, unknown> | undefined;
      return res.json({ configured: true, baseHost: config.baseHost, connected: true, ...(body && typeof body.workspace === "object" ? { workspace: sanitizeUnknown(body.workspace) } : {}) });
    } catch {
      return res.json({ configured: true, baseHost: config.baseHost, connected: false });
    }
  });

  app.get("/api/postiz/integrations", async (_req, res) => {
    const config = getPostizConfig(); if (!config) return unavailable(res);
    try { const result = await proxy(config, "/integrations"); const body = result.body as Record<string, unknown>; return res.json({ integrations: sanitizeIntegrations(Array.isArray(result.body) ? result.body : body?.integrations ?? body?.data) }); } catch (error) { return handleError(res, error); }
  });

  app.get("/api/postiz/integration-settings/:id", async (req, res) => {
    const config = getPostizConfig(); if (!config) return unavailable(res);
    if (!req.params.id.trim()) return res.status(400).json({ error: "integration id is required" });
    try { const result = await proxy(config, `/integration-settings/${encodeURIComponent(req.params.id)}`); return res.json(sanitizeIntegrationSettings(result.body)); } catch (error) { return handleError(res, error); }
  });

  app.get("/api/postiz/connect/:provider", async (req, res) => {
    const config = getPostizConfig(); if (!config) return unavailable(res);
    if (!(PROVIDERS as readonly string[]).includes(req.params.provider)) return res.status(400).json({ error: "unsupported provider" });
    try { const result = await proxy(config, `/social/${encodeURIComponent(req.params.provider)}`); const body = result.body as Record<string, unknown>; return res.json({ url: typeof body?.url === "string" ? body.url : undefined }); } catch (error) { return handleError(res, error); }
  });

  app.post("/api/postiz/upload", (_req, res) => res.status(501).json({ error: "File upload is not implemented; use upload-from-url" }));
  app.post("/api/postiz/upload-from-url", async (req, res) => {
    const config = getPostizConfig(); if (!config) return unavailable(res);
    const parsed = z.object({ url: httpUrl, adjust: z.unknown().optional() }).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid upload-from-url payload" });
    try { const result = await proxy(config, "/upload-from-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); return res.json(sanitizeProxyResult(result.body)); } catch (error) { return handleError(res, error); }
  });

  app.post("/api/postiz/posts", async (req, res) => {
    const config = getPostizConfig(); if (!config) return unavailable(res);
    const parsed = validatePostPayload(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid Postiz payload", details: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
    try { const result = await proxy(config, "/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); return res.json(sanitizeProxyResult(result.body)); } catch (error) { return handleError(res, error); }
  });

  app.post("/api/postiz/test", async (_req, res) => {
    const config = getPostizConfig(); if (!config) return unavailable(res);
    try { const result = await proxy(config, "/integrations"); const body = Array.isArray(result.body) ? result.body : ((result.body as Record<string, unknown>)?.integrations ?? (result.body as Record<string, unknown>)?.data); const integrations = sanitizeIntegrations(body); const counts = integrations.reduce<Record<string, number>>((acc, item) => { const identifier = typeof item === "object" && item && "identifier" in item && typeof item.identifier === "string" ? item.identifier : "unknown"; acc[identifier] = (acc[identifier] ?? 0) + 1; return acc; }, {}); return res.json({ integrations, channels: counts }); } catch (error) { return handleError(res, error); }
  });
}
