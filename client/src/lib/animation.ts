import type { ContentTemplate } from '../data/content';
import type { BrandKit } from '@shared/studio';
import { artworkColors, hungryBrand, loadBrandFonts, safeFont, siteDomain } from './brand';
import { downloadableMediaURL } from './media';

export type AnimationStyle = 'soft-fade' | 'slow-zoom' | 'text-rise' | 'cinematic-pan';
export type AnimationFormat = 'square' | 'portrait' | 'vertical' | 'landscape';
export type AnimationOptions = { style: AnimationStyle; duration: 4 | 6 | 8; format: AnimationFormat };

export const animationDimensions: Record<AnimationFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  vertical: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
};

function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be loaded. Choose another asset or upload a local copy.'));
    image.src = source;
  });
}

async function loadBackground(template: ContentTemplate): Promise<HTMLImageElement | HTMLVideoElement | undefined> {
  if (!template.image) return undefined;
  const source = await downloadableMediaURL(template.image);
  if (template.mediaKind === 'video') {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = source;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.onloadeddata = () => resolve(video);
      video.onerror = () => reject(new Error('This video format is not supported by your browser. Use MP4, WebM or an image cover.'));
    });
  }
  return loadImage(source);
}

function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number, progress: number, style: AnimationStyle): void {
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source instanceof HTMLImageElement ? source.naturalWidth : width;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source instanceof HTMLImageElement ? source.naturalHeight : height;
  if (!sourceWidth || !sourceHeight) return;
  const zoom = style === 'slow-zoom' ? 1 + progress * 0.08 : 1;
  const scale = Math.max(width / sourceWidth, height / sourceHeight) * zoom;
  const pan = style === 'cinematic-pan' ? (progress - 0.5) * width * 0.12 : 0;
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(source, (width - drawWidth) / 2 + pan, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawFrame(ctx: CanvasRenderingContext2D, template: ContentTemplate, brand: BrandKit, website: string, background: CanvasImageSource | undefined, width: number, height: number, progress: number, style: AnimationStyle): void {
  const colors = artworkColors(brand, template.tone);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);
  if (background) {
    ctx.save();
    drawCover(ctx, background, width, height, progress, style);
    ctx.fillStyle = `${colors.background}aa`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  ctx.fillStyle = colors.accent;
  ctx.fillRect(66, 66, 100, 10);
  ctx.fillStyle = colors.text;
  ctx.font = `700 46px "${safeFont(brand.headingFont)}", Arial, sans-serif`;
  ctx.fillText(brand.uppercase ? brand.name.toUpperCase() : brand.name, 66, 132, width - 132);
  ctx.font = `500 24px "${safeFont(brand.bodyFont)}", Arial, sans-serif`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(brand.uppercase ? brand.tagline.toUpperCase() : brand.tagline, 66, 178, width - 132);
  ctx.globalAlpha = 1;
  const rise = style === 'text-rise' ? (1 - Math.min(progress * 1.8, 1)) * 70 : 0;
  const fade = style === 'soft-fade' ? Math.min(progress * 3, 1) : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(0, rise);
  let size = width > height ? 78 : width === height ? 92 : 104;
  const headline = brand.uppercase ? template.headline.toUpperCase() : template.headline;
  ctx.font = `700 ${size}px "${safeFont(brand.headingFont)}", Arial, sans-serif`;
  while (ctx.measureText(headline).width > width - 132 && size > 34) {
    size -= 2;
    ctx.font = `700 ${size}px "${safeFont(brand.headingFont)}", Arial, sans-serif`;
  }
  ctx.fillStyle = colors.text;
  ctx.fillText(headline, 66, height - 220, width - 132);
  ctx.restore();
  ctx.fillStyle = colors.accent;
  ctx.fillRect(66, height - 174, 105, 8);
  ctx.fillStyle = colors.text;
  ctx.font = `500 24px "${safeFont(brand.bodyFont)}", Arial, sans-serif`;
  ctx.fillText(template.supportingCopy || brand.tagline, 66, height - 118, width - 132);
  ctx.fillStyle = colors.accent;
  ctx.fillText(template.cta || siteDomain(website), 66, height - 76, width - 132);
}

export async function exportAnimatedWebM(template: ContentTemplate, brand: BrandKit = hungryBrand, website = 'https://hungrypockets.eu/', options: AnimationOptions = { style: 'soft-fade', duration: 6, format: 'vertical' }): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) throw new Error('Animated WebM export is not supported in this browser. Try Chrome, Edge or Firefox.');
  loadBrandFonts(brand);
  await document.fonts.ready;
  const { width, height } = animationDimensions[options.format];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser does not support canvas graphics export.');
  const background = await loadBackground(template);
  const stream = canvas.captureStream(30);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('This browser cannot encode WebM video.');
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve, reject) => { recorder.onstop = () => resolve(); recorder.onerror = () => reject(new Error('The animated export failed. Please try again.')); });
  recorder.start();
  const started = performance.now();
  await new Promise<void>(resolve => {
    const render = (now: number) => {
      const progress = Math.min((now - started) / (options.duration * 1000), 1);
      if (background instanceof HTMLVideoElement && !background.paused) background.currentTime = progress * Math.max(background.duration || options.duration, 0.1);
      drawFrame(ctx, template, brand, website, background, width, height, progress, options.style);
      if (progress < 1) requestAnimationFrame(render); else resolve();
    };
    requestAnimationFrame(render);
  });
  recorder.stop();
  await stopped;
  downloadBlob(new Blob(chunks, { type: mimeType }), `${template.id}-${options.format}-${width}x${height}.webm`);
}

