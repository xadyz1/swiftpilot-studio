import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPostizConfig,
  normalizePostizBase,
  registerPostizRoutes,
  sanitizeIntegrations,
  validatePostPayload,
} from "./index";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Postiz base configuration", () => {
  it("normalizes bare and already-versioned bases", () => {
    expect(normalizePostizBase("https://postiz.example/")) .toBe("https://postiz.example/api/public/v1");
    expect(normalizePostizBase("https://postiz.example/api/public/v1/")) .toBe("https://postiz.example/api/public/v1");
  });
  it("rejects credentials and non-http protocols", () => {
    expect(() => normalizePostizBase("https://user:pass@postiz.example")).toThrow();
    expect(() => normalizePostizBase("ftp://postiz.example")).toThrow();
  });
  it("does not create a config without both server-only values", () => {
    expect(getPostizConfig({ POSTIZ_BASE_URL: "https://postiz.example" })).toBeNull();
    expect(getPostizConfig({ POSTIZ_API_KEY: "secret" })).toBeNull();
  });
});

describe("Postiz payload safety", () => {
  const base = { type: "now", posts: [{ integration: { id: "integration-1" }, value: [{ content: "hello", image: [{ id: "asset-1", path: "https://cdn.example/image.jpg" }] }], settings: { __type: "instagram", post_type: "post" } }] };
  it("accepts a valid post and rejects unknown settings", () => {
    expect(validatePostPayload(base).success).toBe(true);
    expect(validatePostPayload({ ...base, posts: [{ ...base.posts[0], settings: { __type: "instagram", post_type: "post", token: "do-not-accept" } }] }).success).toBe(false);
  });
  it("rejects media credentials and requires dates only for schedules", () => {
    expect(validatePostPayload({ ...base, posts: [{ ...base.posts[0], value: [{ content: "x", image: [{ id: "a", path: "https://user:pass@cdn.example/a" }] }] }] }).success).toBe(false);
    expect(validatePostPayload({ ...base, type: "schedule" }).success).toBe(false);
    expect(validatePostPayload({ ...base, type: "schedule", date: "2026-11-06T23:00:00Z" }).success).toBe(true);
  });
});

describe("Postiz response safety", () => {
  it("removes credentials from integration results", () => {
    const result = sanitizeIntegrations([{ id: "1", name: "IG", identifier: "instagram", apiKey: "secret", profile: { username: "brand" } }]);
    expect(result).toEqual([{ id: "1", name: "IG", identifier: "instagram", picture: undefined, disabled: undefined, profile: { username: "brand" }, customer: undefined }]);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it("returns a safe no-config response without calling upstream", async () => {
    vi.stubEnv("POSTIZ_BASE_URL", "");
    vi.stubEnv("POSTIZ_API_KEY", "");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    const app = express();
    registerPostizRoutes(app);
    const route = app._router?.stack.find((layer: any) => layer.route?.path === "/api/postiz/integrations");
    expect(route).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
});
