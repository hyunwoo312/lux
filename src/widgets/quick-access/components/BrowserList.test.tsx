// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import type { BrowserItem } from "@/widgets/quick-access/types";

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

function Harness({ items }: { items: BrowserItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef}>
      <BrowserList
        items={items}
        view="list"
        animateLayout={false}
        pinnedUrls={new Set()}
        scrollRef={scrollRef}
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

  it("renders only the first page of a long source", () => {
    render(<Harness items={manyItems(80)} />);

    expect(screen.getByText("Site 30")).toBeInTheDocument();
    expect(screen.queryByText("Site 31")).not.toBeInTheDocument();
  });

  it("appends the next page when scrolled to the end", () => {
    render(<Harness items={manyItems(80)} />);

    act(() => scrollToBottom());

    expect(screen.getByText("Site 60")).toBeInTheDocument();
    expect(screen.queryByText("Site 61")).not.toBeInTheDocument();
  });
});
