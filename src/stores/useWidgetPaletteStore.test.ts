import { beforeEach, describe, expect, it } from "vitest";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

beforeEach(() => {
  useWidgetPaletteStore.setState({ open: false, previewType: null });
});

describe("the widget palette", () => {
  it("arms a placement preview while it is open", () => {
    useWidgetPaletteStore.getState().setOpen(true);
    useWidgetPaletteStore.getState().setPreviewType("weather");

    expect(useWidgetPaletteStore.getState().previewType).toBe("weather");
  });

  it("refuses to arm one once it has closed, however late the hover lands", () => {
    useWidgetPaletteStore.getState().setOpen(true);
    useWidgetPaletteStore.getState().setPreviewType("weather");
    useWidgetPaletteStore.getState().setOpen(false);

    useWidgetPaletteStore.getState().setPreviewType("news");

    expect(useWidgetPaletteStore.getState().previewType).toBeNull();
  });
});
