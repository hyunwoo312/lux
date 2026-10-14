// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NewsStoryList } from "@/widgets/news/components/NewsStoryList";
import { openUrl } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

vi.mock("@/lib/open-url", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/open-url")>()),
  openUrl: vi.fn(),
}));

const NOW = Date.parse("2026-10-14T12:00:00Z");
const story = (id: string, overrides: Partial<NewsItem> = {}): NewsItem => ({
  id,
  title: `Story ${id}`,
  link: `https://example.com/${id}`,
  source: "BBC News",
  sourceKey: "bbc",
  sourceUrl: null,
  publishedAt: NOW,
  image: null,
  dek: `Excerpt ${id}`,
  related: [],
  ...overrides,
});

function setup(overrides: Partial<ComponentProps<typeof NewsStoryList>> = {}) {
  const props: ComponentProps<typeof NewsStoryList> = {
    items: [story("a"), story("b")],
    now: NOW,
    openBehavior: "newTab",
    withThumbnail: false,
    withSource: true,
    loadImages: false,
    layout: "list",
    readTitles: new Set(),
    newTitles: new Set(),
    highlightTerms: [],
    savedLinks: new Set(),
    onRead: vi.fn(),
    onToggleRead: vi.fn(),
    onToggleSaved: vi.fn(),
    ...overrides,
  };
  const tree = (next: typeof props) => (
    <TooltipProvider>
      <NewsStoryList {...next} />
    </TooltipProvider>
  );
  const view = render(tree(props));
  return {
    props,
    rerender: (next: Partial<typeof props>) => view.rerender(tree({ ...props, ...next })),
  };
}

afterEach(() => vi.restoreAllMocks());

describe("NewsStoryList", () => {
  it("previews the complete title and excerpt without marking read, and separates actions", () => {
    const item = story("a", {
      title: "A long headline with enough detail to require more room than a compact feed row",
      dek: "The complete feed excerpt remains readable when the selected headline opens in the widget.",
    });
    const { props } = setup({ items: [item] });
    fireEvent.click(screen.getByRole("link", { name: item.title }));
    const preview = screen.getByRole("region", { name: "Story preview" });
    const title = within(preview).getByRole("heading", { name: item.title });
    expect(title).toHaveTextContent(item.title);
    expect(within(preview).getByText(item.dek!)).toBeInTheDocument();
    expect(title.firstElementChild).toHaveClass("line-clamp-none");
    expect(props.onRead).not.toHaveBeenCalled();

    fireEvent.click(within(preview).getByRole("button", { name: "Save" }));
    expect(props.onToggleSaved).toHaveBeenCalledWith(item);
    expect(props.onRead).not.toHaveBeenCalled();
    fireEvent.click(within(preview).getByRole("button", { name: "Mark read" }));
    expect(props.onToggleRead).toHaveBeenCalledWith(item.title.toLowerCase());
    fireEvent.click(within(preview).getByRole("link", { name: "Open" }));
    expect(props.onRead).toHaveBeenCalledWith(item.title.toLowerCase());
  });

  it("returns to the originating headline without moving its list scroll", async () => {
    setup();
    const link = screen.getByRole("link", { name: "Story b" });
    const list = screen.getByRole("list", { name: "Headlines" });
    list.scrollTop = 82;
    link.focus();
    const focus = vi.spyOn(link, "focus");
    fireEvent.click(link);
    fireEvent.keyDown(screen.getByRole("button", { name: "Headlines" }), { key: "Escape" });
    await waitFor(() => expect(link).toHaveFocus());
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(list.scrollTop).toBe(82);
  });

  it("retains the selected snapshot when unread filtering removes it and returns to a remaining story", async () => {
    const first = story("a");
    const removed = story("b");
    const { rerender } = setup({ items: [first, removed] });
    fireEvent.click(screen.getByRole("link", { name: removed.title }));
    rerender({ items: [first], readTitles: new Set(["story b"]) });
    const preview = screen.getByRole("region", { name: "Story preview" });
    expect(within(preview).getByRole("heading", { name: removed.title })).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: "Mark unread" })).toBeInTheDocument();
    fireEvent.keyDown(within(preview).getByRole("button", { name: "Headlines" }), {
      key: "Escape",
    });
    await waitFor(() => expect(screen.getByRole("link", { name: first.title })).toHaveFocus());
  });

  it("explains absent excerpts and respects disabled publisher images in preview", () => {
    setup({ items: [story("a", { dek: null, image: "https://example.com/image.jpg" })] });
    fireEvent.click(screen.getByRole("link", { name: "Story a" }));
    const preview = screen.getByRole("region", { name: "Story preview" });
    expect(within(preview).getByText(/This feed does not include an excerpt/)).toBeInTheDocument();
    expect(preview.querySelector("img")).toBeNull();
  });

  it("supports scoped save, read, open and next/previous shortcuts", () => {
    const { props } = setup();
    const first = screen.getByRole("link", { name: "Story a" });
    first.focus();
    fireEvent.keyDown(first, { key: "s" });
    fireEvent.keyDown(first, { key: "m" });
    fireEvent.keyDown(first, { key: "v" });
    expect(props.onToggleSaved).toHaveBeenCalledWith(props.items[0]);
    expect(props.onToggleRead).toHaveBeenCalledWith("story a");
    expect(openUrl).toHaveBeenCalledWith("https://example.com/a", "newTab");
    fireEvent.keyDown(first, { key: "j" });
    const second = screen.getByRole("link", { name: "Story b" });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: "k" });
    expect(first).toHaveFocus();

    fireEvent.click(first);
    fireEvent.keyDown(screen.getByRole("button", { name: "Headlines" }), { key: "j" });
    expect(screen.getByRole("heading", { name: "Story b" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Headlines" }), { key: "k" });
    expect(screen.getByRole("heading", { name: "Story a" })).toBeInTheDocument();
  });

  it("leaves modified clicks and auxiliary clicks as native publisher links", () => {
    const { props } = setup();
    const link = screen.getByRole("link", { name: "Story a" });
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    fireEvent(link, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    expect(props.onRead).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("region", { name: "Story preview" })).not.toBeInTheDocument();
  });

  it("does not consume shortcuts outside headline links or with modifiers", () => {
    const { props } = setup();
    const link = screen.getByRole("link", { name: "Story a" });
    fireEvent.keyDown(link, { key: "s", ctrlKey: true });
    fireEvent.keyDown(screen.getByRole("button", { name: /Save “Story a”/ }), { key: "m" });
    fireEvent.keyDown(document.body, { key: "s" });
    expect(props.onToggleSaved).not.toHaveBeenCalled();
    expect(props.onToggleRead).not.toHaveBeenCalled();
    expect(props.onRead).not.toHaveBeenCalled();
  });
});
