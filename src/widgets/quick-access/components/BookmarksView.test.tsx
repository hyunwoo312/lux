// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/widgets/quick-access/hooks/useBrowserItems", () => ({
  useBookmarkTree: vi.fn(() => ({ status: "ready", root: tree })),
}));

import { BookmarksView } from "@/widgets/quick-access/components/BookmarksView";
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

function renderView() {
  return render(
    <WidgetInstanceContext.Provider value="qa-1">
      <BookmarksView editing={false} />
    </WidgetInstanceContext.Provider>,
  );
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
    rerender(
      <WidgetInstanceContext.Provider value="qa-1">
        <BookmarksView editing={false} />
      </WidgetInstanceContext.Provider>,
    );

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open folder Dev")).not.toBeInTheDocument();
  });
});

describe("BookmarksView folder memory", () => {
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
