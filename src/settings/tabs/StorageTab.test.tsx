// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useChangelogStore } from "@/changelog";
import { StorageTab } from "@/settings/tabs/StorageTab";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { usePaletteStore } from "@/stores/usePaletteStore";

afterEach(() => {
  vi.useRealTimers();
});

describe("StorageTab", () => {
  it("does not reset until the confirmation is accepted", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAppSettingsStore.setState({ showGridLines: true });
    usePaletteStore.setState({ disabledCommands: { "action.openGuide": true } });
    useChangelogStore.setState({ lastSeenVersion: "1.0.0" });
    render(<StorageTab />);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useAppSettingsStore.getState().showGridLines).toBe(true);

    const confirm = screen.getByRole("button", { name: "Reset all" });
    expect(confirm).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    expect(useAppSettingsStore.getState().showGridLines).toBe(false);
    expect(usePaletteStore.getState().disabledCommands).toEqual({});
    expect(useChangelogStore.getState().lastSeenVersion).toBeNull();
  });
});
