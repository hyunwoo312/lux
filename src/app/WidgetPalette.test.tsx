// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetPalette } from "@/app/WidgetPalette";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
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

  it("marks a widget already on the grid as added", async () => {
    useDashboardStore.getState().addWidget("note");
    await openPalette();

    expect(screen.getByRole("button", { name: /Note/ })).toHaveTextContent("Added");
  });
});
