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
  it("reports a profile past the retired 5 MB cap as a plain total, not an overflow", async () => {
    localStorage.setItem("lux:polled:weather", "x".repeat(1000));
    render(<StorageSection />);

    expect(await screen.findByText("On this device")).toBeInTheDocument();
    expect(screen.queryByText(/of ~?5 MB/)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("6.3 MB")).toBeInTheDocument();
  });

  it("breaks the total down by where it lives", async () => {
    localStorage.setItem("lux:polled:weather", "x".repeat(1000));
    localStorage.setItem("lux.theme", "dark");
    render(<StorageSection />);

    await screen.findByText("On this device");
    expect(screen.getByText(/Cached data/)).toBeInTheDocument();
    expect(screen.getByText(/Preferences/)).toBeInTheDocument();
    expect(screen.getByText(/Pictures/)).toBeInTheDocument();
    expect(screen.getByText(/Widget data/)).toBeInTheDocument();
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
});
