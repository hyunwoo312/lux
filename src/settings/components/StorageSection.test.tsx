// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/asset-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/asset-store")>()),
  measureAllAssets: vi.fn(async () => ({ count: 3, bytes: 6 * 1024 * 1024 })),
}));

import { StorageSection } from "@/settings/components/StorageSection";

const chromeRef = () => (globalThis as unknown as { chrome: typeof chrome }).chrome;

beforeEach(() => {
  localStorage.clear();
  (chromeRef().storage.local as unknown as { getBytesInUse: unknown }).getBytesInUse = vi.fn(
    async () => 348_160,
  );
});

describe("StorageSection", () => {
  it("exposes the meter to assistive technology with a readable value", async () => {
    localStorage.setItem("lux:polled:weather", "x".repeat(1000));
    render(<StorageSection />);

    const meter = await screen.findByRole("progressbar", { name: "Browser storage used" });

    expect(meter).toHaveAttribute("aria-valuetext", expect.stringContaining("of about 5 MB"));
  });

  it("shows a meter only for the store that has a limit", async () => {
    localStorage.setItem("lux:polled:weather", "x".repeat(1000));
    render(<StorageSection />);

    await screen.findByText("Browser storage");
    expect(screen.getByText(/of ~5 MB/)).toBeInTheDocument();
    expect(screen.getByText("6 MB")).toBeInTheDocument();
    expect(screen.getByText("340 KB")).toBeInTheDocument();
    expect(screen.getAllByText(/no size limit|No size limit/i)).toHaveLength(2);
  });

  it("counts wallpapers and widget pictures together", async () => {
    render(<StorageSection />);

    expect(await screen.findByText("3 files · no size limit")).toBeInTheDocument();
  });

  it("clears the cache and re-measures, leaving other keys alone", async () => {
    localStorage.setItem("lux:polled:weather", "x".repeat(1000));
    localStorage.setItem("lux.theme", "dark");
    render(<StorageSection />);

    fireEvent.click(await screen.findByRole("button", { name: /Clear cache/ }));

    await waitFor(() => expect(localStorage.getItem("lux:polled:weather")).toBeNull());
    expect(localStorage.getItem("lux.theme")).toBe("dark");
  });

  it("disables the clear action when there is no cache to drop", async () => {
    localStorage.setItem("lux.theme", "dark");
    render(<StorageSection />);

    expect(await screen.findByRole("button", { name: /Clear cache/ })).toBeDisabled();
  });

  it("says so plainly when chrome storage cannot be measured", async () => {
    (chromeRef().storage.local as unknown as { getBytesInUse: unknown }).getBytesInUse = undefined;
    render(<StorageSection />);

    expect(
      await screen.findByText("Available once Lux is installed as an extension"),
    ).toBeInTheDocument();
  });
});
