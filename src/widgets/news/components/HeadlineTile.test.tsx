// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HeadlineTile } from "@/widgets/news/components/HeadlineTile";
import type { NewsItem } from "@/widgets/news/types";

const NOW = Date.parse("2026-08-23T12:00:00.000Z");

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "a",
    title: "Markets rally as inflation cools",
    link: "https://example.com/a",
    source: "BBC News",
    sourceKey: "bbc",
    sourceUrl: "https://bbc.co.uk",
    publishedAt: NOW - 2 * 60 * 60 * 1000,
    image: null,
    dek: "A summary",
    related: [],
    ...overrides,
  };
}

function renderTile(overrides: Partial<NewsItem> = {}, isSaved = false) {
  return render(
    <TooltipProvider>
      <HeadlineTile
        item={item(overrides)}
        now={NOW}
        openBehavior="currentTab"
        isRead={false}
        isNew={false}
        isSaved={isSaved}
        highlightTerms={[]}
        onRead={vi.fn()}
        onToggleSaved={vi.fn()}
      />
    </TooltipProvider>,
  );
}

describe("HeadlineTile", () => {
  it("keeps the save control out of the headline link, so each is its own target", () => {
    renderTile({}, true);

    const save = screen.getByRole("button", { name: /remove/i });
    const link = screen.getByRole("link");

    expect(link).not.toContainElement(save);
    expect(link).toHaveAccessibleName(/^Markets rally as inflation cools/);
  });
});
