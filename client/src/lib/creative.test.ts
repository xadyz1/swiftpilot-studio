import { describe, expect, it, vi } from "vitest";
import { templates } from "../data/content";
import { downloadCreative } from "./creative";

describe("branded creative export", () => {
  it("constrains long headlines and creates a downloadable 1080 × 1920 TikTok cover", async () => {
    const fillText = vi.fn();
    const click = vi.fn();
    const ctx = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText,
      measureText: (s: string) => ({ width: s.length * 36 }),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
      toBlob: (cb: (b: Blob) => void) =>
        cb(new Blob(["PNG"], { type: "image/png" })),
    };
    const link = { href: "", download: "", click };
    class FakeImage {
      width = 2000;
      height = 2000;
      onload: (() => void) | null = null;
      set src(_src: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("document", {
      fonts: { ready: Promise.resolve() },
      createElement: (tag: string) => (tag === "canvas" ? canvas : link),
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const headline = "W".repeat(55);
    await downloadCreative({ ...templates[1], headline }, "tiktok");
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
    expect(fillText).toHaveBeenCalledWith(headline, 66, 1705, 950);
    expect(click).toHaveBeenCalledOnce();
    expect(link.download).toContain("tiktok-1080x1920.png");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
