// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StorageTab } from "@/settings/tabs/StorageTab";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";

describe("StorageTab", () => {
  it("does not reset until the confirmation is accepted", async () => {
    useAppSettingsStore.setState({ showGridLines: true });
    render(<StorageTab />);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useAppSettingsStore.getState().showGridLines).toBe(true);

    const confirm = screen.getByRole("button", { name: "Reset all" });
    await waitFor(() => expect(confirm).not.toHaveAttribute("aria-disabled"), { timeout: 2000 });
    fireEvent.click(confirm);

    expect(useAppSettingsStore.getState().showGridLines).toBe(false);
  });
});
