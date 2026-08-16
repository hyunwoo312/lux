// @vitest-environment jsdom
import { getLocal, setLocal } from "@/lib/local-store";

function failWrites(times: number) {
  const setItem = Storage.prototype.setItem;
  let remaining = times;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
    if (remaining > 0) {
      remaining -= 1;
      throw new DOMException("quota exceeded", "QuotaExceededError");
    }
    setItem.call(localStorage, key, value);
  });
}

describe("local-store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a value", () => {
    expect(setLocal("key", "value")).toBe(true);
    expect(getLocal("key")).toBe("value");
  });

  it("returns null when the key is absent", () => {
    expect(getLocal("absent")).toBeNull();
  });

  it("evicts the oldest resource cache and retries when the quota is exceeded", () => {
    localStorage.setItem("lux:polled:weather:oldest", JSON.stringify({ at: 1 }));
    localStorage.setItem("lux:paged:news:recent", JSON.stringify({ at: 2 }));
    localStorage.setItem("lux.theme", "dark");
    failWrites(1);

    expect(setLocal("lux.theme", "light")).toBe(true);

    expect(getLocal("lux.theme")).toBe("light");
    expect(getLocal("lux:polled:weather:oldest")).toBeNull();
    expect(getLocal("lux:paged:news:recent")).not.toBeNull();
  });

  it("evicts corrupt resource caches before dated ones", () => {
    localStorage.setItem("lux:polled:weather:corrupt", "{ not json");
    localStorage.setItem("lux:paged:news:dated", JSON.stringify({ at: 1 }));
    failWrites(1);

    expect(setLocal("lux.theme", "light")).toBe(true);

    expect(getLocal("lux:polled:weather:corrupt")).toBeNull();
    expect(getLocal("lux:paged:news:dated")).not.toBeNull();
  });

  it("keeps evicting until the write fits", () => {
    localStorage.setItem("lux:polled:a", JSON.stringify({ at: 1 }));
    localStorage.setItem("lux:polled:b", JSON.stringify({ at: 2 }));
    failWrites(2);

    expect(setLocal("lux.theme", "light")).toBe(true);

    expect(getLocal("lux:polled:a")).toBeNull();
    expect(getLocal("lux:polled:b")).toBeNull();
  });

  it("reports failure when there is nothing left to evict", () => {
    localStorage.setItem("widget:tasks", "kept");
    failWrites(Number.POSITIVE_INFINITY);

    expect(setLocal("lux.theme", "light")).toBe(false);

    expect(getLocal("widget:tasks")).toBe("kept");
  });
});