/* --- Ad animations (arbitrary dimensions, layout-rendered frames) --- */

import { renderStudioCanvas, loadMediaAsset, type RenderOptions, type CanvasDimensions } from './studio-canvas';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface AdAnimationOptions {
  dimensions: CanvasDimensions;
  renderOptions: RenderOptions;
  duration: 4 | 6 | 8;
  kind: 'webm' | 'gif';
  filename: string;
}

async function preloadAssets(template: ContentTemplate, brand: BrandKit) {
  const slide = template.slides?.[0];
  const mediaUrl = slide?.image ?? template.image;
  const kind = slide?.mediaKind ?? template.mediaKind ?? 'image';
  const [media, logo] = await Promise.all([
    mediaUrl ? loadMediaAsset(mediaUrl, kind) : Promise.resolve(undefined),
    brand.logo ? loadMediaAsset(brand.logo, 'image') : Promise.resolve(undefined),
  ]);
  return { media, logo };
}

async function drawAdFrame(canvas: HTMLCanvasElement, template: ContentTemplate, opts: AdAnimationOptions, progress: number, assets: { media?: CanvasImageSource; logo?: CanvasImageSource }) {
  await renderStudioCanvas(canvas, template, {
    ...opts.renderOptions,
    format: opts.renderOptions.format ?? (template.aspectRatio as RenderOptions['format']),
    progress,
    preloadedMedia: assets.media,
    preloadedLogo: assets.logo,
  });
}

export async function exportAdAnimation(template: ContentTemplate, brand: BrandKit, opts: AdAnimationOptions): Promise<void> {
  if (typeof document === 'undefined') throw new Error('Animation export is only available in the browser.');
  loadBrandFonts(brand);
  await document.fonts.ready;
  const { width, height } = opts.dimensions;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: opts.kind === 'gif' });
  if (!ctx) throw new Error('Your browser does not support canvas graphics export.');
  const assets = await preloadAssets(template, brand);

  if (opts.kind === 'gif') {
    const fps = 12;
    const frames = Math.max(8, Math.min(fps * opts.duration, 72));
    const gif = GIFEncoder();
    for (let i = 0; i < frames; i++) {
      await drawAdFrame(canvas, template, opts, i / (frames - 1), assets);
      const { data } = ctx.getImageData(0, 0, width, height);
      const palette = quantize(data, 256);
      gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay: Math.round(1000 / fps) });
    }
    gif.finish();
    const bytes = gif.bytes();
    const buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(bytes);
    downloadBlob(new Blob([buffer], { type: 'image/gif' }), `${opts.filename}.gif`);
    return;
  }

  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Animated WebM export is not supported in this browser. Try Chrome, Edge or Firefox.');
  }
  const stream = canvas.captureStream(30);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('This browser cannot encode WebM video.');
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve, reject) => { recorder.onstop = () => resolve(); recorder.onerror = () => reject(new Error('The animated export failed. Please try again.')); });
  recorder.start();
  const started = performance.now();
  await new Promise<void>(resolve => {
    const render = async (now: number) => {
      const progress = Math.min((now - started) / (opts.duration * 1000), 1);
      await drawAdFrame(canvas, template, opts, progress, assets);
      if (progress < 1) requestAnimationFrame(render); else resolve();
    };
    requestAnimationFrame(render);
  });
  recorder.stop();
  await stopped;
  downloadBlob(new Blob(chunks, { type: mimeType }), `${opts.filename}.webm`);
}
