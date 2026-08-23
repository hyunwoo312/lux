// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import type { Freshness } from "@/widgets/core/usePolledResource";

function renderButton(freshness: Freshness, lastSyncAt?: number) {
  return render(
    <TooltipProvider>
      <WidgetRefreshButton
        label="News"
        syncing={false}
        lastSyncAt={lastSyncAt}
        cooldownMs={60_000}
        freshness={freshness}
        onRefresh={() => {}}
      />
    </TooltipProvider>,
  );
}

const failing = (since: number): Freshness => ({
  status: "failing",
  error: new Error("nope"),
  failures: 1,
  since,
});

describe("WidgetRefreshButton", () => {
  it("does not date a failure it has no timestamp for", () => {
    renderButton(failing(0));

    const label = screen.getByRole("button").getAttribute("aria-label") ?? "";
    expect(label).toContain("isn’t refreshing");
    expect(label).not.toMatch(/weeks ago|years ago|months ago/);
  });
});
