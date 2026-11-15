import { describe, expect, it, vi } from 'vitest';
import { initialStudio, loadStudio, saveProjectTemplate, STUDIO_KEY } from './studio';

describe('saved workspace campaign migration', () => {
  it('adds newly seeded projects and campaigns without replacing a saved brand kit', () => {
    const saved = initialStudio();
    const goldenCreative = saved.projects.find(project => project.id === 'goldencreative')!;
    const lojaPilot = saved.projects.find(project => project.id === 'lojapilot')!;
    saved.projects = saved.projects.filter(project => project.id !== 'goldencreative');
    lojaPilot.brandEdited = true;
    lojaPilot.brand.name = 'My LojaPilot brand';
    lojaPilot.sources = [];
    lojaPilot.media = [];
    const savedTemplate = { ...lojaPilot.templates[0], id: 'my-lojapilot-post', title: 'Saved post' };
    lojaPilot.templates = [savedTemplate];
    lojaPilot.planner.posts = [{
      id: 'saved-post',
      templateId: savedTemplate.id,
      platform: 'instagram',
      date: '2026-11-16',
      time: '18:00',
      status: 'draft',
      content: savedTemplate,
    }];

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === STUDIO_KEY ? JSON.stringify(saved) : null,
    });
    const migrated = loadStudio();
    const migratedLojaPilot = migrated.projects.find(project => project.id === 'lojapilot')!;
    const migratedGoldenCreative = migrated.projects.find(project => project.id === goldenCreative.id);

    expect(migratedGoldenCreative?.planner.posts).toHaveLength(8);
    expect(migratedLojaPilot.brand.name).toBe('My LojaPilot brand');
    expect(migratedLojaPilot.sources[0].text).toContain('WooCommerce');
    expect(migratedLojaPilot.planner.posts.some(post => post.id === 'saved-post')).toBe(true);
    expect(migratedLojaPilot.planner.posts.filter(post => post.id.startsWith('starter-lojapilot-'))).toHaveLength(8);
    vi.unstubAllGlobals();
  });

  it('keeps visual edits in the library and every matching planned post', () => {
    const project = initialStudio().projects.find(item => item.id === 'swiftcal')!;
    const post = project.planner.posts[0];
    const edited = {
      ...post.content!,
      headline: 'Edited in Visual Studio',
      colorOverrides: { primary: '#123456' },
    };

    const saved = saveProjectTemplate(project, edited);

    expect(saved.templates.find(item => item.id === edited.id)?.headline).toBe('Edited in Visual Studio');
    expect(saved.planner.edits[edited.id]).toEqual(edited);
    expect(saved.planner.posts.find(item => item.id === post.id)?.content).toEqual(edited);
  });
});
