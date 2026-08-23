// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveIndicator } from "@/widgets/sports/components/LiveIndicator";

describe("LiveIndicator", () => {
  it("announces itself as live status rather than decoration", () => {
    render(<LiveIndicator />);

    expect(screen.getByRole("status", { name: "Live" })).toBeInTheDocument();
  });
});
