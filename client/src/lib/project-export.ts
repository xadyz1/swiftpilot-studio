import JSZip from 'jszip';
import type { SiteProject } from '@shared/studio';
import type { ContentTemplate } from '../data/content';
import { buildCSV, type PlannedPost } from './planner';
import { canvasDimensions, renderStudioCanvas } from './studio-canvas';

function safeFilename(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'post';
}

export async function renderTemplatePNG(
  template: ContentTemplate,
  project: SiteProject,
  format: 'square' | 'vertical',
  slideIndex = 0,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await renderStudioCanvas(canvas, template, {
    brand: project.brand,
    website: project.url,
    format,
    layout: template.layout,
    activeSlideIndex: slideIndex,
    scale: 1,
    customPrimaryColor: template.colorOverrides?.primary,
    customSecondaryColor: template.colorOverrides?.secondary,
    customBackgroundColor: template.colorOverrides?.background,
    customTextColor: template.colorOverrides?.text,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('A post image could not be rendered.')), 'image/png');
  });
}

export async function downloadProjectPack(
  project: SiteProject,
  posts: PlannedPost[],
  contents: ContentTemplate[],
): Promise<void> {
  const instagramPosts = posts.filter(post => post.platform === 'instagram');
  if (!instagramPosts.length) throw new Error('Schedule at least one Instagram post before exporting a content pack.');

  const zip = new JSZip();
  const orderedPosts = instagramPosts.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  zip.file('calendar-schedule.csv', buildCSV(orderedPosts, contents));
  zip.file('README.txt', [
    `${project.name} Instagram content pack`,
    `${orderedPosts.length} scheduled post${orderedPosts.length === 1 ? '' : 's'}.`,
    'Square posts are 1080 x 1080. Vertical 9:16 artwork is 1080 x 1920 and can be adapted for Stories or Reels.',
    'Review every caption, claim, crop and safe area before publishing. Nothing is published automatically.',
  ].join('\n'));

  for (const [index, post] of orderedPosts.entries()) {
    const template = post.content ?? contents.find(item => item.id === post.templateId);
    if (!template) throw new Error(`The scheduled post "${post.templateId}" has no saved content.`);
    const language = post.language ?? template.language ?? 'en';
    const variant = template.variants.instagram;
    const basename = `${post.date}-${String(index + 1).padStart(2, '0')}-${language}-${safeFilename(template.title)}`;
    const slides = Math.max(1, template.slides?.length ?? 0);

    zip.file(`copy/${basename}.txt`, [
      `${template.title} (${language.toUpperCase()})`,
      `Scheduled: ${post.date} at ${post.time}`,
      '',
      variant.caption,
      '',
      variant.hashtags,
      '',
      variant.cta,
      '',
      `Creative notes: ${variant.notes}`,
      ...(template.sourceUrl ? ['', `Source: ${template.sourceUrl}`] : []),
    ].join('\n'));

    for (const [format, folder] of [['square', 'feed-1x1'], ['vertical', 'stories-9x16']] as const) {
      const { width, height } = canvasDimensions(format);
      for (let slide = 0; slide < slides; slide++) {
        const suffix = slides > 1 ? `-slide-${String(slide + 1).padStart(2, '0')}` : '';
        const image = await renderTemplatePNG(template, project, format, slide);
        zip.file(`${folder}/${basename}${suffix}-${width}x${height}.png`, image);
      }
    }
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(archive);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename(project.name)}-instagram-content-pack.zip`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
