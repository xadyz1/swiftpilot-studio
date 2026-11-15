import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { initialStudio } from './studio';
import { downloadProjectPack } from './project-export';
import { renderStudioCanvas } from './studio-canvas';

vi.mock('./studio-canvas', () => ({
  canvasDimensions: (format: string) => format === 'square'
    ? { width: 1080, height: 1080, label: 'Square', ratio: '1 / 1' }
    : { width: 1080, height: 1920, label: 'Vertical', ratio: '9 / 16' },
  renderStudioCanvas: vi.fn(async (canvas: HTMLCanvasElement) => {
    canvas.width = 1080;
    canvas.height = 1920;
  }),
}));

describe('project content pack export', () => {
  it('includes scheduled copy and square plus vertical Story artwork', async () => {
    const project = initialStudio().projects.find(item => item.id === 'goldencreative')!;
    const originalPost = project.planner.posts[0];
    const post = {
      ...originalPost,
      content: { ...originalPost.content!, colorOverrides: { primary: '#123456', background: '#ffffff' } },
    };
    let archiveBlob: Blob | undefined;
    const link = { href: '', download: '', click: vi.fn() };
    vi.stubGlobal('document', {
      createElement: (tag: string) => tag === 'canvas'
        ? { width: 0, height: 0, toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['PNG'])) }
        : link,
    });
    vi.stubGlobal('window', { setTimeout: vi.fn() });
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      archiveBlob = blob as Blob;
      return 'blob:content-pack';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await downloadProjectPack(project, [post], project.templates);
    const archive = await JSZip.loadAsync(archiveBlob!);
    const filenames = Object.keys(archive.files);

    expect(link.download).toBe('golden-creative-instagram-content-pack.zip');
    expect(filenames).toContain('calendar-schedule.csv');
    expect(filenames.some(name => name.startsWith('copy/'))).toBe(true);
    expect(filenames.some(name => name.startsWith('feed-1x1/') && name.endsWith('1080x1080.png'))).toBe(true);
    expect(filenames.some(name => name.startsWith('stories-9x16/') && name.endsWith('1080x1920.png'))).toBe(true);
    const csv = await archive.file('calendar-schedule.csv')!.async('string');
    expect(csv).toContain('pt');
    expect(vi.mocked(renderStudioCanvas).mock.calls[0][2]).toMatchObject({
      customPrimaryColor: '#123456',
      customBackgroundColor: '#ffffff',
    });
    expect(link.click).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
