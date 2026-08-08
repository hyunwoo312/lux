// @vitest-environment jsdom
import { getLocal, setLocal } from "@/lib/local-store";

describe("local-store", () => {

  it("round-trips a value", () => {
    setLocal("key", "value");
    expect(getLocal("key")).toBe("value");
  });

  it("returns null when the key is absent", () => {
    expect(getLocal("absent")).toBeNull();
  });
});