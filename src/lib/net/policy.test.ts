import { describe, expect, it } from "vitest";
import { withTimeout } from "@/lib/net";

describe("withTimeout", () => {
  it("aborts when the caller's signal aborts", () => {
    const controller = new AbortController();
    const signal = withTimeout(controller.signal, 60_000);

    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("always composes its own signal, with or without a caller's", () => {
    const controller = new AbortController();

    expect(withTimeout()).toBeInstanceOf(AbortSignal);
    expect(withTimeout(null)).toBeInstanceOf(AbortSignal);
    expect(withTimeout(controller.signal)).not.toBe(controller.signal);
  });

  it("is already aborted when the caller's signal aborted first", () => {
    const controller = new AbortController();
    controller.abort();

    expect(withTimeout(controller.signal).aborted).toBe(true);
  });

  it("aborts on its own deadline when there is no caller signal", async () => {
    const signal = withTimeout(null, 10);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(signal.aborted).toBe(true);
  });
});
