// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BaseWidget } from "@/widgets/core/BaseWidget";
import { WidgetTitle } from "@/widgets/core/WidgetTitle";

function editingWidget(onRemove: () => void, editing = true) {
  return (
    <TooltipProvider>
      <BaseWidget title="Notes" editing={editing} onRemove={onRemove}>
        <p>content</p>
      </BaseWidget>
    </TooltipProvider>
  );
}

describe("BaseWidget", () => {
  it("retains content drafts and loaded data while settings pause polling", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue("loaded");
    const fetchConfig = vi.fn().mockResolvedValue("configuration loaded");
    function Configuration() {
      const { state } = usePolledResource<string>(fetchConfig);
      return (
        <>
          <p>{state.status === "success" ? state.data : state.status}</p>
          <button>Config action</button>
        </>
      );
    }
    function Content() {
      const [value, setValue] = useState("");
      const { state } = usePolledResource<string>(fetcher, { intervalMs: 1000 });
      return (
        <>
          <input
            aria-label="Draft"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <p>{state.status === "success" ? state.data : state.status}</p>
        </>
      );
    }
    const { unmount } = render(
      <TooltipProvider>
        <BaseWidget title="Test" editing={false} onRemove={() => {}} config={<Configuration />}>
          <Content />
        </BaseWidget>
      </TooltipProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const field = screen.getByLabelText("Draft");
    fireEvent.change(field, { target: { value: "keep this" } });
    fireEvent.click(screen.getByRole("button", { name: "Test settings" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetchConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByText("configuration loaded")).toBeInTheDocument();
    expect(screen.getByText("loaded")).toBeInTheDocument();
    expect(field.closest("[inert]")).not.toBeNull();
    screen.getByRole("button", { name: "Config action" }).focus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Config action" }), { key: "Escape" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByLabelText("Draft")).toBe(field);
    expect(field).toHaveValue("keep this");
    expect(screen.getByRole("button", { name: "Test settings" })).toHaveFocus();
    expect(field.closest("[inert]")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    unmount();
    vi.useRealTimers();
  });
  it("removes the widget on the first press, with no confirmation to clear", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove Notes?")).not.toBeInTheDocument();
  });

  it("lets a headline hand the title back", () => {
    render(
      <TooltipProvider>
        <BaseWidget title="Notes" editing={false} headline={<WidgetTitle />} onRemove={() => {}}>
          <p>content</p>
        </BaseWidget>
      </TooltipProvider>,
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("offers no remove control outside edit mode", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove, false));

    expect(screen.queryByRole("button", { name: "Remove Notes" })).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
