import { withTimeout } from "@/lib/net";

describe("withTimeout", () => {
  it("returns a signal even when the caller has none", () => {
    const signal = withTimeout();
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it("treats a null signal the same as an absent one", () => {
    expect(withTimeout(null)).toBeInstanceOf(AbortSignal);
  });

  it("aborts as soon as the caller's signal aborts", () => {
    const controller = new AbortController();
    const signal = withTimeout(controller.signal);

    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("is already aborted when the caller's signal was aborted first", () => {
    const controller = new AbortController();
    controller.abort();

    expect(withTimeout(controller.signal).aborted).toBe(true);
  });

  it("never hands back the caller's bare signal, so a timeout is always composed in", () => {
    const controller = new AbortController();

    expect(withTimeout(controller.signal)).not.toBe(controller.signal);
  });
});
