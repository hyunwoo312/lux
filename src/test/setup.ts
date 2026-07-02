import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { installChromeMock } from "./chrome-mock";

const hasDom = typeof window !== "undefined";

if (hasDom) {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

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
});

afterEach(async () => {
  if (!hasDom) return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
