import type {
  ContentTemplate,
  AspectRatioFormat,
  VisualLayout,
  CarouselSlide,
  HeadlineSize,
  LogoSize,
  LogoPosition,
  ContentDensity,
} from '../data/content';
import type { BrandKit, MediaAsset, SiteProject } from '@shared/studio';
import { artworkColors, hungryBrand, loadBrandFonts, safeFont, siteDomain } from './brand';
import { downloadableMediaURL } from './media';

export type CanvasDimensions = { width: number; height: number; label: string; ratio: string };

export const FORMAT_DIMENSIONS: Record<string, CanvasDimensions> = {
  square: { width: 1080, height: 1080, label: 'Square (1:1)', ratio: '1 / 1' },
  portrait: { width: 1080, height: 1350, label: 'Portrait (4:5)', ratio: '4 / 5' },
  vertical: { width: 1080, height: 1920, label: 'Story / Reel (9:16)', ratio: '9 / 16' },
  landscape: { width: 1920, height: 1080, label: 'Landscape (16:9)', ratio: '16 / 9' },
};

export const SOCIAL_FORMATS: AspectRatioFormat[] = ['square', 'portrait', 'vertical', 'landscape'];

export const AD_DIMENSIONS: Record<string, CanvasDimensions> = {
  leaderboard: { width: 728, height: 90, label: 'Leaderboard', ratio: '728 × 90' },
  billboard: { width: 970, height: 250, label: 'Billboard', ratio: '970 × 250' },
  'large-rectangle': { width: 336, height: 280, label: 'Large Rectangle', ratio: '336 × 280' },
  'medium-rectangle': { width: 300, height: 250, label: 'Medium Rectangle', ratio: '300 × 250' },
  'half-page': { width: 300, height: 600, label: 'Half Page', ratio: '300 × 600' },
  skyscraper: { width: 160, height: 600, label: 'Wide Skyscraper', ratio: '160 × 600' },
  'mobile-banner': { width: 320, height: 50, label: 'Mobile Banner', ratio: '320 × 50' },
};
export const AD_FORMATS: AspectRatioFormat[] = Object.keys(AD_DIMENSIONS) as AspectRatioFormat[];
export const isAdFormat = (format?: string): boolean => !!format && format in AD_DIMENSIONS;
export const canvasDimensions = (format?: string): CanvasDimensions =>
  (format && AD_DIMENSIONS[format]) || (format && FORMAT_DIMENSIONS[format]) || FORMAT_DIMENSIONS.square;

export interface RenderOptions {
  brand?: BrandKit;
  website?: string;
  format?: AspectRatioFormat;
  layout?: VisualLayout;
  scale?: number; // 1 = 1080p standard, 2 = 2160p Retina
  activeSlideIndex?: number;
  customHeadingFont?: string;
  customBodyFont?: string;
  customPrimaryColor?: string;
  customSecondaryColor?: string;
  customBackgroundColor?: string;
  customTextColor?: string;
  overlayOpacity?: number; // 0 to 100
  textAlign?: 'left' | 'center' | 'right';
  badge?: string;
  showLogo?: boolean;
  logoPosition?: LogoPosition;
  logoSize?: LogoSize;
  headlineFontSize?: HeadlineSize;
  headlineUppercase?: boolean;
  contentPadding?: ContentDensity;
  /** 0–1 animation progress; used by ad/animation exporters. */
  progress?: number;
  /** Skip per-render media decoding when frames are preloaded once. */
  preloadedMedia?: CanvasImageSource;
  preloadedLogo?: CanvasImageSource;
}

export function createBlankTemplate(project: SiteProject): ContentTemplate {
  const id = crypto.randomUUID();
  const domain = siteDomain(project.url);
  const isVideo = project.media[0]?.kind === 'video';
  const defaultMedia = project.media[0]?.url ?? '';

  return {
    id,
    title: 'New Post Design',
    headline: project.brand.tagline || 'MAKE YOUR STATEMENT',
    eyebrow: project.name.toUpperCase(),
    supportingCopy: project.description.slice(0, 160) || 'Crafted with intention. Grounded in brand identity.',
    cta: `Explore ${domain}`,
    badge: 'NEW DROP',
    campaign: 'Brand Spotlight',
    theme: 'Design & Culture',
    format: 'Image',
    platforms: ['instagram', 'tiktok'],
    image: defaultMedia,
    mediaKind: isVideo ? 'video' : 'image',
    tone: 'mint',
    layout: 'bold-editorial',
    aspectRatio: 'square',
    textAlign: 'left',
    overlayOpacity: 40,
    showLogo: true,
    logoPosition: 'top-left',
    variants: {
      instagram: {
        caption: `Discover ${project.name}. ${project.description.slice(0, 200)}`,
        hashtags: `#${project.name.replace(/[^a-zA-Z0-9]/g, '')} #SocialStudio #BrandIdentity`,
        cta: `Tap the link in bio to explore ${domain}.`,
        notes: 'Shot in natural light or studio backdrop. Review headline hierarchy before final export.',
      },
      tiktok: {
        caption: `Meet ${project.name}. Built for the momentum.`,
        hashtags: `#${project.name.replace(/[^a-zA-Z0-9]/g, '')} #BehindTheScenes`,
        cta: `Discover more at ${domain}.`,
        notes: 'Vertical frame cut for quick impact. Sync cuts with beat.',
      },
    },
  };
}

