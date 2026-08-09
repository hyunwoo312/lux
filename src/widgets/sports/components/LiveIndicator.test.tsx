// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveIndicator } from "@/widgets/sports/components/LiveIndicator";

describe("LiveIndicator", () => {
  it("announces itself as live status rather than decoration", () => {
    render(<LiveIndicator />);

    expect(screen.getByRole("status", { name: "Live" })).toBeInTheDocument();
  });

  it("uses the dedicated live colour, not the widget accent", () => {
    const { container } = render(<LiveIndicator />);
    const bar = container.querySelector(".live-sweep");

    expect(bar?.className).toContain("bg-live");
    expect(bar?.className).not.toContain("bg-primary");
  });

  it("carries the sweep animation the reduced-motion rule can switch off", () => {
    const { container } = render(<LiveIndicator />);

    expect(container.querySelector(".live-sweep")).toBeInTheDocument();
  });
});
