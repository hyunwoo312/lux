import { afterEach, beforeEach } from "vitest";
import { installChromeMock } from "@/test/chrome-mock";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { useToastStore } from "@/stores/useToastStore";

const hasDom = typeof window !== "undefined";

if (hasDom && typeof window.requestIdleCallback !== "function") {
  window.requestIdleCallback = ((cb: IdleRequestCallback) =>
    window.setTimeout(
      () => cb({ didTimeout: true, timeRemaining: () => 0 }),
      0,
    )) as typeof window.requestIdleCallback;
  window.cancelIdleCallback = ((id: number) =>
    window.clearTimeout(id)) as typeof window.cancelIdleCallback;
}

if (typeof navigator !== "undefined" && !navigator.locks) {
  const chains = new Map<string, Promise<unknown>>();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (name: string, task: () => Promise<unknown>) => {
        const previous = chains.get(name) ?? Promise.resolve();
        const run = previous.then(task, task);
        chains.set(
          name,
          run.catch(() => undefined),
        );
        return run;
      },
    },
  });
}

if (hasDom) {
  await import("@testing-library/jest-dom/vitest");
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  globalThis.IntersectionObserver ??= class {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof IntersectionObserver;

  Element.prototype.scrollIntoView ??= () => {};

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  installChromeMock();
  globalThis.localStorage?.clear();
  clearPolledResources();
  useToastStore.setState({ toast: null });
});

afterEach(async () => {
  if (!hasDom) return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
