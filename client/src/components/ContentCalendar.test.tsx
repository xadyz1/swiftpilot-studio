import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContentCalendar from "./ContentCalendar";
import { templates } from "../data/content";
import { seedPlanner } from "../lib/planner";

function renderCalendar(
  date: Date,
  view: "month" | "week" = "month",
  posts = seedPlanner(date).posts
) {
  return renderToStaticMarkup(
    createElement(ContentCalendar, {
      date,
      view,
      posts,
      templates,
      onDateChange: () => {},
      onViewChange: () => {},
      onSelect: () => {},
      onAdd: () => {},
      onMove: () => {},
    })
  );
}
describe("calendar presentation", () => {
  it("does not render an extra row for a month ending Sunday", () => {
    const html = renderCalendar(new Date(2026, 4, 15));
    expect((html.match(/class="calendar-day /g) ?? []).length).toBe(35);
    const feb = renderCalendar(new Date(2027, 1, 15));
    expect((feb.match(/class="calendar-day /g) ?? []).length).toBe(28);
  });
  it("renders exactly seven days in weekly view", () => {
    expect(
      (
        renderCalendar(new Date(2026, 10, 6), "week").match(
          /class="calendar-day /g
        ) ?? []
      ).length
    ).toBe(7);
  });
  it("keeps individual post overrides separate from the library and other posts", () => {
    const date = new Date(2026, 10, 6);
    const base = seedPlanner(date).posts[0];
    const overridden = {
      ...base,
      id: "second-use",
      content: { ...templates[0], title: "My unique planned post" },
    };
    const html = renderCalendar(date, "month", [base, overridden]);
    expect(html).toContain("My unique planned post");
    expect(html).toContain("The pocket story");
    expect(templates[0].title).toBe("The pocket story");
  });
});
