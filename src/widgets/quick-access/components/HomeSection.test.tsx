// @vitest-environment jsdom
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomeSection } from "@/widgets/quick-access/components/HomeSection";

describe("HomeSection", () => {
  it("offers a retry when the section could not load", () => {
    const retry = vi.fn();
    render(
      <HomeSection
        source="topSites"
        title="Top sites"
        state={{ status: "error", retry }}
        view="grid"
        openBehavior="currentTab"
        animateLayout={false}
        pinnedUrls={new Set()}
        scrollRef={createRef<HTMLElement>()}
        blocked={false}
        onOpen={() => undefined}
        onTogglePin={() => undefined}
      />,
    );

    expect(screen.getByText("Couldn’t load top sites.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(retry).toHaveBeenCalled();
  });
});
