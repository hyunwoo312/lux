// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";

function renderButton(staleSince?: number) {
  return render(
    <TooltipProvider>
      <WidgetRefreshButton
        label="News"
        syncing={false}
        lastSyncAt={undefined}
        cooldownMs={60_000}
        staleSince={staleSince}
        onRefresh={() => {}}
      />
    </TooltipProvider>,
  );
}

describe("WidgetRefreshButton", () => {
  it("does not date a failure it has no timestamp for", () => {
    renderButton(0);

    const label = screen.getByRole("button").getAttribute("aria-label") ?? "";
    expect(label).toContain("isn’t refreshing");
    expect(label).not.toMatch(/weeks ago|years ago|months ago/);
  });

  it("says nothing about staleness while refreshing succeeds", () => {
    renderButton();

    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Refresh");
  });
});
