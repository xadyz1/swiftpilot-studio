import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
} from "lucide-react";
import type { BrandKit } from "@shared/studio";
import { artworkColors } from "../lib/brand";
import type { ContentTemplate } from "../data/content";
import type { PlannedPost } from "../lib/planner";
import { dateKey } from "../lib/planner";
import { PlatformIcon } from "./PostCard";

interface Props {
  brand?: BrandKit;
  date: Date;
  view: "month" | "week";
  posts: PlannedPost[];
  templates: ContentTemplate[];
  onDateChange: (date: Date) => void;
  onViewChange: (view: "month" | "week") => void;
  onSelect: (post: PlannedPost) => void;
  onAdd: (date: string) => void;
  onMove: (id: string, date: string) => void;
}
export default function ContentCalendar({
  brand,
  date,
  view,
  posts,
  templates,
  onDateChange,
  onViewChange,
  onSelect,
  onAdd,
  onMove,
}: Props) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const gridStart =
    view === "month"
      ? startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
      : weekStart;
  const monthEnd = endOfMonth(date);
  const cellCount =
    view === "week"
      ? 7
      : Math.ceil((differenceInCalendarDays(monthEnd, gridStart) + 1) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, i) =>
    addDays(gridStart, i)
  );
  const today = dateKey(new Date());
  const shift = (direction: number) =>
    onDateChange(
      view === "month" ? addMonths(date, direction) : addWeeks(date, direction)
    );
  return (
    <section className="calendar-panel">
      <div className="calendar-toolbar">
        <div className="month-control">
          <h2>
            {view === "month"
              ? format(date, "MMMM yyyy")
              : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`}
          </h2>
          <div className="arrow-group">
            <button aria-label="Previous period" onClick={() => shift(-1)}>
              <ChevronLeft size={17} />
            </button>
            <button aria-label="Next period" onClick={() => shift(1)}>
              <ChevronRight size={17} />
            </button>
          </div>
          <button
            className="today-button"
            onClick={() => onDateChange(new Date())}
          >
            Today
          </button>
        </div>
        <div className="view-toggle">
          <button
            className={view === "month" ? "active" : ""}
            onClick={() => onViewChange("month")}
          >
            Month
          </button>
          <button
            className={view === "week" ? "active" : ""}
            onClick={() => onViewChange("week")}
          >
            Week
          </button>
        </div>
      </div>
      <div className="calendar-scroll">
        <div className={`calendar-grid ${view}`}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}
          {days.map(day => {
            const key = dateKey(day);
            const dayPosts = posts
              .filter(post => post.date === key)
              .sort((a, b) => a.time.localeCompare(b.time));
            return (
              <div
                key={key}
                className={`calendar-day ${!isSameMonth(day, date) && view === "month" ? "outside" : ""} ${key === today ? "is-today" : ""}`}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  e.currentTarget.classList.add("drop-target");
                }}
                onDragLeave={e =>
                  e.currentTarget.classList.remove("drop-target")
                }
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("drop-target");
                  const id = e.dataTransfer.getData(
                    "application/x-pocket-post"
                  );
                  if (id) onMove(id, key);
                }}
              >
                <div className="day-heading">
                  <span className="day-number">{format(day, "d")}</span>
                  <button
                    className="day-add"
                    aria-label={`Plan a post for ${format(day, "MMMM d")}`}
                    onClick={() => onAdd(key)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div className="day-posts">
                  {dayPosts.map(post => {
                    const template =
                      post.content ??
                      templates.find(t => t.id === post.templateId);
                    if (!template) return null;
                    return (
                      <button
                        key={post.id}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData(
                            "application/x-pocket-post",
                            post.id
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => onSelect(post)}
                        className={`calendar-post tone-${template.tone} status-${post.status}`}
                          style={brand ? {background:artworkColors(brand,template.tone).background,color:artworkColors(brand,template.tone).text,borderLeft:`3px solid ${artworkColors(brand,template.tone).accent}`} : undefined}
                        title={`${template.title} · ${post.status} · Click to edit`}
                      >
                        <span className="calendar-post-top">
                          <PlatformIcon platform={post.platform} size={12} />
                          <span>{post.time}</span>
                          <span className={`status-dot ${post.status}`} />
                        </span>
                        <span className="calendar-post-title">
                          {template.title}
                        </span>
                        {view === "week" && (
                          <>
                            <img src={template.image} alt={template.title} />
                            <span className="week-format">
                              {template.format} · {post.status}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                {view === "week" && dayPosts.length === 0 && (
                  <button className="week-empty" onClick={() => onAdd(key)}>
                    <Plus size={17} />
                    Add a post
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="calendar-footer">
        <span>
          <GripVertical size={14} />
          Drag posts to move them. Click to edit.
        </span>
        <div className="status-legend">
          <span>
            <i className="status-dot draft" />
            Draft
          </span>
          <span>
            <i className="status-dot scheduled" />
            Planned
          </span>
          <span>
            <i className="status-dot published" />
            Published
          </span>
        </div>
      </div>
    </section>
  );
}
