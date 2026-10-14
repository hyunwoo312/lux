// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/widgets/quick-access/hooks/useBrowserItems", () => ({
  useBookmarkTree: vi.fn(() => ({ status: "ready", root: tree })),
}));
vi.mock("@/hooks/useInfiniteScroll", () => ({ useInfiniteScroll: vi.fn() }));

import { BookmarksView } from "@/widgets/quick-access/components/BookmarksView";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useBookmarkTree } from "@/widgets/quick-access/hooks/useBrowserItems";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import type { BookmarkFolder } from "@/widgets/quick-access/types";

let tree: BookmarkFolder;

const ROOT: BookmarkFolder = {
  id: "0",
  title: "Bookmarks",
  items: [{ id: "loose", title: "Loose link", url: "https://loose.com/" }],
  folders: [
    {
      id: "bar",
      title: "Bar",
      items: [{ id: "gh", title: "GitHub", url: "https://github.com/" }],
      folders: [
        {
          id: "dev",
          title: "Dev",
          items: [{ id: "mdn", title: "MDN", url: "https://mdn.io/" }],
          folders: [],
        },
      ],
    },
  ],
};

beforeEach(() => {
  tree = ROOT;
  useQuickAccessStore.setState({ byInstance: {} });
});

function view(active = true) {
  return (
    <TooltipProvider>
      <WidgetInstanceContext.Provider value="qa-1">
        <BookmarksView editing={false} active={active} />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>
  );
}

function renderView() {
  return render(view());
}

describe("BookmarksView", () => {
  it("reaches a nested bookmark that the old flattened list truncated away", () => {
    renderView();

    fireEvent.click(screen.getByLabelText("Open folder Bar"));
    expect(screen.getByText("GitHub")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open folder Dev"));
    expect(screen.getByText("MDN")).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("walks back up through the breadcrumb", () => {
    renderView();

    fireEvent.click(screen.getByLabelText("Open folder Bar"));
    fireEvent.click(screen.getByLabelText("Open folder Dev"));
    expect(screen.getByRole("button", { name: "Bookmarks" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bar" }));

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText("Open folder Dev")).toBeInTheDocument();
  });

  it("still navigates after a background refresh drops the folder you were in", () => {
    const { rerender } = renderView();
    fireEvent.click(screen.getByLabelText("Open folder Bar"));
    fireEvent.click(screen.getByLabelText("Open folder Dev"));

    tree = { ...ROOT, folders: [{ ...ROOT.folders[0]!, folders: [] }] };
    rerender(view());

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open folder Dev")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveFocus();
  });

  it("shows direct link and folder counts with a bounded content preview", () => {
    useQuickAccessStore.getState().setView("qa-1", "list");
    renderView();
    const folder = screen.getByRole("button", { name: "Open folder Bar" });
    expect(within(folder).getByText("1 link · 1 folder")).toBeInTheDocument();
    expect(within(folder).getByText("Dev, GitHub")).toBeInTheDocument();
  });

  it("shows a nested bookmark's collection context in search results", () => {
    useQuickAccessStore.getState().setView("qa-1", "list");
    renderView();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search bookmarks" }), {
      target: { value: "MDN" },
    });
    expect(screen.getByRole("link", { name: /MDN/ })).toHaveTextContent("Bar / Dev");
  });
});

describe("BookmarksView folder memory", () => {
  it("retains loaded pages and scroll through an empty child folder", () => {
    tree = {
      ...ROOT,
      folders: [
        {
          id: "large",
          title: "Large",
          folders: [{ id: "empty", title: "Empty", folders: [], items: [] }],
          items: Array.from({ length: 65 }, (_, index) => ({
            id: `large-${index}`,
            title: `Large link ${index}`,
            url: `https://example.com/${index}`,
          })),
        },
      ],
    };
    const { container } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Open folder Large" }));
    expect(screen.queryByText("Large link 31")).not.toBeInTheDocument();
    act(() => vi.mocked(useInfiniteScroll).mock.lastCall?.[3]());
    expect(screen.getByText("Large link 31")).toBeInTheDocument();
    const scroll = container.querySelector<HTMLElement>(".overflow-y-auto")!;
    scroll.scrollTop = 120;
    fireEvent.scroll(scroll);
    fireEvent.click(screen.getByRole("button", { name: "Open folder Empty" }));
    expect(screen.getByText("This folder is empty")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Large" }));
    expect(screen.getByText("Large link 31")).toBeInTheDocument();
    expect(scroll.scrollTop).toBe(120);
  });
  it("restores the parent scroll and focuses the folder that was left", () => {
    const { container } = renderView();
    const scroll = container.querySelector<HTMLElement>(".overflow-y-auto")!;
    scroll.scrollTop = 64;
    fireEvent.scroll(scroll);
    fireEvent.click(screen.getByRole("button", { name: "Open folder Bar" }));
    expect(scroll.scrollTop).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Back to Bookmarks" }));
    expect(scroll.scrollTop).toBe(64);
    expect(screen.getByRole("button", { name: "Open folder Bar" })).toHaveFocus();
  });

  it("keeps folder and query scroll separately and restores focus after clearing search", () => {
    const { container } = renderView();
    const folder = screen.getByRole("button", { name: "Open folder Bar" });
    folder.focus();
    const scroll = container.querySelector<HTMLElement>(".overflow-y-auto")!;
    scroll.scrollTop = 48;
    fireEvent.scroll(scroll);
    const search = screen.getByRole("searchbox", { name: "Search bookmarks" });
    fireEvent.change(search, { target: { value: "MDN" } });
    expect(scroll.scrollTop).toBe(0);
    scroll.scrollTop = 24;
    fireEvent.scroll(scroll);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(scroll.scrollTop).toBe(48);
    expect(screen.getByRole("button", { name: "Open folder Bar" })).toHaveFocus();
    fireEvent.change(search, { target: { value: "MDN" } });
    expect(scroll.scrollTop).toBe(24);
  });

  it("retains query and scroll while inactive and pauses the bookmark resource", () => {
    const { container, rerender } = renderView();
    const search = screen.getByRole("searchbox", { name: "Search bookmarks" });
    fireEvent.change(search, { target: { value: "MDN" } });
    const scroll = container.querySelector<HTMLElement>(".overflow-y-auto")!;
    scroll.scrollTop = 32;
    fireEvent.scroll(scroll);
    rerender(view(false));
    expect(useBookmarkTree).toHaveBeenLastCalledWith(false);
    rerender(view());
    expect(search).toHaveValue("MDN");
    expect(scroll.scrollTop).toBe(32);
  });
  it("reopens the folder you left it in", () => {
    const first = renderView();
    fireEvent.click(screen.getByLabelText("Open folder Bar"));
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    first.unmount();

    renderView();

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("falls back to the root when the remembered folder is gone", () => {
    const first = renderView();
    fireEvent.click(screen.getByLabelText("Open folder Bar"));
    first.unmount();

    tree = { ...ROOT, folders: [] };
    renderView();

    expect(screen.getByText("Loose link")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
