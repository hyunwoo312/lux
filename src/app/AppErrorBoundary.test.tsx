// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppErrorBoundary } from "@/app/AppErrorBoundary";

const chromeRef = () => (globalThis as unknown as { chrome: typeof chrome }).chrome;

function Boom(): never {
  throw new Error("wallpaper exploded");
}

function renderBoundary(children: React.ReactNode) {
  return render(<AppErrorBoundary>{children}</AppErrorBoundary>);
}

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  reload = vi.fn();
  Object.defineProperty(window, "location", {
    value: { reload, href: "https://example.test/" },
    writable: true,
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AppErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    renderBoundary(<p>the dashboard</p>);

    expect(screen.getByText("the dashboard")).toBeInTheDocument();
  });

  it("shows a recovery card instead of a blank page when the tree throws", () => {
    renderBoundary(<Boom />);

    expect(screen.getByRole("heading", { name: /Lux hit an error/ })).toBeInTheDocument();
    expect(screen.getByText("wallpaper exploded")).toBeInTheDocument();
  });

  it("offers no way to send the crash anywhere", () => {
    renderBoundary(<Boom />);

    expect(screen.queryByText(/send/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/feedback/i)).not.toBeInTheDocument();
  });

  it("saves a backup from the dead tree", async () => {
    await chromeRef().storage.local.set({ "lux:widget:note": { text: "keep me" } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: () => {} });

    renderBoundary(<Boom />);
    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));

    await waitFor(() => expect(click).toHaveBeenCalled());
  });

  it("puts the keyboard on the safest action", () => {
    renderBoundary(<Boom />);

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Reload" }));
  });

  it("resets the layout without touching widget content", async () => {
    await chromeRef().storage.local.set({
      "lux:dashboard": { widgets: [] },
      "lux:widget:note": { text: "keep me" },
    });

    renderBoundary(<Boom />);
    fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    const left = await chromeRef().storage.local.get(null);
    expect(Object.keys(left)).toEqual(["lux:widget:note"]);
  });
});
