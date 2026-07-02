// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetErrorBoundary } from "@/widgets/core/WidgetErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

describe("WidgetErrorBoundary", () => {
  it("renders a fallback instead of propagating a child render error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <TooltipProvider>
        <WidgetErrorBoundary>
          <Boom />
        </WidgetErrorBoundary>
      </TooltipProvider>,
    );

    expect(screen.getByText("This widget hit an error.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    spy.mockRestore();
  });

  it("recovers when the child no longer throws after reset", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function Maybe() {
      if (shouldThrow) throw new Error("boom");
      return <span>healthy</span>;
    }

    render(
      <TooltipProvider>
        <WidgetErrorBoundary>
          <Maybe />
        </WidgetErrorBoundary>
      </TooltipProvider>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(screen.getByText("healthy")).toBeInTheDocument();
    spy.mockRestore();
  });
});