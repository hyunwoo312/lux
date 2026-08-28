// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetPalette } from "@/app/WidgetPalette";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useWidgetHighlightStore } from "@/widgets/core/useWidgetHighlightStore";
import { widgetPlugins } from "@/widgets/registry";
import { WIDGET_CATEGORIES, WIDGET_CATEGORY_LABELS } from "@/widgets/core/types";

function renderPalette() {
  render(
    <TooltipProvider>
      <WidgetPalette />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useWidgetPaletteStore.setState({ open: false, previewType: null });
  useDashboardStore.setState({ widgets: [], layout: [], pendingRemoval: null });
});

async function openPalette() {
  renderPalette();
  fireEvent.click(screen.getByRole("button", { name: "Add widget" }));
  await screen.findByText("Widgets");
}

const columns = () =>
  WIDGET_CATEGORIES.map((category) =>
    widgetPlugins
      .filter((plugin) => plugin.category === category)
      .map((plugin) => screen.getByRole("button", { name: new RegExp(`^${plugin.name}`) })),
  );

describe("WidgetPalette", () => {
  it("opens without arming a placement preview", async () => {
    renderPalette();
    fireEvent.click(screen.getByRole("button", { name: "Add widget" }));

    await waitFor(() => {
      expect(useWidgetPaletteStore.getState().open).toBe(true);
    });
    await screen.findByText("Widgets");

    expect(useWidgetPaletteStore.getState().previewType).toBeNull();
  });

  it("arms the preview once a widget is focused", async () => {
    renderPalette();
    fireEvent.click(screen.getByRole("button", { name: "Add widget" }));
    await screen.findByText("Widgets");

    const first = screen.getByRole("button", { name: /AniList/ });
    fireEvent.focus(first);

    expect(useWidgetPaletteStore.getState().previewType).toBe("anilist");
  });

  it("lists every widget exactly once, under a heading", async () => {
    await openPalette();

    for (const plugin of widgetPlugins) {
      expect(screen.getAllByRole("button", { name: new RegExp(`^${plugin.name}`) })).toHaveLength(
        1,
      );
    }
    for (const label of Object.values(WIDGET_CATEGORY_LABELS)) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
  });

  it("moves down a category with the arrow keys and across with left and right", async () => {
    await openPalette();
    const [productivity, media] = columns();
    if (!productivity || !media) throw new Error("columns did not render");

    productivity[0]?.focus();
    fireEvent.keyDown(productivity[0]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(productivity[1]);

    fireEvent.keyDown(productivity[1]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(media[1]);
  });

  it("clamps to the last entry when a neighbouring category is shorter", async () => {
    await openPalette();
    const [productivity, media] = columns();
    if (!productivity || !media) throw new Error("columns did not render");

    const lastProductivity = productivity[productivity.length - 1];
    lastProductivity?.focus();
    fireEvent.keyDown(lastProductivity!, { key: "ArrowRight" });

    expect(document.activeElement).toBe(media[media.length - 1]);
  });

  it("does not run off the end of a category", async () => {
    await openPalette();
    const [productivity] = columns();
    const last = productivity?.[productivity.length - 1];
    if (!last) throw new Error("column did not render");

    last.focus();
    fireEvent.keyDown(last, { key: "ArrowDown" });

    expect(document.activeElement).toBe(last);
  });

  it("says how many of a widget are already on the dashboard, and that clicking adds another", async () => {
    useDashboardStore.getState().addWidget("note");
    useDashboardStore.getState().addWidget("note");
    await openPalette();

    expect(screen.getByRole("button", { name: /Note/ })).toHaveTextContent(
      "2 on your dashboard, adds another",
    );
  });

  it("warns that a widget needs an account before you add it and find out", async () => {
    await openPalette();

    expect(screen.getByRole("button", { name: /GitHub/ })).toHaveTextContent("Needs an account");
    expect(screen.getByRole("button", { name: /Note/ })).not.toHaveTextContent("Needs an account");
  });

  it("clears the highlight and the search when the shortcut closes it, not only a dismissal", async () => {
    useDashboardStore.getState().addWidget("note");
    await openPalette();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search widgets" }), {
      target: { value: "scratchpad" },
    });
    fireEvent.focus(screen.getByRole("button", { name: /^Note/ }));
    expect(useWidgetHighlightStore.getState().highlighted).toBe("note");

    act(() => useWidgetPaletteStore.getState().toggle());
    expect(useWidgetHighlightStore.getState().highlighted).toBeNull();

    act(() => useWidgetPaletteStore.getState().toggle());
    await screen.findByText("Widgets");
    expect(screen.getByRole("searchbox", { name: "Search widgets" })).toHaveValue("");
  });
});

describe("finding a widget among many", () => {
  it("narrows the list to what the query matches", async () => {
    await openPalette();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search widgets" }), {
      target: { value: "weather" },
    });

    expect(screen.getByRole("button", { name: /Weather/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Note/ })).not.toBeInTheDocument();
  });

  it("matches the description too, not only the name", async () => {
    await openPalette();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search widgets" }), {
      target: { value: "scratchpad" },
    });

    expect(screen.getByRole("button", { name: /Note/ })).toBeInTheDocument();
  });

  it("says nothing matched rather than showing an empty panel", async () => {
    await openPalette();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search widgets" }), {
      target: { value: "zzzz" },
    });

    expect(screen.getByText(/No widget matches/)).toBeInTheDocument();
  });

  it("moves across to the rows a search left behind, not the ones it removed", async () => {
    await openPalette();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search widgets" }), {
      target: { value: "you" },
    });

    const quickAccess = screen.getByRole("button", { name: /^Quick Access/ });
    quickAccess.focus();
    fireEvent.keyDown(quickAccess, { key: "ArrowRight" });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^AniList/ }));
  });
});
