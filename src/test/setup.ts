import { afterEach, beforeEach } from "vitest";
import { installChromeMock } from "./chrome-mock";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { useToastStore } from "@/stores/useToastStore";

const hasDom = typeof window !== "undefined";

installChromeMock();

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
