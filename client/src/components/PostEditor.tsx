import { useState } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  Info,
  Save,
  Sparkles,
  Trash2,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { ContentTemplate, Platform } from "../data/content";
import type { BrandKit, MediaAsset } from "@shared/studio";
import { hungryBrand } from "../lib/brand";
import type { PlannedPost, Status } from "../lib/planner";
import { downloadText } from "../lib/planner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { PlatformIcon } from "./PostCard";
import CreativeStudio from "./CreativeStudio";

interface Props {
  template: ContentTemplate;
  brand?: BrandKit;
  website?: string;
  media?: MediaAsset[];
  post?: PlannedPost;
  targetDate: string;
  onClose: () => void;
  onSave: (
    template: ContentTemplate,
    post: Omit<PlannedPost, "id">,
    id?: string
  ) => void;
  onSaveTemplate: (template: ContentTemplate) => void;
  onRemove: (id: string) => void;
  onOpenStudio?: (template: ContentTemplate) => void;
}

const HEADLINE_SIZES: { id: string; label: string; multiplier: number }[] = [
  { id: "small", label: "Small", multiplier: 0.75 },
  { id: "medium", label: "Medium", multiplier: 1.0 },
  { id: "large", label: "Large", multiplier: 1.25 },
  { id: "hero", label: "Hero", multiplier: 1.5 },
  { id: "display", label: "Display", multiplier: 1.85 },
];

const LOGO_SIZES: { id: string; label: string }[] = [
  { id: "small", label: "S" },
  { id: "medium", label: "M" },
  { id: "large", label: "L" },
  { id: "xlarge", label: "XL" },
];

const LOGO_POSITIONS: { id: string; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-center", label: "Top center" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
  { id: "bottom", label: "Bottom center" },
  { id: "hidden", label: "Hidden" },
];

const CONTENT_DENSITIES: { id: string; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "spacious", label: "Spacious" },
];