export function cloneTemplate(template: ContentTemplate): ContentTemplate {
  return {
    ...JSON.parse(JSON.stringify(template)),
    id: crypto.randomUUID(),
    title: `${template.title} (Copy)`,
  };
}

export async function loadImage(source: string): Promise<HTMLImageElement> {
  const src = await downloadableMediaURL(source);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => reject(new Error('Image took too long to load.')), 15000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Image could not be loaded.')); };
    img.src = src;
  });
}

export async function loadVideoFrame(source: string): Promise<HTMLVideoElement> {
  const src = await downloadableMediaURL(source);
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const timer = setTimeout(() => reject(new Error('Could not extract video cover frame.')), 15000);
    video.onloadeddata = () => {
      if (video.duration > 0.5) {
        video.currentTime = Math.min(1, video.duration / 2);
      } else {
        clearTimeout(timer);
        resolve(video);
      }
    };
    video.onseeked = () => { clearTimeout(timer); resolve(video); };
    video.onerror = () => { clearTimeout(timer); reject(new Error('Video format could not be played.')); };
    video.src = src;
  });
}

export async function loadMediaAsset(url?: string, kind?: 'image' | 'video'): Promise<HTMLImageElement | HTMLVideoElement | undefined> {
  if (!url) return undefined;
  try {
    if (kind === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
      return await loadVideoFrame(url);
    }
    return await loadImage(url);
  } catch {
    return undefined;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function renderStudioCanvas(
  canvas: HTMLCanvasElement,
  template: ContentTemplate,
  options: RenderOptions = {}
): Promise<void> {
  const brand = options.brand ?? hungryBrand;
  const website = options.website ?? 'https://hungrypockets.eu/';
  const formatKey: AspectRatioFormat = (options.format ?? template.aspectRatio ?? (template.format === 'Video' ? 'vertical' : 'square')) as AspectRatioFormat;
  const baseDim = canvasDimensions(formatKey);
  const scale = options.scale ?? 1;

  const width = baseDim.width * scale;
  const height = baseDim.height * scale;
  canvas.width = width;
  canvas.height = height;

  const rawCtx = canvas.getContext('2d');
  if (!rawCtx) throw new Error('Canvas 2D context not available.');
  const ctx: CanvasRenderingContext2D = rawCtx;

  // Preload brand fonts
  loadBrandFonts(brand);
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Active slide determination
  const slides = template.slides ?? [];
  const activeSlide: CarouselSlide | undefined =
    template.format === 'Carousel' && slides.length > 0 && typeof options.activeSlideIndex === 'number'
      ? slides[options.activeSlideIndex]
      : undefined;

  const headline = activeSlide?.headline ?? template.headline ?? '';
  const eyebrow = template.eyebrow ?? brand.name;
  const supportingCopy = activeSlide?.supportingCopy ?? template.supportingCopy ?? template.variants.instagram?.caption ?? '';
  const cta = activeSlide?.cta ?? template.cta ?? template.variants.instagram?.cta ?? 'Learn More';
  const badgeText = activeSlide?.badge ?? options.badge ?? template.badge ?? '';

  const mediaUrl = activeSlide?.image ?? template.image;
  const mediaKind = activeSlide?.mediaKind ?? template.mediaKind ?? 'image';

  // Layout choice
  const layout: VisualLayout = options.layout ?? template.layout ?? 'bold-editorial';

  // Fonts
  const headingFont = safeFont(options.customHeadingFont ?? template.headingFont ?? brand.headingFont);
  const bodyFont = safeFont(options.customBodyFont ?? template.bodyFont ?? brand.bodyFont);

  // Colors
  const rawTone = artworkColors(brand, template.tone);
  const primaryColor = options.customPrimaryColor ?? brand.primary;
  const secondaryColor = options.customSecondaryColor ?? brand.secondary;
  const bgColor = options.customBackgroundColor ?? rawTone.background;
  const textColor = options.customTextColor ?? rawTone.text;
  const overlayOpacity = (options.overlayOpacity ?? template.overlayOpacity ?? 40) / 100;
  const textAlign = options.textAlign ?? template.textAlign ?? 'left';
  const showLogo = options.showLogo ?? template.showLogo ?? true;

  const selectedLogoPosition: LogoPosition = options.logoPosition ?? template.logoPosition ?? 'top-left';
  const selectedLogoSize: LogoSize = options.logoSize ?? template.logoSize ?? 'medium';

  const headlineScaleMap: Record<HeadlineSize, number> = {
    small: 0.75,
    medium: 1.0,
    large: 1.25,
    hero: 1.5,
    display: 1.85,
  };
  const headlineMultiplier = headlineScaleMap[options.headlineFontSize ?? template.headlineFontSize ?? 'medium'] ?? 1.0;

  const isUppercase = options.headlineUppercase !== undefined
    ? options.headlineUppercase
    : (template.headlineUppercase !== undefined ? template.headlineUppercase : brand.uppercase);

  const formatHeadline = (val: string) => (isUppercase ? val.toUpperCase() : val);
  const formatText = (val: string) => (brand.uppercase ? val.toUpperCase() : val);

  const density: ContentDensity = options.contentPadding ?? template.contentPadding ?? 'normal';
  const densityMultiplier = density === 'compact' ? 0.7 : density === 'spacious' ? 1.35 : 1.0;
  const baseMargin = Math.round(66 * scale * densityMultiplier);

  // Load media & logo
  const [mediaElement, logoElement] = await Promise.all([
    options.preloadedMedia !== undefined ? Promise.resolve(options.preloadedMedia)
      : mediaUrl ? loadMediaAsset(mediaUrl, mediaKind) : Promise.resolve(undefined),
    options.preloadedLogo !== undefined ? Promise.resolve(options.preloadedLogo)
      : brand.logo && showLogo ? loadMediaAsset(brand.logo, 'image') : Promise.resolve(undefined),
  ]);

  const effectiveLogoPosition: LogoPosition = selectedLogoPosition;
  const effectiveLogoSize: LogoSize = selectedLogoSize;

  // Base background fill
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Ad formats use a dedicated ratio-aware composition; social presets
  // are tuned for near-square canvases and break at banner ratios.
  if (isAdFormat(formatKey)) {
    renderAdBannerLayout();
    return;
  }

  // Render according to selected layout
  switch (layout) {
    case 'cinematic-bleed':
      renderCinematicBleedLayout();
      break;
    case 'framed-minimal':
      renderFramedMinimalLayout();
      break;
    case 'split-card':
      renderSplitCardLayout();
      break;
    case 'product-spotlight':
      renderProductSpotlightLayout();
      break;
    case 'quote-manifesto':
      renderQuoteManifestoLayout();
      break;
    case 'bold-editorial':
    default:
      renderBoldEditorialLayout();
      break;
  }

  // --- Sub-renderers ---

  function drawMediaCover(x: number, y: number, w: number, h: number, el?: CanvasImageSource) {
    if (!el) return;
    const iw = el instanceof HTMLVideoElement ? el.videoWidth : (el as HTMLImageElement).width;
    const ih = el instanceof HTMLVideoElement ? el.videoHeight : (el as HTMLImageElement).height;
    if (!iw || !ih) return;

    const s = Math.max(w / iw, h / ih);
    const sw = iw * s;
    const sh = ih * s;
    const sx = x + (w - sw) / 2;
    const sy = y + (h - sh) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(el, sx, sy, sw, sh);
    ctx.restore();
  }

  function drawMediaContain(x: number, y: number, w: number, h: number, el?: CanvasImageSource) {
    if (!el) return;
    const iw = el instanceof HTMLVideoElement ? el.videoWidth : (el as HTMLImageElement).width;
    const ih = el instanceof HTMLVideoElement ? el.videoHeight : (el as HTMLImageElement).height;
    if (!iw || !ih) return;

    const s = Math.min(w / iw, h / ih);
    const sw = iw * s;
    const sh = ih * s;
    const sx = x + (w - sw) / 2;
    const sy = y + (h - sh) / 2;

    ctx.drawImage(el, sx, sy, sw, sh);
  }

  function drawLogo(x: number, y: number, maxW: number, maxH: number) {
    if (!logoElement || !showLogo || effectiveLogoPosition === 'hidden') return;
    const iw = (logoElement as HTMLImageElement).width;
    const ih = (logoElement as HTMLImageElement).height;
    if (!iw || !ih) return;

    let targetMaxW = maxW;
    let targetMaxH = maxH;
    if (effectiveLogoSize === 'small') { targetMaxW = 160 * scale; targetMaxH = 50 * scale; }
    else if (effectiveLogoSize === 'medium') { targetMaxW = 260 * scale; targetMaxH = 75 * scale; }
    else if (effectiveLogoSize === 'large') { targetMaxW = 360 * scale; targetMaxH = 105 * scale; }
    else if (effectiveLogoSize === 'xlarge') { targetMaxW = 480 * scale; targetMaxH = 140 * scale; }

    const s = Math.min(targetMaxW / iw, targetMaxH / ih);
    const lw = iw * s;
    const lh = ih * s;

    let drawX = x;
    let drawY = y;
    const topY = 55 * scale;
    const botY = height - baseMargin - lh;

    if (effectiveLogoPosition === 'top-left') {
      drawX = baseMargin; drawY = topY;
    } else if (effectiveLogoPosition === 'top-center') {
      drawX = (width - lw) / 2; drawY = topY;
    } else if (effectiveLogoPosition === 'top-right') {
      drawX = width - baseMargin - lw; drawY = topY;
    } else if (effectiveLogoPosition === 'bottom-left') {
      drawX = baseMargin; drawY = botY;
    } else if (effectiveLogoPosition === 'bottom-right') {
      drawX = width - baseMargin - lw; drawY = botY;
    } else if (effectiveLogoPosition === 'bottom') {
      drawX = (width - lw) / 2; drawY = botY;
    }

    ctx.save();
    if (brand.logo === '/brand/logo.png' && bgColor.toLowerCase() === '#ffffff') {
      ctx.filter = 'brightness(0)';
    }
    ctx.drawImage(logoElement, drawX, drawY, lw, lh);
    ctx.filter = 'none';
    ctx.restore();
  }

  function drawPillBadge(x: number, y: number, text: string, bg: string, color: string) {
    if (!text) return;
    ctx.save();
    ctx.font = `700 ${18 * scale}px "${safeFont(bodyFont)}", sans-serif`;
    const label = text.toUpperCase();
    const tw = ctx.measureText(label).width;
    const px = 20 * scale;
    const py = 10 * scale;
    const bw = tw + px * 2;
    const bh = 24 * scale + py * 2;
    const r = bh / 2;

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, r);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + px, y + bh / 2);
    ctx.restore();
  }

  // 1. BOLD EDITORIAL (Signature streetwear layout)
  function renderBoldEditorialLayout() {
    // Top colored accent rule
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, width, 18 * scale);

    // Media container
    const margin = baseMargin;
    const topOffset = 180 * scale;
    const bottomBar = 320 * scale;
    const mediaH = height - topOffset - bottomBar;
    const mediaW = width - margin * 2;

    if (mediaElement) {
      drawMediaContain(margin, topOffset, mediaW, mediaH, mediaElement);
    } else {
      // Geometric accent fallback
      ctx.fillStyle = `${primaryColor}15`;
      ctx.fillRect(margin, topOffset, mediaW, mediaH);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(margin, topOffset, mediaW, mediaH);
    }

    // Top Header: Logo or Brand Name
    const logoX = margin;
    const logoY = 50 * scale;
    if (logoElement && showLogo && effectiveLogoPosition !== 'hidden') {
      drawLogo(logoX, logoY, 320 * scale, 75 * scale);
    } else {
      ctx.fillStyle = textColor;
      ctx.font = `700 ${44 * scale}px "${headingFont}", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(formatText(brand.name), logoX, logoY + 45 * scale);
    }

    // Top Eyebrow / Tagline
    ctx.fillStyle = `${textColor}aa`;
    ctx.font = `600 ${20 * scale}px "${bodyFont}", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(formatText(eyebrow || brand.tagline), width - margin, logoY + 45 * scale);

    // Separator line
    ctx.strokeStyle = `${primaryColor}66`;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(margin, topOffset - 25 * scale);
    ctx.lineTo(width - margin, topOffset - 25 * scale);
    ctx.stroke();

    // Bottom Content Area
    const bottomY = height - bottomBar + 35 * scale;

    // Accent line next to headline
    ctx.fillStyle = primaryColor;
    ctx.fillRect(margin, bottomY, 90 * scale, 8 * scale);

    // Headline
    const headlineY = bottomY + 50 * scale;
    let fontSize = Math.round(72 * scale * headlineMultiplier);
    ctx.font = `700 ${fontSize}px "${headingFont}", sans-serif`;
    const hText = formatHeadline(headline);
    while (ctx.measureText(hText).width > width - margin * 2 && fontSize > 28 * scale) {
      fontSize -= 4 * scale;
      ctx.font = `700 ${fontSize}px "${headingFont}", sans-serif`;
    }
    ctx.fillStyle = textColor;
    ctx.textAlign = textAlign;
    const hx = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - margin : margin;
    ctx.fillText(hText, hx, headlineY, width - margin * 2);

    // Supporting copy
    ctx.fillStyle = `${textColor}dd`;
    ctx.font = `500 ${24 * scale}px "${bodyFont}", sans-serif`;
    ctx.textAlign = textAlign;
    const copyY = headlineY + 55 * scale;
    const copyLines = wrapText(ctx, formatText(supportingCopy), width - margin * 2);
    if (copyLines[0]) ctx.fillText(copyLines[0], hx, copyY, width - margin * 2);

    // Footer bar: domain on left, CTA on right
    const footerY = height - 45 * scale;
    ctx.fillStyle = `${textColor}99`;
    ctx.font = `600 ${22 * scale}px "${bodyFont}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(siteDomain(website), margin, footerY);

    if (cta) {
      ctx.fillStyle = primaryColor;
      ctx.textAlign = 'right';
      ctx.font = `700 ${22 * scale}px "${bodyFont}", sans-serif`;
      ctx.fillText(formatText(cta), width - margin, footerY);
    }
  }

  // 2. CINEMATIC BLEED (Edge-to-edge media, dark gradient scrim, crisp typography)
  function renderCinematicBleedLayout() {
    const margin = Math.round(70 * scale * densityMultiplier);

    if (mediaElement) {
      drawMediaCover(0, 0, width, height, mediaElement);
    } else {
      // Stylish deep gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, '#0b0f17');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Darkening Overlay Scrim
    const scrim = ctx.createLinearGradient(0, 0, 0, height);
    scrim.addColorStop(0, `rgba(0,0,0,${Math.min(0.7, overlayOpacity * 0.7)})`);
    scrim.addColorStop(0.4, `rgba(0,0,0,${overlayOpacity * 0.4})`);
    scrim.addColorStop(0.7, `rgba(0,0,0,${Math.min(0.9, overlayOpacity * 1.3)})`);
    scrim.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, width, height);

    // Top Bar: Logo & Badge
    const topY = 60 * scale;
    if (logoElement && showLogo && effectiveLogoPosition !== 'hidden') {
      drawLogo(margin, topY, 260 * scale, 65 * scale);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${36 * scale}px "${headingFont}", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(formatText(brand.name), margin, topY + 40 * scale);
    }

    if (badgeText) {
      drawPillBadge(width - margin - 180 * scale, topY, badgeText, primaryColor, '#ffffff');
    }

    // Lower-third Content
    const contentY = height - 360 * scale;

    // Eyebrow
    ctx.fillStyle = primaryColor;
    ctx.font = `700 ${22 * scale}px "${bodyFont}", sans-serif`;
    ctx.textAlign = textAlign;
    const cx = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - margin : margin;
    ctx.fillText(formatText(eyebrow || brand.tagline), cx, contentY);

    // Headline
    let hSize = Math.round(78 * scale * headlineMultiplier);
    ctx.font = `800 ${hSize}px "${headingFont}", sans-serif`;
    const hText = formatHeadline(headline);
    while (ctx.measureText(hText).width > width - margin * 2 && hSize > 32 * scale) {
      hSize -= 4 * scale;
      ctx.font = `800 ${hSize}px "${headingFont}", sans-serif`;
    }
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = textAlign;
    ctx.fillText(hText, cx, contentY + 68 * scale, width - margin * 2);

    // Supporting Copy
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `500 ${26 * scale}px "${bodyFont}", sans-serif`;
    const lines = wrapText(ctx, formatText(supportingCopy), width - margin * 2);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, cx, contentY + 130 * scale + i * 36 * scale, width - margin * 2);
    });

    // CTA Button
    if (cta) {
      const btnY = height - 100 * scale;
      const btnText = formatText(cta);
      ctx.font = `700 ${22 * scale}px "${bodyFont}", sans-serif`;
      const btw = ctx.measureText(btnText).width;
      const bw = btw + 50 * scale;
      const bh = 56 * scale;
      const bx = textAlign === 'center' ? (width - bw) / 2 : textAlign === 'right' ? width - margin - bw : margin;

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(bx, btnY, bw, bh, 10 * scale);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(btnText, bx + bw / 2, btnY + bh / 2 + 8 * scale);
    }
  }

  // 3. FRAMED MINIMAL (Refined editorial frame, whitespace, centered photo)
  function renderFramedMinimalLayout() {
    const framePadding = Math.round(50 * scale * densityMultiplier);
    const borderPadding = 20 * scale;

    // Outer subtle border
    ctx.strokeStyle = `${textColor}22`;
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(borderPadding, borderPadding, width - borderPadding * 2, height - borderPadding * 2);

    // Header
    const topY = framePadding + 40 * scale;
    if (logoElement && showLogo && effectiveLogoPosition !== 'hidden') {
      drawLogo((width - 240 * scale) / 2, topY, 240 * scale, 60 * scale);
    } else {
      ctx.fillStyle = textColor;
      ctx.font = `700 ${36 * scale}px "${headingFont}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(formatText(brand.name), width / 2, topY + 36 * scale);
    }

    // Media Frame
    const mediaTop = topY + 110 * scale;
    const mediaBottom = height - 280 * scale;
    const mediaH = mediaBottom - mediaTop;
    const mediaW = width - framePadding * 2 - 40 * scale;
    const mediaX = (width - mediaW) / 2;

    if (mediaElement) {
      // Subtle background container
      ctx.fillStyle = `${textColor}08`;
      ctx.fillRect(mediaX, mediaTop, mediaW, mediaH);
      drawMediaContain(mediaX + 20 * scale, mediaTop + 20 * scale, mediaW - 40 * scale, mediaH - 40 * scale, mediaElement);
    }

    // Bottom Typography
    const bottomY = height - 200 * scale;

    ctx.fillStyle = primaryColor;
    ctx.font = `600 ${20 * scale}px "${bodyFont}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(formatText(eyebrow || brand.tagline), width / 2, bottomY);

    let hSize = Math.round(58 * scale * headlineMultiplier);
    ctx.font = `700 ${hSize}px "${headingFont}", sans-serif`;
    const hText = formatHeadline(headline);
    while (ctx.measureText(hText).width > width - framePadding * 2 && hSize > 26 * scale) {
      hSize -= 4 * scale;
      ctx.font = `700 ${hSize}px "${headingFont}", sans-serif`;
    }
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(hText, width / 2, bottomY + 65 * scale);

    ctx.fillStyle = `${textColor}99`;
    ctx.font = `500 ${22 * scale}px "${bodyFont}", sans-serif`;
    ctx.fillText(formatText(supportingCopy), width / 2, bottomY + 115 * scale);

    // Domain
    ctx.fillStyle = `${textColor}66`;
    ctx.font = `500 ${18 * scale}px "${bodyFont}", sans-serif`;
    ctx.fillText(siteDomain(website), width / 2, height - 40 * scale);
  }

  // 4. SPLIT CARD (50/50 modern split view)
  function renderSplitCardLayout() {
    const isVertical = height > width;
    const splitRatio = 0.52;

    if (isVertical) {
      // Top half: Media
      const topH = height * splitRatio;
      if (mediaElement) {
        drawMediaCover(0, 0, width, topH, mediaElement);
      } else {
        ctx.fillStyle = primaryColor;
        ctx.fillRect(0, 0, width, topH);
      }

      // Bottom half: Card Content
      const botH = height - topH;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, topH, width, botH);

      // Accent border divider
      ctx.fillStyle = secondaryColor || primaryColor;
      ctx.fillRect(0, topH - 6 * scale, width, 6 * scale);

      const margin = Math.round(70 * scale * densityMultiplier);
      const textY = topH + 80 * scale;

      if (badgeText) {
        drawPillBadge(margin, textY - 45 * scale, badgeText, primaryColor, '#ffffff');
      }

      // Headline
      let hSize = Math.round(64 * scale * headlineMultiplier);
      ctx.font = `800 ${hSize}px "${headingFont}", sans-serif`;
      const hText = formatHeadline(headline);
      while (ctx.measureText(hText).width > width - margin * 2 && hSize > 28 * scale) {
        hSize -= 4 * scale;
        ctx.font = `800 ${hSize}px "${headingFont}", sans-serif`;
      }
      ctx.fillStyle = textColor;
      ctx.textAlign = textAlign;
      const tx = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - margin : margin;
      ctx.fillText(hText, tx, textY + 45 * scale);

      // Supporting copy
      ctx.fillStyle = `${textColor}bb`;
      ctx.font = `500 ${26 * scale}px "${bodyFont}", sans-serif`;
      const lines = wrapText(ctx, formatText(supportingCopy), width - margin * 2);
      lines.slice(0, 3).forEach((line, i) => {
        ctx.fillText(line, tx, textY + 110 * scale + i * 36 * scale);
      });

      // Bottom CTA bar
      const botY = height - 60 * scale;
      ctx.fillStyle = primaryColor;
      ctx.font = `700 ${24 * scale}px "${bodyFont}", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(formatText(cta), margin, botY);

      ctx.fillStyle = `${textColor}77`;
      ctx.textAlign = 'right';
      ctx.fillText(siteDomain(website), width - margin, botY);
    } else {
      // Horizontal Split: Left half media, Right half content
      const leftW = width * splitRatio;
      if (mediaElement) {
        drawMediaCover(0, 0, leftW, height, mediaElement);
      } else {
        ctx.fillStyle = primaryColor;
        ctx.fillRect(0, 0, leftW, height);
      }

      const margin = Math.round(60 * scale * densityMultiplier);
      const rightX = leftW + margin;
      const rightW = width - leftW - margin * 2;
      const midY = height / 2;

      ctx.fillStyle = primaryColor;
      ctx.font = `700 ${20 * scale}px "${bodyFont}", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(formatText(eyebrow || brand.tagline), rightX, midY - 120 * scale);

      let hSize = Math.round(68 * scale * headlineMultiplier);
      ctx.font = `800 ${hSize}px "${headingFont}", sans-serif`;
      ctx.fillStyle = textColor;
      ctx.fillText(formatHeadline(headline), rightX, midY - 40 * scale, rightW);

      ctx.fillStyle = `${textColor}aa`;
      ctx.font = `500 ${24 * scale}px "${bodyFont}", sans-serif`;
      const lines = wrapText(ctx, formatText(supportingCopy), rightW);
      lines.slice(0, 3).forEach((l, i) => {
        ctx.fillText(l, rightX, midY + 30 * scale + i * 36 * scale);
      });

      // CTA button
      if (cta) {
        const btnY = midY + 160 * scale;
        const btnText = formatText(cta);
        ctx.font = `700 ${22 * scale}px "${bodyFont}", sans-serif`;
        const tw = ctx.measureText(btnText).width;
        const bw = tw + 44 * scale;
        const bh = 52 * scale;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(rightX, btnY, bw, bh, 8 * scale);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(btnText, rightX + bw / 2, btnY + bh / 2 + 7 * scale);
      }
    }
  }

  // 5. PRODUCT SPOTLIGHT (Centered feature with badge and action CTA)
  function renderProductSpotlightLayout() {
    const margin = Math.round(70 * scale * densityMultiplier);

    // Subtle radial light gradient in center
    const radial = ctx.createRadialGradient(width / 2, height * 0.45, 100 * scale, width / 2, height * 0.45, width * 0.6);
    radial.addColorStop(0, `${primaryColor}22`);
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Top Brand & Badge
    const topY = 60 * scale;
    if (logoElement && showLogo && effectiveLogoPosition !== 'hidden') {
      drawLogo(margin, topY, 260 * scale, 65 * scale);
    } else {
      ctx.fillStyle = textColor;
      ctx.font = `700 ${36 * scale}px "${headingFont}", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(formatText(brand.name), margin, topY + 40 * scale);
    }

    if (badgeText) {
      drawPillBadge(width - margin - 170 * scale, topY, badgeText, primaryColor, '#ffffff');
    }

    // Centered Media
    const mediaTop = 160 * scale;
    const mediaH = height * 0.48;
    const mediaW = width - margin * 2;
    if (mediaElement) {
      drawMediaContain(margin, mediaTop, mediaW, mediaH, mediaElement);
    }

    // Bottom Feature Info
    const infoY = height - 260 * scale;

    let hSize = Math.round(68 * scale * headlineMultiplier);
    ctx.font = `800 ${hSize}px "${headingFont}", sans-serif`;
    const hText = formatHeadline(headline);
    while (ctx.measureText(hText).width > width - margin * 2 && hSize > 30 * scale) {
      hSize -= 4 * scale;
      ctx.font = `800 ${hSize}px "${headingFont}", sans-serif`;
    }
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(hText, width / 2, infoY);

    ctx.fillStyle = `${textColor}aa`;
    ctx.font = `500 ${24 * scale}px "${bodyFont}", sans-serif`;
    const lines = wrapText(ctx, formatText(supportingCopy), width - margin * 2);
    if (lines[0]) ctx.fillText(lines[0], width / 2, infoY + 48 * scale);

    // Bottom CTA
    const btnY = height - 100 * scale;
    const btnText = formatText(cta);
    ctx.font = `700 ${22 * scale}px "${bodyFont}", sans-serif`;
    const tw = ctx.measureText(btnText).width;
    const bw = tw + 56 * scale;
    const bh = 54 * scale;
    const bx = (width - bw) / 2;

    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(bx, btnY, bw, bh, 27 * scale);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(btnText, width / 2, btnY + bh / 2 + 7 * scale);
  }

  // 6. QUOTE / MANIFESTO (Statement layout with large quotation mark watermark)
  function renderQuoteManifestoLayout() {
    const margin = Math.round(80 * scale * densityMultiplier);

    // Background watermark quotation mark
    ctx.save();
    ctx.fillStyle = `${primaryColor}18`;
    ctx.font = `900 ${360 * scale}px Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.fillText('“', margin - 30 * scale, 340 * scale);
    ctx.restore();

    // Top Header
    const topY = 60 * scale;
    if (logoElement && showLogo && effectiveLogoPosition !== 'hidden') {
      drawLogo(margin, topY, 260 * scale, 65 * scale);
    } else {
      ctx.fillStyle = textColor;
      ctx.font = `700 ${36 * scale}px "${headingFont}", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(formatText(brand.name), margin, topY + 40 * scale);
    }

    // Quotation Statement
    const midY = height * 0.42;
    let quoteSize = Math.round(64 * scale * headlineMultiplier);
    ctx.font = `700 ${quoteSize}px "${headingFont}", Georgia, serif`;
    const qText = `“${formatHeadline(headline)}”`;
    const maxW = width - margin * 2;
    const lines = wrapText(ctx, qText, maxW);

    ctx.fillStyle = textColor;
    ctx.textAlign = textAlign;
    const qx = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - margin : margin;

    lines.forEach((line, i) => {
      ctx.fillText(line, qx, midY + i * (quoteSize * 1.25), maxW);
    });

    // Author / Signature Tagline
    const sigY = midY + lines.length * (quoteSize * 1.25) + 60 * scale;
    ctx.fillStyle = primaryColor;
    ctx.font = `600 ${26 * scale}px "${bodyFont}", sans-serif`;
    ctx.textAlign = textAlign;
    ctx.fillText(`— ${formatText(eyebrow || brand.tagline)}`, qx, sigY);

    if (supportingCopy) {
      ctx.fillStyle = `${textColor}99`;
      ctx.font = `400 ${22 * scale}px "${bodyFont}", sans-serif`;
      const subLines = wrapText(ctx, supportingCopy, maxW);
      if (subLines[0]) ctx.fillText(subLines[0], qx, sigY + 40 * scale);
    }

    // Bottom domain link
    ctx.fillStyle = `${textColor}66`;
    ctx.font = `500 ${20 * scale}px "${bodyFont}", sans-serif`;
    ctx.textAlign = textAlign;
    ctx.fillText(siteDomain(website), qx, height - 50 * scale);
  }

  // 7. AD BANNER — ratio-aware composition for IAB ad sizes
  function renderAdBannerLayout() {
    const unit = Math.min(width, height);
    const margin = Math.max(10 * scale, unit * 0.09);
    const progress = options.progress;
    const ease = progress === undefined ? 1 : Math.min(progress * 2.2, 1);
    const rise = progress === undefined ? 0 : (1 - ease) * unit * 0.5;

    const wide = width >= height * 2.2;
    const tall = height >= width * 1.5;

    // Brand top rule
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, width, Math.max(4, unit * 0.055));

    // Media: right panel on banners, scrim background otherwise
    if (mediaElement) {
      if (wide) {
        drawMediaCover(width - height * 0.9, 0, height * 0.9, height, mediaElement);
        ctx.fillStyle = `${bgColor}55`;
        ctx.fillRect(0, 0, width - height * 0.9 + unit * 0.2, height);
      } else {
        ctx.save();
        ctx.globalAlpha = 0.2;
        drawMediaCover(0, 0, width, height, mediaElement);
        ctx.restore();
      }
    }

    ctx.save();
    if (progress !== undefined) {
      ctx.globalAlpha = ease;
      ctx.translate(0, rise);
    }

    if (wide) {
      // Horizontal banner: [logo/eyebrow] [headline] [CTA]
      const ctaW = Math.min(width * 0.24, Math.max(unit * 1.7, 110 * scale));
      const ctaX = width - margin - ctaW;
      const mediaW = mediaElement ? height * 0.9 : 0;
      const contentRight = ctaX - margin;
      const contentW = contentRight - margin - mediaW * 0.2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if (eyebrow) {
        ctx.fillStyle = primaryColor;
        ctx.font = `700 ${Math.max(9, unit * 0.11)}px "${bodyFont}", sans-serif`;
        ctx.fillText(formatText(eyebrow).toUpperCase().slice(0, 42), margin, margin + unit * 0.06);
      }
      let hs = Math.min(unit * 0.36, height * 0.42) * headlineMultiplier;
      ctx.font = `800 ${hs}px "${headingFont}", sans-serif`;
      const hText = formatHeadline(headline).slice(0, 90);
      while (ctx.measureText(hText).width > contentW && hs > 8) { hs -= 1; ctx.font = `800 ${hs}px "${headingFont}", sans-serif`; }
      ctx.fillStyle = textColor;
      ctx.fillText(hText, margin, height / 2 + hs * 0.12, contentW);
      if (logoElement && showLogo && effectiveLogoPosition !== 'hidden' && unit >= 40) {
        const s = Math.min(unit * 0.5 / ((logoElement as HTMLImageElement).height || 1), (contentW * 0.18) / ((logoElement as HTMLImageElement).width || 1));
        ctx.drawImage(logoElement, contentRight - (logoElement as HTMLImageElement).width * s, margin, (logoElement as HTMLImageElement).width * s, (logoElement as HTMLImageElement).height * s);
      }
      // CTA pill on the right
      ctx.fillStyle = primaryColor;
      const ctaH = Math.max(unit * 0.52, 24 * scale);
      ctx.beginPath();
      ctx.roundRect(ctaX, (height - ctaH) / 2, ctaW, ctaH, ctaH / 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.max(9, ctaH * 0.34)}px "${bodyFont}", sans-serif`;
      ctx.fillText((cta || siteDomain(website)).slice(0, 26), ctaX + ctaW / 2, height / 2 + 1);
    } else {
      // Stacked ad (rectangles, half page, skyscraper)
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'alphabetic';
      const cx = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - margin : margin;
      if (logoElement && showLogo && effectiveLogoPosition !== 'hidden') {
        const ih = (logoElement as HTMLImageElement).height || 1;
        const iw = (logoElement as HTMLImageElement).width || 1;
        const s = Math.min((unit * 0.22) / ih, (width * 0.5) / iw);
        const lw = iw * s; const lh = ih * s;
        ctx.drawImage(logoElement, textAlign === 'center' ? (width - lw) / 2 : textAlign === 'right' ? width - margin - lw : margin, margin, lw, lh);
      } else {
        ctx.fillStyle = `${textColor}b3`;
        ctx.font = `700 ${unit * 0.075}px "${bodyFont}", sans-serif`;
        ctx.fillText(formatText(brand.name), cx, margin + unit * 0.1, width - margin * 2);
      }
      const eyY = tall ? height * 0.3 : height * 0.34;
      if (eyebrow) {
        ctx.fillStyle = primaryColor;
        ctx.font = `700 ${Math.max(8, unit * 0.08)}px "${bodyFont}", sans-serif`;
        ctx.fillText(formatText(eyebrow).toUpperCase().slice(0, 60), cx, eyY, width - margin * 2);
      }
      let hs = (tall ? unit * 0.24 : unit * 0.3) * headlineMultiplier;
      const hText = formatHeadline(headline).slice(0, 140);
      ctx.font = `800 ${hs}px "${headingFont}", sans-serif`;
      const maxW = width - margin * 2;
      while (ctx.measureText(hText).width > maxW && hs > 8) { hs -= 1; ctx.font = `800 ${hs}px "${headingFont}", sans-serif`; }
      ctx.fillStyle = textColor;
      wrapText(ctx, hText, maxW).slice(0, tall ? 3 : 2).forEach((line, i) => {
        ctx.fillText(line, cx, eyY + (i + 1) * hs * 1.15, maxW);
      });
      // CTA button at bottom
      const ctaH = Math.max(unit * 0.15, 18 * scale);
      const ctaW = Math.min(width - margin * 2, Math.max(ctx.measureText(cta || 'x').width + unit * 0.5, unit * 1.4));
      const bx = textAlign === 'center' ? (width - ctaW) / 2 : textAlign === 'right' ? width - margin - ctaW : margin;
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(bx, height - margin - ctaH, ctaW, ctaH, Math.min(ctaH / 2, brand.radius || 8));
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.max(8, ctaH * 0.36)}px "${bodyFont}", sans-serif`;
      ctx.fillText((cta || siteDomain(website)).slice(0, 32), bx + ctaW / 2, height - margin - ctaH / 2 + 1);
    }
    ctx.restore();
  }
}

