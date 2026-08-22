// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SavedToggle } from "@/widgets/news/components/SavedList";

function renderToggle(count: number, active = false) {
  return render(
    <TooltipProvider>
      <SavedToggle count={count} active={active} onToggle={vi.fn()} />
    </TooltipProvider>,
  );
}

describe("SavedToggle", () => {
  it("shows the exact count at the boundary", () => {
    renderToggle(99);
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("announces the count for screen readers", () => {
    renderToggle(12);
    expect(screen.getByRole("button", { name: "Saved headlines (12)" })).toBeInTheDocument();
  });
});
