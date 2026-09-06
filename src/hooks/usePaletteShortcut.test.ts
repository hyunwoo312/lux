// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePaletteShortcut } from "@/hooks/usePaletteShortcut";
import { OPEN_PALETTE_COMMAND } from "@/lib/extension-keys";

const getAll = () =>
  (globalThis.chrome as unknown as { commands: { getAll: ReturnType<typeof vi.fn> } }).commands
    .getAll;

describe("usePaletteShortcut", () => {
  it("says nothing until Chrome answers, then reports the binding", async () => {
    getAll().mockResolvedValue([{ name: OPEN_PALETTE_COMMAND, shortcut: "Alt+T" }]);

    const { result } = renderHook(() => usePaletteShortcut());

    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current).toEqual({ status: "bound", shortcut: "Alt+T" }));
  });

  it("reports an unbound command rather than an empty shortcut", async () => {
    getAll().mockResolvedValue([{ name: OPEN_PALETTE_COMMAND, shortcut: "" }]);

    const { result } = renderHook(() => usePaletteShortcut());

    await waitFor(() => expect(result.current).toEqual({ status: "unbound" }));
  });
});
