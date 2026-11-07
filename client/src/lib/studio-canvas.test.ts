import { describe, expect, it, vi } from 'vitest';
import {
  FORMAT_DIMENSIONS,
  createBlankTemplate,
  cloneTemplate,
  renderStudioCanvas,
} from './studio-canvas';
import { initialStudio } from './studio';

describe('studio-canvas engine', () => {
  const studio = initialStudio();
  const project = studio.projects[0];

  it('defines all social media aspect ratio formats and dimensions', () => {
    expect(FORMAT_DIMENSIONS.square).toEqual({ width: 1080, height: 1080, label: 'Square (1:1)', ratio: '1 / 1' });
    expect(FORMAT_DIMENSIONS.portrait).toEqual({ width: 1080, height: 1350, label: 'Portrait (4:5)', ratio: '4 / 5' });
    expect(FORMAT_DIMENSIONS.vertical).toEqual({ width: 1080, height: 1920, label: 'Story / Reel (9:16)', ratio: '9 / 16' });
    expect(FORMAT_DIMENSIONS.landscape).toEqual({ width: 1920, height: 1080, label: 'Landscape (16:9)', ratio: '16 / 9' });
  });

  it('creates a brand-new blank post template grounded in project identity', () => {
    const template = createBlankTemplate(project);
    expect(template.id).toBeDefined();
    expect(template.title).toBe('New Post Design');
    expect(template.layout).toBe('bold-editorial');
    expect(template.aspectRatio).toBe('square');
    expect(template.variants.instagram).toBeDefined();
    expect(template.variants.tiktok).toBeDefined();
    expect(template.variants.instagram.caption).toContain(project.name);
  });

  it('clones an existing template with a new id and marked title', () => {
    const original = createBlankTemplate(project);
    const clone = cloneTemplate(original);
    expect(clone.id).not.toBe(original.id);
    expect(clone.title).toBe('New Post Design (Copy)');
    expect(clone.headline).toBe(original.headline);
  });

  it('renders bold-editorial, cinematic-bleed, and other layouts to canvas without error', async () => {
    const fillRect = vi.fn();
    const fillText = vi.fn();
    const drawImage = vi.fn();
    const ctx = {
      fillRect,
      fillText,
      drawImage,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
      rect: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
      measureText: (s: string) => ({ width: s.length * 10 }),
    };

    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;

    const template = createBlankTemplate(project);

    // Test square 1x
    await renderStudioCanvas(canvas, template, {
      brand: project.brand,
      website: project.url,
      format: 'square',
      layout: 'bold-editorial',
      scale: 1,
    });
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
    expect(fillRect).toHaveBeenCalled();

    // Test vertical 2x Retina
    await renderStudioCanvas(canvas, template, {
      brand: project.brand,
      website: project.url,
      format: 'vertical',
      layout: 'cinematic-bleed',
      scale: 2,
    });
    expect(canvas.width).toBe(2160);
    expect(canvas.height).toBe(3840);

    // Test landscape 1x
    await renderStudioCanvas(canvas, template, {
      brand: project.brand,
      website: project.url,
      format: 'landscape',
      layout: 'split-card',
      scale: 1,
    });
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);

    // Test quote manifesto
    await renderStudioCanvas(canvas, template, {
      brand: project.brand,
      website: project.url,
      format: 'square',
      layout: 'quote-manifesto',
      scale: 1,
    });
    expect(fillText).toHaveBeenCalled();
  });
});
