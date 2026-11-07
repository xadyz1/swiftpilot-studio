import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Copy,
  Download,
  Eye,
  FileImage,
  FolderHeart,
  Grid3X3,
  ImagePlus,
  Layers,
  Layout,
  Maximize2,
  Minimize2,
  Palette,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  AspectRatioFormat,
  CarouselSlide,
  ContentTemplate,
  Format,
  Platform,
  Tone,
  VisualLayout,
} from '../data/content';
import type { BrandKit, MediaAsset, SiteProject } from '@shared/studio';
import { hungryBrand, loadBrandFonts, safeFont, siteDomain, FONT_CHOICES, artworkColors } from '../lib/brand';
import {
  AD_FORMATS,
  SOCIAL_FORMATS,
  CanvasDimensions,
  FORMAT_DIMENSIONS,
  RenderOptions,
  canvasDimensions,
  exportCanvasPNG,
  exportCarouselSlidesPNG,
  isAdFormat,
  renderStudioCanvas,
} from '../lib/studio-canvas';
import { exportAnimatedWebM, exportAdAnimation, type AnimationStyle } from '../lib/animation';
import { downloadAdCode } from '../lib/ads';
import { downloadText, type PlannedPost, type Status } from '../lib/planner';
import { mediaProxyURL, uploadLocalMedia, useMediaSource } from '../lib/media';

export interface VisualStudioProps {
  project: SiteProject;
  template: ContentTemplate;
  initialPost?: PlannedPost;
  targetDate?: string;
  onSaveTemplate?: (updated: ContentTemplate) => void;
  onSchedulePost?: (template: ContentTemplate, post: Omit<PlannedPost, 'id'>, id?: string) => void;
  onClose?: () => void;
}

type StudioTab = 'layout' | 'content' | 'style' | 'media' | 'social';

const LAYOUT_PRESETS: { id: VisualLayout; name: string; desc: string; icon: string }[] = [
  { id: 'bold-editorial', name: 'Bold Editorial', desc: 'Streetwear display headline, accent lines & corner tags', icon: '⚡' },
  { id: 'cinematic-bleed', name: 'Cinematic Bleed', desc: 'Edge-to-edge media with smart dark gradient scrim', icon: '🎬' },
  { id: 'framed-minimal', name: 'Framed Minimalist', desc: 'Clean luxury frame, generous whitespace & centered media', icon: '🖼️' },
  { id: 'split-card', name: 'Modern Split Card', desc: '50/50 media card with structured copy & CTA button', icon: '📐' },
  { id: 'product-spotlight', name: 'Product Spotlight', desc: 'Center-stage product highlight with badge pill & buy button', icon: '🏷️' },
  { id: 'quote-manifesto', name: 'Quote / Manifesto', desc: 'Oversized quotation mark watermark with bold statement', icon: '💬' },
];

