// @vitest-environment jsdom
import { resolveTheme } from "@/lib/theme";
import { useThemeStore } from "@/stores/useThemeStore";

function mockPrefersDark(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("prefers-color-scheme: dark") ? matches : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }) as unknown as MediaQueryList,
  );
}

describe("useThemeStore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useThemeStore.setState({ mode: "dark", theme: "dark", isPersisted: true });
  });

  it("applies a theme that cannot be saved and flags it as unsaved", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    useThemeStore.getState().setMode("light");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().isPersisted).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("clears the unsaved flag once the theme saves again", () => {
    useThemeStore.setState({ isPersisted: false });

    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().isPersisted).toBe(true);
  });

  it("resolves system mode from the OS preference", () => {
    mockPrefersDark(true);
    expect(resolveTheme("system")).toBe("dark");

    mockPrefersDark(false);
    expect(resolveTheme("system")).toBe("light");
  });

  it("keeps system as the stored mode while tracking the resolved theme", () => {
    mockPrefersDark(false);

    useThemeStore.getState().setMode("system");

    expect(useThemeStore.getState().mode).toBe("system");
    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("leaves system mode when the header toggle is used", () => {
    mockPrefersDark(true);
    useThemeStore.setState({ mode: "system", theme: "dark" });

    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().mode).toBe("light");
    expect(useThemeStore.getState().theme).toBe("light");
  });
});

describe("theme transition under rapid toggling", () => {
  type FakeTransition = { finished: Promise<void>; skipTransition: () => void; settle: () => void };
  let created: FakeTransition[];

  beforeEach(() => {
    created = [];
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    Object.assign(document, {
      startViewTransition: (mutate: () => void) => {
        let settle!: () => void;
        const finished = new Promise<void>((resolve) => {
          settle = resolve;
        });
        const transition: FakeTransition = { finished, skipTransition: vi.fn(), settle };
        created.push(transition);
        mutate();
        return transition;
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "startViewTransition");
    document.documentElement.classList.remove("theme-switching");
    useThemeStore.setState({ mode: "dark", theme: "dark", isPersisted: true });
  });

  it("applies every click immediately and skips the superseded transition", () => {
    const start = useThemeStore.getState().theme;

    for (let i = 0; i < 5; i += 1) useThemeStore.getState().toggle();

    expect(created).toHaveLength(5);
    expect(useThemeStore.getState().theme).toBe(start === "dark" ? "light" : "dark");
    for (const transition of created.slice(0, -1)) {
      expect(transition.skipTransition).toHaveBeenCalled();
    }
  });

  it("does not let a superseded transition strip the marker from a live one", async () => {
    useThemeStore.getState().toggle();
    useThemeStore.getState().toggle();

    created[0]?.settle();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.documentElement.classList.contains("theme-switching")).toBe(true);

    created[1]?.settle();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.documentElement.classList.contains("theme-switching")).toBe(false);
  });
});