export async function exportCanvasPNG(
  template: ContentTemplate,
  options: RenderOptions = {}
): Promise<void> {
  const canvas = document.createElement('canvas');
  await renderStudioCanvas(canvas, template, options);

  const formatKey = options.format ?? template.aspectRatio ?? 'square';
  const scale = options.scale ?? 1;
  const dim = canvasDimensions(formatKey);
  const w = dim.width * scale;
  const h = dim.height * scale;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed.'))), 'image/png');
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const retinaTag = scale > 1 ? '@2x' : '';
  link.download = `swiftpilot-${template.id}-${formatKey}-${w}x${h}${retinaTag}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportCarouselSlidesPNG(
  template: ContentTemplate,
  options: RenderOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const slides = template.slides ?? [];
  const total = slides.length || 1;

  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);
    const canvas = document.createElement('canvas');
    await renderStudioCanvas(canvas, template, { ...options, activeSlideIndex: i });

    const formatKey = options.format ?? template.aspectRatio ?? 'square';
    const scale = options.scale ?? 1;
    const dim = canvasDimensions(formatKey);
    const w = dim.width * scale;
    const h = dim.height * scale;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed.'))), 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `swiftpilot-${template.id}-slide-${i + 1}-of-${total}-${w}x${h}.png`;
    link.click();
    await new Promise(r => setTimeout(r, 400));
    URL.revokeObjectURL(url);
  }
}
