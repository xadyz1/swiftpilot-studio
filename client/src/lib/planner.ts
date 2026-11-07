import {
  templates,
  type ContentTemplate,
  type Platform,
} from "../data/content";

export type Status = "draft" | "scheduled" | "published";
export interface PlannedPost {
  id: string;
  templateId: string;
  platform: Platform;
  date: string;
  time: string;
  status: Status;
  content?: ContentTemplate;
}
export interface PlannerState {
  posts: PlannedPost[];
  edits: Record<string, ContentTemplate>;
}
export const STORAGE_KEY = "hungrypockets-social-studio-v1";

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}
export function seedPlanner(now = new Date()): PlannerState {
  const ids = [
    "pocket-origin",
    "off-duty-uniform",
    "detail-check",
    "street-ready",
    "crop-energy",
    "top-it-off",
    "made-for-motion",
    "stay-hungry",
    "one-tee-three-fits",
    "after-hours",
    "beanie-season",
    "choose-your-fit",
  ];
  const days = [2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, 27];
  return {
    posts: ids.map((templateId, index) => {
      const content = templates.find(t => t.id === templateId)!;
      return {
        id: `starter-${index}`,
        templateId,
        platform:
          index % 3 === 1 && content.platforms.includes("tiktok")
            ? "tiktok"
            : "instagram",
        date: dateKey(new Date(now.getFullYear(), now.getMonth(), days[index])),
        time: index % 3 === 1 ? "19:00" : "18:00",
        status: index < 8 ? "scheduled" : "draft",
        content,
      };
    }),
    edits: {},
  };
}
function validContent(value: unknown): value is ContentTemplate {
  if (!value || typeof value !== "object") return false;
  const t = value as ContentTemplate;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.headline === "string" &&
    typeof t.campaign === "string" &&
    typeof t.theme === "string" &&
    typeof t.image === "string" &&
    ["mint", "lavender", "peach", "yellow"].includes(t.tone) &&
    ["Image", "Carousel", "Video"].includes(t.format) &&
    Array.isArray(t.platforms) &&
    t.platforms.length > 0 &&
    t.platforms.every(p => ["instagram", "tiktok"].includes(p)) &&
    ["instagram", "tiktok"].every(p => {
      const v = t.variants?.[p as Platform];
      return (
        v &&
        ["caption", "hashtags", "cta", "notes"].every(
          key => typeof v[key as keyof typeof v] === "string"
        )
      );
    })
  );
}
export function loadPlanner(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlannerState;
      if (
        Array.isArray(parsed.posts) &&
        parsed.edits &&
        typeof parsed.edits === "object" &&
        parsed.posts.every(
          p =>
            p &&
            typeof p.id === "string" &&
            typeof p.templateId === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
            ["instagram", "tiktok"].includes(p.platform) &&
            ["draft", "scheduled", "published"].includes(p.status)
        )
      ) {
        const edits = Object.fromEntries(
          Object.entries(parsed.edits).filter(
            ([id, t]) => validContent(t) && t.id === id
          )
        );
        // Upgrade older records without discarding captions, dates, or statuses.
        const posts = parsed.posts.flatMap(p => {
          const base = templates.find(t => t.id === p.templateId);
          if (!base) return [];
          const content = validContent(p.content)
            ? p.content
            : (edits[p.templateId] ?? base);
          return [
            {
              ...p,
              content,
              platform: content.platforms.includes(p.platform)
                ? p.platform
                : content.platforms[0],
            },
          ];
        });
        return { edits, posts };
      }
    }
  } catch {
    /* A blocked storage area falls back to editable starter content. */
  }
  return seedPlanner();
}
export function savePlanner(state: PlannerState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function downloadText(
  text: string,
  name: string,
  type = "text/plain"
): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function buildCSV(
  posts: PlannedPost[],
  contents: ContentTemplate[]
): string {
  const columns = [
    "Date",
    "Time (your local time)",
    "Platform",
    "Status",
    "Title",
    "Caption",
    "Hashtags",
    "CTA",
    "Creative notes",
  ];
  const rows = posts
    .filter(p => p.content || contents.some(t => t.id === p.templateId))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .map(post => {
      const template =
        post.content ?? contents.find(t => t.id === post.templateId)!;
      const variant = template.variants[post.platform];
      return [
        post.date,
        post.time,
        post.platform,
        post.status,
        template.title,
        variant.caption,
        variant.hashtags,
        variant.cta,
        variant.notes,
      ];
    });
  const escape = (cell: string) =>
    `"${(/^[=+@-]/.test(cell) ? "'" : "") + cell.replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [columns, ...rows].map(row => row.map(escape).join(",")).join("\r\n")
  );
}
export function exportCSV(
  posts: PlannedPost[],
  contents: ContentTemplate[]
): void {
  downloadText(buildCSV(posts, contents), "hungry-pockets-content-calendar.csv", "text/csv;charset=utf-8");
}