export default function VisualStudio({
  project,
  template: initialTemplate,
  initialPost,
  targetDate,
  onSaveTemplate,
  onSchedulePost,
  onClose,
}: VisualStudioProps) {
  // Working copy of template
  const [template, setTemplate] = useState<ContentTemplate>(() => {
    const copy = JSON.parse(JSON.stringify(initialTemplate)) as ContentTemplate;
    if (!copy.layout) copy.layout = 'bold-editorial';
    if (!copy.aspectRatio) copy.aspectRatio = copy.format === 'Video' ? 'vertical' : 'square';
    if (!copy.textAlign) copy.textAlign = 'left';
    if (copy.overlayOpacity === undefined) copy.overlayOpacity = 40;
    if (copy.showLogo === undefined) copy.showLogo = true;
    if (!copy.logoPosition) copy.logoPosition = 'top-left';
    if (!copy.slides) {
      copy.slides = [
        {
          id: crypto.randomUUID(),
          headline: copy.headline,
          supportingCopy: copy.supportingCopy,
          image: copy.image,
          mediaKind: copy.mediaKind,
          cta: copy.cta,
          badge: copy.badge,
        },
      ];
    }
    return copy;
  });

  const [activeTab, setActiveTab] = useState<StudioTab>('layout');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activePlatform, setActivePlatform] = useState<Platform>(initialPost?.platform ?? template.platforms[0] ?? 'instagram');
  const [zoomScale, setZoomScale] = useState<number>(0.42);
  const [busyExport, setBusyExport] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [postDate, setPostDate] = useState<string>(initialPost?.date ?? targetDate ?? new Date().toISOString().slice(0, 10));
  const [postTime, setPostTime] = useState<string>(initialPost?.time ?? '18:00');
  const [postStatus, setPostStatus] = useState<Status>(initialPost?.status ?? 'scheduled');
  const [copiedText, setCopiedText] = useState(false);

  // Animation settings for WebM
  const [animStyle, setAnimStyle] = useState<AnimationStyle>('soft-fade');
  const [animDuration, setAnimDuration] = useState<4 | 6 | 8>(6);

  // Custom styling overrides
  const [customPrimary, setCustomPrimary] = useState<string>(project.brand.primary);
  const [customSecondary, setCustomSecondary] = useState<string>(project.brand.secondary);
  const [customBg, setCustomBg] = useState<string>(project.brand.background);
  const [customText, setCustomText] = useState<string>(project.brand.text);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const brand = project.brand;
  const currentFormat = template.aspectRatio ?? 'square';
  const dimensions = canvasDimensions(currentFormat);
  const [adsExpanded, setAdsExpanded] = useState<boolean>(() => isAdFormat(initialTemplate.aspectRatio));
  useEffect(() => { if (isAdFormat(currentFormat)) setAdsExpanded(true); }, [currentFormat]);

  // Sync canvas redraw on template or styling change
  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderOpts: RenderOptions = {
      brand,
      website: project.url,
      format: currentFormat,
      layout: template.layout ?? 'bold-editorial',
      scale: 1, // Preview scale 1x for crispness in CSS container
      activeSlideIndex,
      customHeadingFont: template.headingFont ?? brand.headingFont,
      customBodyFont: template.bodyFont ?? brand.bodyFont,
      customPrimaryColor: customPrimary,
      customSecondaryColor: customSecondary,
      customBackgroundColor: customBg,
      customTextColor: customText,
      overlayOpacity: template.overlayOpacity ?? 40,
      textAlign: template.textAlign ?? 'left',
      badge: template.badge,
      showLogo: template.showLogo ?? true,
      logoPosition: template.logoPosition ?? 'top-left',
      logoSize: template.logoSize ?? 'medium',
      headlineFontSize: template.headlineFontSize ?? 'medium',
      headlineUppercase: template.headlineUppercase,
      contentPadding: template.contentPadding ?? 'normal',
    };

    renderStudioCanvas(canvas, template, renderOpts)
      .catch(err => {
        if (active) console.warn('Live preview render error:', err);
      });

    return () => { active = false; };
  }, [
    template,
    brand,
    project.url,
    currentFormat,
    activeSlideIndex,
    customPrimary,
    customSecondary,
    customBg,
    customText,
  ]);

  // Handle auto-fit zoom scaling based on container
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    const updateFit = () => {
      const availableW = el.clientWidth - 48;
      const availableH = el.clientHeight - 80;
      if (availableW <= 0 || availableH <= 0) return;
      const fitW = availableW / dimensions.width;
      const fitH = availableH / dimensions.height;
      const fit = Math.min(fitW, fitH, 0.75);
      setZoomScale(Math.max(0.2, fit));
    };

    updateFit();
    window.addEventListener('resize', updateFit);
    return () => window.removeEventListener('resize', updateFit);
  }, [dimensions.width, dimensions.height]);

  // Patch template helper
  const updateTemplate = (patch: Partial<ContentTemplate>) => {
    setTemplate(prev => ({ ...prev, ...patch }));
  };

  // Slides management
  const slides = template.slides ?? [];
  const currentSlide: CarouselSlide = slides[activeSlideIndex] ?? {
    id: 's0',
    headline: template.headline,
    supportingCopy: template.supportingCopy,
    image: template.image,
    mediaKind: template.mediaKind,
    cta: template.cta,
    badge: template.badge,
  };

  const updateCurrentSlide = (patch: Partial<CarouselSlide>) => {
    const nextSlides = [...slides];
    nextSlides[activeSlideIndex] = { ...currentSlide, ...patch };
    updateTemplate({
      slides: nextSlides,
      // Keep root synced if slide 0
      ...(activeSlideIndex === 0 ? patch : {}),
    });
  };

  const addSlide = () => {
    const newSlide: CarouselSlide = {
      id: crypto.randomUUID(),
      headline: `Slide ${slides.length + 1}`,
      supportingCopy: 'Add supporting copy for this slide.',
      image: template.image,
      mediaKind: template.mediaKind,
      cta: template.cta,
      badge: template.badge,
    };
    updateTemplate({ slides: [...slides, newSlide], format: 'Carousel' });
    setActiveSlideIndex(slides.length);
    toast.success(`Slide ${slides.length + 1} added.`);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) {
      toast.error('Carousels require at least one slide.');
      return;
    }
    const nextSlides = slides.filter((_, i) => i !== index);
    updateTemplate({ slides: nextSlides });
    setActiveSlideIndex(Math.max(0, index - 1));
    toast.success('Slide removed.');
  };

  // Upload new media from file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const asset = await uploadLocalMedia(file);
      updateCurrentSlide({ image: asset.url, mediaKind: asset.kind });
      toast.success(`Uploaded ${asset.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  // Export handlers
  const handleExportPNG = async (scale: 1 | 2 = 1) => {
    setBusyExport(`png-${scale}`);
    setStatusMessage('');
    try {
      await exportCanvasPNG(template, {
        brand,
        website: project.url,
        format: currentFormat,
        layout: template.layout,
        scale,
        activeSlideIndex,
        customHeadingFont: template.headingFont ?? brand.headingFont,
        customBodyFont: template.bodyFont ?? brand.bodyFont,
        customPrimaryColor: customPrimary,
        customSecondaryColor: customSecondary,
        customBackgroundColor: customBg,
        customTextColor: customText,
        overlayOpacity: template.overlayOpacity,
        textAlign: template.textAlign,
        badge: template.badge,
        showLogo: template.showLogo,
        logoPosition: template.logoPosition,
        logoSize: template.logoSize,
        headlineFontSize: template.headlineFontSize,
        headlineUppercase: template.headlineUppercase,
        contentPadding: template.contentPadding,
      });
      toast.success(scale === 2 ? '2x Retina Ultra-HD PNG downloaded!' : 'Standard PNG downloaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PNG export failed.');
    } finally {
      setBusyExport('');
    }
  };

  const handleExportCarouselBatch = async () => {
    if (slides.length <= 1) {
      await handleExportPNG(2);
      return;
    }
    setBusyExport('carousel');
    setStatusMessage(`Exporting 1 of ${slides.length} slides…`);
    try {
      await exportCarouselSlidesPNG(
        template,
        {
          brand,
          website: project.url,
          format: currentFormat,
          layout: template.layout,
          scale: 2,
          customHeadingFont: template.headingFont ?? brand.headingFont,
          customBodyFont: template.bodyFont ?? brand.bodyFont,
          customPrimaryColor: customPrimary,
          customSecondaryColor: customSecondary,
          customBackgroundColor: customBg,
          customTextColor: customText,
          overlayOpacity: template.overlayOpacity,
          textAlign: template.textAlign,
          badge: template.badge,
          showLogo: template.showLogo,
          logoPosition: template.logoPosition,
          logoSize: template.logoSize,
          headlineFontSize: template.headlineFontSize,
          headlineUppercase: template.headlineUppercase,
          contentPadding: template.contentPadding,
        },
        (curr, tot) => setStatusMessage(`Exporting ${curr} of ${tot} slides…`)
      );
      toast.success(`All ${slides.length} slides exported at 2x resolution!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch export failed.');
    } finally {
      setBusyExport('');
      setStatusMessage('');
    }
  };

  const adRenderOptions = (): RenderOptions => ({
    brand,
    website: project.url,
    format: currentFormat,
    layout: template.layout,
    scale: 1,
    activeSlideIndex,
    customHeadingFont: template.headingFont ?? brand.headingFont,
    customBodyFont: template.bodyFont ?? brand.bodyFont,
    customPrimaryColor: customPrimary,
    customSecondaryColor: customSecondary,
    customBackgroundColor: customBg,
    customTextColor: customText,
    overlayOpacity: template.overlayOpacity,
    textAlign: template.textAlign,
    badge: template.badge,
    showLogo: template.showLogo,
    logoPosition: template.logoPosition,
    logoSize: template.logoSize,
    headlineFontSize: template.headlineFontSize,
    headlineUppercase: template.headlineUppercase,
    contentPadding: template.contentPadding,
  });

  const handleExportWebM = async () => {
    setBusyExport('webm');
    setStatusMessage('Rendering video motion frames…');
    try {
      if (isAdFormat(currentFormat)) {
        await exportAdAnimation(template, brand, {
          dimensions,
          renderOptions: adRenderOptions(),
          duration: animDuration,
          kind: 'webm',
          filename: `swiftpilot-ad-${currentFormat}-${dimensions.width}x${dimensions.height}`,
        });
      } else {
        await exportAnimatedWebM(template, brand, project.url, {
          format: currentFormat as 'square' | 'portrait' | 'vertical' | 'landscape',
          style: animStyle,
          duration: animDuration,
        });
      }
      toast.success('Animated WebM video downloaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'WebM video export failed.');
    } finally {
      setBusyExport('');
      setStatusMessage('');
    }
  };

  const handleExportGIF = async () => {
    setBusyExport('gif');
    setStatusMessage('Encoding GIF frames…');
    try {
      await exportAdAnimation(template, brand, {
        dimensions,
        renderOptions: adRenderOptions(),
        duration: animDuration,
        kind: 'gif',
        filename: `swiftpilot-ad-${currentFormat}-${dimensions.width}x${dimensions.height}`,
      });
      toast.success('Animated GIF downloaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'GIF export failed.');
    } finally {
      setBusyExport('');
      setStatusMessage('');
    }
  };

  const handleExportAdCode = () => {
    try {
      downloadAdCode(project, template, dimensions);
      toast.success('HTML5 ad code downloaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ad code export failed.');
    }
  };

  const copyTextPackage = async () => {
    const v = template.variants[activePlatform] ?? template.variants.instagram;
    const pkg = `${template.title.toUpperCase()}\n${activePlatform.toUpperCase()} DRAFT\n\n${v.caption}\n\n${v.cta}\n\n${v.hashtags}\n\n--- CREATIVE NOTES ---\n${v.notes}`;
    try {
      await navigator.clipboard.writeText(pkg);
      setCopiedText(true);
      toast.success('Complete post copy & hashtags copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2200);
    } catch {
      downloadText(pkg, `${template.id}-${activePlatform}-package.txt`);
      toast.success('Downloaded copy package text file.');
    }
  };

  const handleSaveTemplateClick = () => {
    onSaveTemplate?.(template);
    toast.success('Creative template saved to this project!');
  };

  const handleScheduleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onSchedulePost) return;
    onSchedulePost(
      template,
      {
        templateId: template.id,
        platform: activePlatform,
        date: postDate,
        time: postTime,
        status: postStatus,
      },
      initialPost?.id
    );
    setShowScheduleDialog(false);
  };

  const variant = template.variants[activePlatform] ?? template.variants.instagram;

  return (
    <div className="visual-studio-workspace" aria-label="Visual Creative Studio">
      {/* 1. TOP HEADER & WORKSPACE TOOLBAR */}
      <header className="vs-topbar">
        <div className="vs-topbar-left">
          {onClose && (
            <button type="button" className="icon-button vs-back-btn" onClick={onClose} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="vs-title-block">
            <span className="tiny-tag">VISUAL STUDIO · {project.name}</span>
            <input
              className="vs-title-input"
              value={template.title}
              maxLength={80}
              placeholder="Post title"
              onChange={e => updateTemplate({ title: e.target.value })}
            />
          </div>
        </div>

        <div className="vs-topbar-center">
          <div className="vs-format-badge">
            <span className="dot" />
            <span>{dimensions.label}</span>
            <small>{dimensions.width} × {dimensions.height}px</small>
          </div>
        </div>

        <div className="vs-topbar-actions">
          <button
            type="button"
            className="button secondary vs-topbar-btn"
            onClick={copyTextPackage}
            title="Copy captions, hashtags, and CTA"
          >
            {copiedText ? <Check size={15} /> : <Copy size={15} />}
            <span>Copy Text</span>
          </button>

          <button
            type="button"
            className="button secondary vs-topbar-btn"
            onClick={handleSaveTemplateClick}
            title="Save changes to post library"
          >
            <Save size={15} />
            <span>Save Idea</span>
          </button>

          <div className="vs-dropdown-wrap">
            <button
              type="button"
              className="button secondary vs-topbar-btn"
              onClick={() => handleExportPNG(1)}
              disabled={!!busyExport}
            >
              <Download size={15} />
              <span>{busyExport === 'png-1' ? 'Exporting…' : 'PNG (1x)'}</span>
            </button>
            <button
              type="button"
              className="button primary vs-topbar-btn"
              onClick={() => handleExportPNG(2)}
              disabled={!!busyExport}
              title="Export high-resolution 2x Retina PNG (2160px)"
            >
              <Sparkles size={15} />
              <span>{busyExport === 'png-2' ? 'Rendering…' : 'PNG (2x Retina)'}</span>
            </button>
          </div>

          {isAdFormat(currentFormat) && (
            <>
              <button
                type="button"
                className="button secondary vs-topbar-btn"
                onClick={handleExportGIF}
                disabled={!!busyExport}
                title="Animated GIF at the selected ad size"
              >
                <Play size={15} />
                <span>{busyExport === 'gif' ? 'Encoding…' : 'GIF'}</span>
              </button>
              <button
                type="button"
                className="button secondary vs-topbar-btn"
                onClick={handleExportWebM}
                disabled={!!busyExport}
                title="Animated WebM at the selected ad size"
              >
                <Video size={15} />
                <span>{busyExport === 'webm' ? 'Rendering…' : 'WebM'}</span>
              </button>
              <button
                type="button"
                className="button secondary vs-topbar-btn"
                onClick={handleExportAdCode}
                title="Download a standalone HTML5 ad unit"
              >
                <Download size={15} />
                <span>HTML code</span>
              </button>
            </>
          )}

          {onSchedulePost && (
            <button
              type="button"
              className="button primary vs-schedule-btn"
              onClick={() => setShowScheduleDialog(true)}
            >
              <CalendarDays size={16} />
              <span>Add to Calendar</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN SPLIT INTERACTION BODY */}
      <div className="vs-main-layout">
        {/* LEFT / CENTER: INTERACTIVE LIVE CANVAS PREVIEW */}
        <section className="vs-canvas-pane" ref={previewContainerRef}>
          {/* Canvas Sub-toolbar */}
          <div className="vs-canvas-toolbar">
            <div className="vs-aspect-pills">
              {SOCIAL_FORMATS.map(fmt => {
                const isSelected = currentFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    className={`vs-aspect-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => updateTemplate({ aspectRatio: fmt })}
                  >
                    <span>{canvasDimensions(fmt).label.split(' ')[0]}</span>
                    <small>{canvasDimensions(fmt).ratio}</small>
                  </button>
                );
              })}
              <button
                type="button"
                className={`vs-aspect-pill ad-toggle ${isAdFormat(currentFormat) || adsExpanded ? 'active' : ''}`}
                onClick={() => setAdsExpanded(v => !v)}
                title="Show IAB ad sizes"
              >
                <span>Ads</span>
                <small>{adsExpanded ? '▴' : '▾'}</small>
              </button>
            </div>

            <div className="vs-zoom-controls">
              <button
                type="button"
                className="vs-zoom-btn"
                onClick={() => setZoomScale(z => Math.max(0.2, z - 0.08))}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="vs-zoom-indicator">{Math.round(zoomScale * 100)}%</span>
              <button
                type="button"
                className="vs-zoom-btn"
                onClick={() => setZoomScale(z => Math.min(1.0, z + 0.08))}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                className="vs-zoom-btn"
                onClick={() => setZoomScale(0.42)}
                title="Reset Fit"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {adsExpanded && (
            <div className="vs-ads-strip">
              {AD_FORMATS.map(fmt => {
                const isSelected = currentFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    className={`vs-aspect-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => updateTemplate({ aspectRatio: fmt, format: 'Image' })}
                    title={canvasDimensions(fmt).label}
                  >
                    <small>{canvasDimensions(fmt).ratio}</small>
                  </button>
                );
              })}
            </div>
          )}

          {/* The Live Render Surface */}
          <div className="vs-canvas-stage">
            <div
              className="vs-canvas-frame"
              style={{
                width: `${dimensions.width * zoomScale}px`,
                height: `${dimensions.height * zoomScale}px`,
              }}
            >
              <canvas
                ref={canvasRef}
                className="vs-live-canvas"
                style={{
                  width: `${dimensions.width * zoomScale}px`,
                  height: `${dimensions.height * zoomScale}px`,
                }}
              />
            </div>
          </div>

          {/* Carousel Slide Navigation Bar */}
          {template.format === 'Carousel' && (
            <div className="vs-carousel-bar">
              <div className="vs-carousel-slides-list">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`vs-slide-chip ${activeSlideIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveSlideIndex(idx)}
                  >
                    <Layers size={13} />
                    <span>Slide {idx + 1}</span>
                    {slides.length > 1 && (
                      <span
                        className="vs-slide-del"
                        onClick={e => {
                          e.stopPropagation();
                          removeSlide(idx);
                        }}
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
                <button type="button" className="vs-add-slide-btn" onClick={addSlide}>
                  <Plus size={14} /> Add Slide
                </button>
              </div>

              <div className="vs-carousel-actions">
                <button
                  type="button"
                  className="button secondary vs-batch-btn"
                  onClick={handleExportCarouselBatch}
                  disabled={!!busyExport}
                >
                  <ArrowDownToLine size={14} />
                  <span>Download All Slides ({slides.length})</span>
                </button>
              </div>
            </div>
          )}

          {statusMessage && <div className="vs-status-ticker">{statusMessage}</div>}
        </section>

        {/* RIGHT: INSPECTOR & CONTROLS PANEL */}
        <aside className="vs-inspector-pane">
          {/* Inspector Tabs */}
          <nav className="vs-inspector-tabs">
            <button
              type="button"
              className={activeTab === 'layout' ? 'active' : ''}
              onClick={() => setActiveTab('layout')}
            >
              <Layout size={15} />
              <span>Layout</span>
            </button>
            <button
              type="button"
              className={activeTab === 'content' ? 'active' : ''}
              onClick={() => setActiveTab('content')}
            >
              <Type size={15} />
              <span>Content</span>
            </button>
            <button
              type="button"
              className={activeTab === 'style' ? 'active' : ''}
              onClick={() => setActiveTab('style')}
            >
              <Palette size={15} />
              <span>Style</span>
            </button>
            <button
              type="button"
              className={activeTab === 'media' ? 'active' : ''}
              onClick={() => setActiveTab('media')}
            >
              <ImagePlus size={15} />
              <span>Media</span>
            </button>
            <button
              type="button"
              className={activeTab === 'social' ? 'active' : ''}
              onClick={() => setActiveTab('social')}
            >
              <Send size={15} />
              <span>Social</span>
            </button>
          </nav>

          <div className="vs-inspector-body">
            {/* TAB 1: LAYOUT & PRESETS */}
            {activeTab === 'layout' && (
              <div className="vs-tab-content">
                <div className="vs-section-heading">
                  <h3>Design Layout Presets</h3>
                  <p>Choose an aesthetic structure tailored to your brand identity.</p>
                </div>

                <div className="vs-layout-grid">
                  {LAYOUT_PRESETS.map(lp => {
                    const isSelected = (template.layout ?? 'bold-editorial') === lp.id;
                    return (
                      <button
                        key={lp.id}
                        type="button"
                        className={`vs-layout-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => updateTemplate({ layout: lp.id })}
                      >
                        <span className="vs-layout-icon">{lp.icon}</span>
                        <div className="vs-layout-info">
                          <strong>{lp.name}</strong>
                          <p>{lp.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="vs-divider" />

                <div className="vs-field-group">
                  <label>Format Mode</label>
                  <div className="vs-btn-group">
                    {(['Image', 'Carousel', 'Video'] as Format[]).map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        className={`vs-choice-btn ${template.format === fmt ? 'active' : ''}`}
                        onClick={() => {
                          updateTemplate({
                            format: fmt,
                            aspectRatio: fmt === 'Video' ? 'vertical' : template.aspectRatio,
                          });
                        }}
                      >
                        {fmt === 'Image' && <FileImage size={14} />}
                        {fmt === 'Carousel' && <Layers size={14} />}
                        {fmt === 'Video' && <Video size={14} />}
                        <span>{fmt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {template.format === 'Video' && (
                  <div className="vs-video-motion-box">
                    <h4>Vertical Reel / Video Motion</h4>
                    <div className="vs-field-group">
                      <label>Motion Style</label>
                      <select value={animStyle} onChange={e => setAnimStyle(e.target.value as AnimationStyle)}>
                        <option value="soft-fade">Soft Cinematic Fade</option>
                        <option value="slow-zoom">Ken Burns Slow Zoom</option>
                        <option value="text-rise">Kinetic Text Rise</option>
                        <option value="cinematic-pan">Cinematic Pan Across Media</option>
                      </select>
                    </div>

                    <div className="vs-field-group">
                      <label>Duration</label>
                      <select value={animDuration} onChange={e => setAnimDuration(Number(e.target.value) as 4 | 6 | 8)}>
                        <option value={4}>4 seconds (Short Reel)</option>
                        <option value={6}>6 seconds (Standard)</option>
                        <option value={8}>8 seconds (Extended loop)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="button primary full-width"
                      onClick={handleExportWebM}
                      disabled={!!busyExport}
                    >
                      <Play size={15} />
                      <span>{busyExport === 'webm' ? 'Rendering WebM…' : 'Export Animated Reel (WebM)'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CONTENT */}
            {activeTab === 'content' && (
              <div className="vs-tab-content">
                <div className="vs-section-heading">
                  <h3>Creative Copy</h3>
                  <p>Fine-tune the typography and copy elements displayed on the visual card.</p>
                </div>

                <div className="vs-field-group">
                  <label>Pill Badge / Tag</label>
                  <input
                    placeholder="e.g. NEW DROP, MANIFESTO, LIMITED"
                    maxLength={24}
                    value={template.badge ?? ''}
                    onChange={e => updateTemplate({ badge: e.target.value })}
                  />
                </div>

                <div className="vs-field-group">
                  <label>Eyebrow / Category</label>
                  <input
                    placeholder={brand.name}
                    maxLength={40}
                    value={template.eyebrow ?? ''}
                    onChange={e => updateTemplate({ eyebrow: e.target.value })}
                  />
                </div>

                <div className="vs-field-group">
                  <label>Graphic Headline</label>
                  <textarea
                    rows={2}
                    maxLength={90}
                    value={currentSlide.headline}
                    onChange={e => updateCurrentSlide({ headline: e.target.value })}
                  />
                </div>

                <div className="vs-field-group">
                  <label>Headline Size</label>
                  <div className="vs-btn-group">
                    {(['small', 'medium', 'large', 'hero', 'display'] as const).map(size => (
                      <button
                        key={size}
                        type="button"
                        className={`vs-choice-btn ${(template.headlineFontSize ?? 'medium') === size ? 'active' : ''}`}
                        onClick={() => updateTemplate({ headlineFontSize: size })}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="vs-field-group">
                  <label className="vs-toggle-label">
                    <input
                      type="checkbox"
                      checked={template.headlineUppercase ?? brand.uppercase}
                      onChange={e => updateTemplate({ headlineUppercase: e.target.checked })}
                    />
                    <span>Uppercase Headline (ALL CAPS)</span>
                  </label>
                </div>

                <div className="vs-field-group">
                  <label>Supporting Subcopy</label>
                  <textarea
                    rows={3}
                    maxLength={220}
                    value={currentSlide.supportingCopy ?? ''}
                    onChange={e => updateCurrentSlide({ supportingCopy: e.target.value })}
                  />
                </div>

                <div className="vs-field-group">
                  <label>Call to Action Label</label>
                  <input
                    placeholder="e.g. Explore Collection, Shop Now"
                    maxLength={32}
                    value={currentSlide.cta ?? ''}
                    onChange={e => updateCurrentSlide({ cta: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: STYLE & BRAND */}
            {activeTab === 'style' && (
              <div className="vs-tab-content">
                <div className="vs-section-heading">
                  <h3>Typography & Palette</h3>
                  <p>Custom styling mapped to {project.name}&apos;s verified brand identity.</p>
                </div>

                {/* Fonts */}
                <div className="vs-field-group">
                  <label>Heading Font</label>
                  <select
                    value={template.headingFont ?? brand.headingFont}
                    onChange={e => updateTemplate({ headingFont: e.target.value })}
                  >
                    {FONT_CHOICES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="vs-field-group">
                  <label>Body Font</label>
                  <select
                    value={template.bodyFont ?? brand.bodyFont}
                    onChange={e => updateTemplate({ bodyFont: e.target.value })}
                  >
                    {FONT_CHOICES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* Alignment */}
                <div className="vs-field-group">
                  <label>Text Alignment</label>
                  <div className="vs-btn-group">
                    {(['left', 'center', 'right'] as const).map(align => (
                      <button
                        key={align}
                        type="button"
                        className={`vs-choice-btn ${(template.textAlign ?? 'left') === align ? 'active' : ''}`}
                        onClick={() => updateTemplate({ textAlign: align })}
                      >
                        {align.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="vs-field-group">
                  <label>Brand Colors Palette</label>
                  <div className="vs-color-chips">
                    <div className="vs-color-chip-item">
                      <input
                        type="color"
                        value={customPrimary}
                        onChange={e => setCustomPrimary(e.target.value)}
                      />
                      <span>Primary</span>
                    </div>
                    <div className="vs-color-chip-item">
                      <input
                        type="color"
                        value={customSecondary}
                        onChange={e => setCustomSecondary(e.target.value)}
                      />
                      <span>Accent</span>
                    </div>
                    <div className="vs-color-chip-item">
                      <input
                        type="color"
                        value={customBg}
                        onChange={e => setCustomBg(e.target.value)}
                      />
                      <span>Canvas</span>
                    </div>
                    <div className="vs-color-chip-item">
                      <input
                        type="color"
                        value={customText}
                        onChange={e => setCustomText(e.target.value)}
                      />
                      <span>Text</span>
                    </div>
                  </div>
                </div>

                {/* Overlay Opacity Slider */}
                <div className="vs-field-group">
                  <div className="vs-slider-head">
                    <label>Media Scrim Darkening</label>
                    <span>{template.overlayOpacity ?? 40}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={template.overlayOpacity ?? 40}
                    onChange={e => updateTemplate({ overlayOpacity: Number(e.target.value) })}
                  />
                </div>

                {/* Content Density / Margin */}
                <div className="vs-field-group">
                  <label>Content Density & Margins</label>
                  <div className="vs-btn-group">
                    {(['compact', 'normal', 'spacious'] as const).map(density => (
                      <button
                        key={density}
                        type="button"
                        className={`vs-choice-btn ${(template.contentPadding ?? 'normal') === density ? 'active' : ''}`}
                        onClick={() => updateTemplate({ contentPadding: density })}
                      >
                        {density === 'compact' ? 'Compact' : density === 'normal' ? 'Standard' : 'Spacious'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Controls */}
                <div className="vs-field-group">
                  <label className="vs-toggle-label">
                    <input
                      type="checkbox"
                      checked={template.showLogo ?? true}
                      onChange={e => updateTemplate({ showLogo: e.target.checked })}
                    />
                    <span>Show Brand Logo Watermark</span>
                  </label>
                </div>

                {(template.showLogo ?? true) && (
                  <>
                    <div className="vs-field-group">
                      <label>Logo Size</label>
                      <div className="vs-btn-group">
                        {(['small', 'medium', 'large', 'xlarge'] as const).map(sz => (
                          <button
                            key={sz}
                            type="button"
                            className={`vs-choice-btn ${(template.logoSize ?? 'medium') === sz ? 'active' : ''}`}
                            onClick={() => updateTemplate({ logoSize: sz })}
                          >
                            {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : sz === 'large' ? 'L' : 'XL'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="vs-field-group">
                      <label>Logo Placement</label>
                      <select
                        value={template.logoPosition ?? 'top-left'}
                        onChange={e => updateTemplate({ logoPosition: e.target.value as any })}
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-center">Top Center</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom">Bottom Center</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 4: MEDIA ASSETS */}
            {activeTab === 'media' && (
              <div className="vs-tab-content">
                <div className="vs-section-heading">
                  <h3>Project & Crawled Media</h3>
                  <p>Select from website-discovered assets, local uploads, or upload new files.</p>
                </div>

                {/* Upload Button */}
                <label className="vs-upload-dropzone">
                  <Upload size={18} />
                  <span>Upload local image or video</span>
                  <small>PNG, JPG, WebP, MP4 (saved in this browser)</small>
                  <input type="file" accept="image/*,video/*" onChange={handleFileUpload} />
                </label>

                {/* Text-only option */}
                <button
                  type="button"
                  className={`vs-media-card-item ${!currentSlide.image ? 'active' : ''}`}
                  onClick={() => updateCurrentSlide({ image: '' })}
                >
                  <div className="vs-media-placeholder">
                    <Palette size={20} />
                  </div>
                  <div className="vs-media-meta">
                    <strong>Text & Brand Colors Only</strong>
                    <p>Typography-driven graphic without imagery</p>
                  </div>
                </button>

                {/* Project Assets Grid */}
                <div className="vs-media-library-grid">
                  {project.media.map(asset => {
                    const isSelected = currentSlide.image === asset.url;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        className={`vs-asset-thumb ${isSelected ? 'active' : ''}`}
                        onClick={() => updateCurrentSlide({ image: asset.url, mediaKind: asset.kind })}
                        title={asset.name}
                      >
                        <img src={mediaProxyURL(asset.url)} alt={asset.name} onError={e => { e.currentTarget.style.opacity = '0'; }} />
                        <span className="vs-asset-kind">{asset.kind}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: SOCIAL PLATFORMS COPY */}
            {activeTab === 'social' && (
              <div className="vs-tab-content">
                <div className="vs-section-heading">
                  <h3>Social Captions & Notes</h3>
                  <p>Dual-platform formatted copy ready for Instagram and TikTok.</p>
                </div>

                <div className="vs-platform-tabs">
                  <button
                    type="button"
                    className={activePlatform === 'instagram' ? 'active' : ''}
                    onClick={() => setActivePlatform('instagram')}
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    className={activePlatform === 'tiktok' ? 'active' : ''}
                    onClick={() => setActivePlatform('tiktok')}
                  >
                    TikTok
                  </button>
                </div>

                <div className="vs-field-group">
                  <label>Caption</label>
                  <textarea
                    rows={5}
                    value={variant.caption}
                    onChange={e => {
                      updateTemplate({
                        variants: {
                          ...template.variants,
                          [activePlatform]: { ...variant, caption: e.target.value },
                        },
                      });
                    }}
                  />
                </div>

                <div className="vs-field-group">
                  <label>Hashtags</label>
                  <input
                    value={variant.hashtags}
                    onChange={e => {
                      updateTemplate({
                        variants: {
                          ...template.variants,
                          [activePlatform]: { ...variant, hashtags: e.target.value },
                        },
                      });
                    }}
                  />
                </div>

                <div className="vs-field-group">
                  <label>Call to Action / Link</label>
                  <input
                    value={variant.cta}
                    onChange={e => {
                      updateTemplate({
                        variants: {
                          ...template.variants,
                          [activePlatform]: { ...variant, cta: e.target.value },
                        },
                      });
                    }}
                  />
                </div>

                <div className="vs-field-group">
                  <label>Shooting & Production Notes</label>
                  <textarea
                    rows={3}
                    value={variant.notes}
                    onChange={e => {
                      updateTemplate({
                        variants: {
                          ...template.variants,
                          [activePlatform]: { ...variant, notes: e.target.value },
                        },
                      });
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="button secondary full-width"
                  onClick={copyTextPackage}
                >
                  <Copy size={14} />
                  <span>Copy Complete Post Package</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 3. SCHEDULE MODAL DIALOG */}
      {showScheduleDialog && (
        <div className="vs-dialog-overlay" onClick={() => setShowScheduleDialog(false)}>
          <div className="vs-dialog-card" onClick={e => e.stopPropagation()}>
            <div className="vs-dialog-head">
              <div>
                <span className="tiny-tag">CONTENT CALENDAR</span>
                <h3>Add to {project.name}&apos;s Calendar</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowScheduleDialog(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              <div className="vs-dialog-fields">
                <label>
                  Planned Date
                  <input
                    type="date"
                    required
                    value={postDate}
                    onChange={e => setPostDate(e.target.value)}
                  />
                </label>
                <label>
                  Time
                  <input
                    type="time"
                    required
                    value={postTime}
                    onChange={e => setPostTime(e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={postStatus}
                    onChange={e => setPostStatus(e.target.value as Status)}
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Planned</option>
                    <option value="published">Published</option>
                  </select>
                </label>
              </div>

              <div className="vs-dialog-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowScheduleDialog(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button primary">
                  <CalendarDays size={16} />
                  <span>Confirm Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