export default function PostEditor({
  template,
  brand = hungryBrand,
  website = "https://hungrypockets.eu/",
  media = [],
  post,
  targetDate,
  onClose,
  onSave,
  onSaveTemplate,
  onRemove,
  onOpenStudio,
}: Props) {
  const [edited, setEdited] = useState<ContentTemplate>(() =>
    JSON.parse(JSON.stringify(template))
  );
  const [platform, setPlatform] = useState<Platform>(
    post?.platform ?? template.platforms[0]
  );
  const [date, setDate] = useState(post?.date ?? targetDate);
  const [time, setTime] = useState(post?.time ?? "18:00");
  const [status, setStatus] = useState<Status>(post?.status ?? "scheduled");
  const [copied, setCopied] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const variant = edited.variants[platform];
  const update = (
    field: "caption" | "hashtags" | "cta" | "notes",
    value: string
  ) =>
    setEdited(prev => ({
      ...prev,
      variants: {
        ...prev.variants,
        [platform]: { ...prev.variants[platform], [field]: value },
      },
    }));
  const updateTemplate = (patch: Partial<ContentTemplate>) =>
    setEdited(prev => ({ ...prev, ...patch }));
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied. Your next post is one paste away.");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error(
        "Clipboard is not available. Select the text to copy it, or download the post copy."
      );
    }
  }
  const fullCopy = `${variant.caption}

${variant.cta}

${variant.hashtags}`;
  const alignIcons: Record<string, React.ElementType> = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
  };
  const CurrentAlignIcon = alignIcons[edited.textAlign ?? "left"];
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="post-editor" showCloseButton={false}>
        <div className="editor-header">
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <DialogTitle>
              {post ? "Edit planned post" : "Post studio"}
            </DialogTitle>
            <DialogDescription>
              Ready-to-use copy. Your finishing touch.
            </DialogDescription>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onOpenStudio && (
              <button
                type="button"
                className="button secondary"
                style={{ fontSize: "11px", padding: "6px 12px", height: "32px", gap: "6px" }}
                onClick={() => {
                  onClose();
                  onOpenStudio(edited);
                }}
                title="Open the full Visual Studio"
              >
                <Sparkles size={14} />
                <span>Visual Studio</span>
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              style={{ fontSize: "11px", padding: "6px 12px", height: "32px", gap: "6px" }}
              onClick={() => setShowStylePanel(!showStylePanel)}
              title="Style & design"
            >
              <Type size={14} />
              <span>Style</span>
            </button>
            <button
              className="icon-button"
              aria-label="Close post editor"
              onClick={onClose}
            >
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="editor-layout">
          <div className="editor-visual-workspace">
            <CreativeStudio
              template={edited}
              brand={brand}
              website={website}
              media={media}
              platform={platform}
              onChange={setEdited}
              onSave={value => {
                setEdited(value);
                toast.success("Visual edits are ready to save with this post.");
              }}
            />
          </div>
          <form
            className="editor-form"
            onSubmit={e => {
              e.preventDefault();
              if (!edited.title.trim()) return;
              onSave(
                edited,
                { templateId: edited.id, platform, date, time, status },
                post?.id
              );
            }}
          >
            {showStylePanel && (
              <div className="style-panel">
                <div className="style-section">
                  <span className="style-section-title">Typography</span>
                  <div className="style-grid">
                    <div className="style-control">
                      <label>Headline size</label>
                      <div className="btn-group">
                        {HEADLINE_SIZES.map(size => (
                          <button
                            key={size.id}
                            type="button"
                            className={`style-btn ${(edited.headlineFontSize ?? "medium") === size.id ? "active" : ""}`}
                            onClick={() =>
                              updateTemplate({ headlineFontSize: size.id as ContentTemplate["headlineFontSize"] })}
                          >
                            {size.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="style-control">
                      <label>Alignment</label>
                      <div className="btn-group">
                        {["left", "center", "right"].map(align => (
                          <button
                            key={align}
                            type="button"
                            className={`style-btn ${(edited.textAlign ?? "left") === align ? "active" : ""}`}
                            onClick={() => updateTemplate({ textAlign: align as ContentTemplate["textAlign"] })}
                          >
                            <CurrentAlignIcon size={13} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="style-control">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={edited.headlineUppercase ?? brand.uppercase}
                          onChange={e =>
                            updateTemplate({ headlineUppercase: e.target.checked })
                          }
                        />
                        <span>Uppercase headline</span>
                      </label>
                    </div>
                    <div className="style-control">
                      <label>Content density</label>
                      <div className="btn-group">
                        {CONTENT_DENSITIES.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            className={`style-btn ${(edited.contentPadding ?? "normal") === d.id ? "active" : ""}`}
                            onClick={() => updateTemplate({ contentPadding: d.id as ContentTemplate["contentPadding"] })}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="style-section">
                  <span className="style-section-title">Logo</span>
                  <div className="style-grid">
                    <div className="style-control">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={edited.showLogo ?? true}
                          onChange={e =>
                            updateTemplate({ showLogo: e.target.checked })
                          }
                        />
                        <span>Show logo</span>
                      </label>
                    </div>
                    {(edited.showLogo ?? true) && (
                      <>
                        <div className="style-control">
                          <label>Logo size</label>
                          <div className="btn-group">
                            {LOGO_SIZES.map(sz => (
                              <button
                                key={sz.id}
                                type="button"
                                className={`style-btn ${(edited.logoSize ?? "medium") === sz.id ? "active" : ""}`}
                                onClick={() => updateTemplate({ logoSize: sz.id as ContentTemplate["logoSize"] })}
                              >
                                {sz.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="style-control">
                          <label>Logo position</label>
                          <div className="btn-group">
                            {LOGO_POSITIONS.map(pos => (
                              <button
                                key={pos.id}
                                type="button"
                                className={`style-btn ${(edited.logoPosition ?? "top-left") === pos.id ? "active" : ""}`}
                                onClick={() => updateTemplate({ logoPosition: pos.id as ContentTemplate["logoPosition"] })}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="platform-tabs">
              {edited.platforms.map(p => (
                <button
                  type="button"
                  key={p}
                  className={platform === p ? "active" : ""}
                  onClick={() => setPlatform(p)}
                >
                  <PlatformIcon platform={p} size={17} />
                  {p === "instagram" ? "Instagram" : "TikTok"}
                </button>
              ))}
            </div>
            <div className="post-media-controls">
              <label>Creative
                <select
                  value={edited.image}
                  onChange={e => {
                    const asset = media.find(item => item.url === e.target.value);
                    setEdited({
                      ...edited,
                      image: e.target.value,
                      mediaKind: asset?.kind ?? "image",
                    });
                  }}
                >
                  <option value="">Text-only graphic</option>
                  {edited.image && !media.some(item => item.url === edited.image) && (
                    <option value={edited.image}>Current media</option>
                  )}
                  {media.map(item => (
                    <option key={item.id} value={item.url}>
                      {item.name} · {item.kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>Theme color
                <select
                  value={edited.tone}
                  onChange={e =>
                    setEdited({ ...edited, tone: e.target.value as ContentTemplate["tone"] })}
                >
                  <option value="mint">Light · primary accent</option>
                  <option value="lavender">Dark · primary accent</option>
                  <option value="peach">Light · secondary accent</option>
                  <option value="yellow">Warm · primary accent</option>
                </select>
              </label>
            </div>
            <div className="form-two">
              <label>
                Post title
                <input
                  required
                  maxLength={80}
                  value={edited.title}
                  onChange={e =>
                    setEdited({ ...edited, title: e.target.value })
                  }
                />
              </label>
              <label>
                Graphic headline
                <input
                  maxLength={55}
                  value={edited.headline}
                  onChange={e =>
                    setEdited({ ...edited, headline: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              <span className="label-row">
                Caption
                <button type="button" onClick={() => copy(variant.caption)}>
                  <Copy size={13} />
                  Copy
                </button>
              </span>
              <textarea
                rows={4}
                value={variant.caption}
                onChange={e => update("caption", e.target.value)}
              />
            </label>
            <label>
              <span className="label-row">
                Hashtags
                <button type="button" onClick={() => copy(variant.hashtags)}>
                  <Copy size={13} />
                  Copy
                </button>
              </span>
              <textarea
                className="hashtag-input"
                rows={2}
                value={variant.hashtags}
                onChange={e => update("hashtags", e.target.value)}
              />
            </label>
            <label>
              Call to action / link
              <textarea
                rows={2}
                value={variant.cta}
                onChange={e => update("cta", e.target.value)}
              />
            </label>
            <label>
              Creative & filming notes
              <textarea
                rows={3}
                value={variant.notes}
                onChange={e => update("notes", e.target.value)}
              />
            </label>
            <div className="copy-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => copy(fullCopy)}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}Copy full post
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  downloadText(
                    `${edited.title}\n${platform.toUpperCase()}\n\n${fullCopy}\n\nCREATIVE NOTES\n${variant.notes}`,
                    `${edited.id}-${platform}-copy.txt`
                  )
                }
              >
                <Download size={14} />
                Download copy
              </button>
            </div>
            <div className="schedule-section">
              <div className="section-label">
                <CalendarDays size={15} />
                {post ? "Your schedule" : "Add to calendar"}
              </div>
              <div className="schedule-fields">
                <label>
                  Data
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </label>
                <label>
                  Local time
                  <input
                    required
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as Status)}
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </label>
              </div>
              <p>
                <Info size={13} />
                Planning only. Publish manually on your social channels.
              </p>
            </div>
            <div className="editor-actions">
              {post ? (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => onRemove(post.id)}
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onSaveTemplate(edited)}
                >
                  <Save size={15} />
                  Save template
                </button>
              )}
              <button className="button primary" type="submit">
                <CalendarDays size={16} />
                {post ? "Save changes" : "Add to calendar"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
