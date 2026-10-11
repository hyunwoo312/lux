// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useChangelogStore } from "@/changelog";
import { StorageTab } from "@/settings/tabs/StorageTab";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { usePaletteStore } from "@/stores/usePaletteStore";
import * as backup from "@/lib/backup";

afterEach(() => {
  vi.useRealTimers();
});

describe("StorageTab", () => {
  it("blocks repeated export clicks and displays a failed export", async () => {
    let reject!: (error: Error) => void;
    const pending = new Promise<void>((_resolve, fail) => {
      reject = fail;
    });
    const exportSettings = vi.spyOn(backup, "exportSettings").mockReturnValueOnce(pending);
    render(<StorageTab />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(exportSettings).toHaveBeenCalledOnce();
    await act(async () => {
      reject(new Error("Storage could not be read"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Storage could not be read");
    expect(screen.getByRole("button", { name: "Export" })).not.toBeDisabled();
  });
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
