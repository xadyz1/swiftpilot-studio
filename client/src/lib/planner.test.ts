import { describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { templates } from "../data/content";
import {
  dateKey,
  parseDate,
  seedPlanner,
  loadPlanner,
  savePlanner,
  STORAGE_KEY,
  exportCSV,
} from "./planner";

describe("ready-made post library", () => {
  it("contains 16 unique, complete, real-image templates with shop CTAs", () => {
    expect(templates).toHaveLength(24);
    expect(new Set(templates.map(t => t.id)).size).toBe(24);
    for (const t of templates) {
      expect(existsSync(`client/public${t.image}`)).toBe(true);
      expect(t.platforms.length).toBeGreaterThan(0);
      for (const platform of t.platforms) {
        const v = t.variants[platform];
        expect(v.caption.length).toBeGreaterThan(30);
        expect(v.hashtags).toContain("#HungryPockets");
        expect(v.cta).toContain("hungrypockets.eu");
        expect(v.notes.length).toBeGreaterThan(20);
      }
    }
  });
});
describe("calendar dates and storage", () => {
  it("creates 12 valid suggestions with supported channels and no fake published posts", () => {
    const state = seedPlanner(new Date(2026, 10, 6));
    expect(state.posts).toHaveLength(12);
    expect(state.posts.filter(p => p.status === "scheduled")).toHaveLength(8);
    for (const p of state.posts) {
      const template = templates.find(t => t.id === p.templateId)!;
      expect(template.platforms).toContain(p.platform);
      expect(p.date).toMatch(/^2026-11-/);
      expect(p.status).not.toBe("published");
    }
  });
  it("keeps local dates round-trippable across year boundaries", () => {
    for (const key of ["2026-01-01", "2026-12-31", "2028-02-29"])
      expect(dateKey(parseDate(key))).toBe(key);
  });
  it("persists edits and rescheduling and gracefully handles unavailable storage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
    const state = seedPlanner();
    state.posts[0].date = "2027-01-01";
    state.edits[templates[0].id] = { ...templates[0], title: "My edited post" };
    expect(savePlanner(state)).toBe(true);
    expect(loadPlanner()).toEqual(state);
    store.set(STORAGE_KEY, "{invalid-json");
    expect(loadPlanner().posts).toHaveLength(12);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Blocked");
      },
      setItem: () => {
        throw new Error("Blocked");
      },
    });
    expect(savePlanner(state)).toBe(false);
    expect(loadPlanner().posts).toHaveLength(12);
    vi.unstubAllGlobals();
  });
  it("upgrades old unsupported platforms while preserving dates and caption edits", () => {
    const state = seedPlanner();
    const oldPost = state.posts[7];
    delete oldPost.content;
    oldPost.platform = "tiktok";
    state.edits["stay-hungry"] = {
      ...templates.find(t => t.id === "stay-hungry")!,
      title: "My original edit",
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(state) });
    const loaded = loadPlanner().posts[7];
    expect(loaded.platform).toBe("instagram");
    expect(loaded.date).toBe(oldPost.date);
    expect(loaded.content?.title).toBe("My original edit");
    vi.unstubAllGlobals();
  });
  it("exports editable captions and escapes spreadsheet formulas", async () => {
    const clicked = vi.fn();
    const link = { href: "", download: "", click: clicked };
    let blob: Blob | undefined;
    vi.stubGlobal("document", { createElement: () => link });
    vi.spyOn(URL, "createObjectURL").mockImplementation(value => {
      blob = value as Blob;
      return "blob:test";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const t = { ...templates[0], title: "=dangerousFormula" };
    exportCSV([{ ...seedPlanner().posts[0], content: t }], [templates[0]]);
    expect(clicked).toHaveBeenCalledOnce();
    expect(link.download).toMatch(/calendar\.csv$/);
    const csv = await blob!.text();
    expect(csv).toContain("'=dangerousFormula");
    expect(csv).toContain("hungrypockets.eu");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
