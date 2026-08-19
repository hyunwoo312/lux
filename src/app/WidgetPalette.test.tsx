// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetPalette } from "@/app/WidgetPalette";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

function renderPalette() {
  render(
    <TooltipProvider>
      <WidgetPalette />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useWidgetPaletteStore.setState({ open: false, previewType: null });
});

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
});
