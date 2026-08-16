// @vitest-environment jsdom
import { useThemeStore } from "@/stores/useThemeStore";

describe("useThemeStore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useThemeStore.setState({ theme: "dark", isPersisted: true });
  });

  it("applies a theme that cannot be saved and flags it as unsaved", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    useThemeStore.getState().setTheme("light");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().isPersisted).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("clears the unsaved flag once the theme saves again", () => {
    useThemeStore.setState({ isPersisted: false });

    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().isPersisted).toBe(true);
  });
});
