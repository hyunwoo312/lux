// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HeadlineTitle } from "@/widgets/news/components/HeadlineTitle";

function renderTitle(title: string, isNew = false) {
  return render(
    <TooltipProvider>
      <HeadlineTitle title={title} terms={[]} isNew={isNew} />
    </TooltipProvider>,
  );
}

describe("HeadlineTitle", () => {
  it("marks an unseen headline for screen readers as well as sighted readers", () => {
    renderTitle("Fresh headline", true);
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
