// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import type { BrowserItem, OpenBehavior } from "@/widgets/quick-access/types";

const realIntersectionObserver = globalThis.IntersectionObserver;
let observed: Array<() => void> = [];

function installScrollObserver() {
  globalThis.IntersectionObserver = class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe() {
      observed.push(() =>
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
      );
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

function scrollToBottom() {
  if (observed.length === 0) throw new Error("nothing is watching for the end of the list");
  for (const trigger of observed) trigger();
}

function manyItems(count: number): BrowserItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    title: `Site ${index + 1}`,
    url: `https://site${index + 1}.com/`,
  }));
}

function Harness({
  items,
  openBehavior = "currentTab",
}: {
  items: BrowserItem[];
  openBehavior?: OpenBehavior;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef}>
      <BrowserList
        items={items}
        view="list"
        animateLayout={false}
        pinnedUrls={new Set()}
        scrollRef={scrollRef}
        openBehavior={openBehavior}
        onOpen={vi.fn()}
        onTogglePin={vi.fn()}
      />
    </div>
  );
}

beforeEach(() => {
  observed = [];
  installScrollObserver();
});

afterEach(() => {
  globalThis.IntersectionObserver = realIntersectionObserver;
});

describe("BrowserList", () => {
  it("renders a short source in full without waiting for a scroll", () => {
    render(<Harness items={manyItems(12)} />);

    expect(screen.getByText("Site 12")).toBeInTheDocument();
  });

  it("appends the next page when scrolled to the end", () => {
    render(<Harness items={manyItems(80)} />);

    act(() => scrollToBottom());

    expect(screen.getByText("Site 60")).toBeInTheDocument();
    expect(screen.queryByText("Site 61")).not.toBeInTheDocument();
  });
});

describe("browser rows as real links", () => {
  const one = [{ id: "e", title: "Example", url: "https://example.com/" }];
  const renderList = (openBehavior?: OpenBehavior) =>
    render(<Harness items={one} openBehavior={openBehavior} />);

  it("renders each row as an anchor, so middle-click and the context menu work", () => {
    renderList();
    const link = screen.getByRole("link", { name: /Example/ });

    expect(link).toHaveAttribute("href", "https://example.com/");
  });

  it("opens in a new tab when the widget is set to", () => {
    renderList("newTab");
    expect(screen.getByRole("link", { name: /Example/ })).toHaveAttribute("target", "_blank");
  });

  it("stays in the current tab otherwise", () => {
    renderList();
    expect(screen.getByRole("link", { name: /Example/ })).not.toHaveAttribute("target");
  });

  it("is not draggable, so a drag cannot start a navigation", () => {
    renderList();
    expect(screen.getByRole("link", { name: /Example/ })).toHaveAttribute("draggable", "false");
  });
});
