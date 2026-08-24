// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetErrorBoundary } from "@/widgets/core/WidgetErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

function renderBoundary(children: React.ReactNode) {
  return render(
    <TooltipProvider>
      <WidgetErrorBoundary>{children}</WidgetErrorBoundary>
    </TooltipProvider>,
  );
}

describe("WidgetErrorBoundary", () => {
  it("renders a fallback instead of propagating a child render error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderBoundary(<Boom />);

    expect(screen.getByText("This widget hit an error.")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("reports the crash so it is diagnosable, rather than swallowing it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderBoundary(<Boom />);

    expect(spy.mock.calls.some(([first]) => first === "Widget crashed")).toBe(true);
    spy.mockRestore();
  });

  it("remounts the subtree on retry, so a widget holding bad state starts clean", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let mounts = 0;
    let shouldThrow = true;
    function Counted() {
      if (shouldThrow) throw new Error("boom");
      mounts += 1;
      return <span>healthy</span>;
    }

    renderBoundary(<Counted />);
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("healthy")).toBeInTheDocument();
    expect(mounts).toBe(1);
    spy.mockRestore();
  });

  it("shows the fallback again when the retry throws too, instead of escaping upward", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderBoundary(<Boom />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("This widget hit an error.")).toBeInTheDocument();
    spy.mockRestore();
  });
});
