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

  it("is already aborted when the caller's signal aborted first", () => {
    const controller = new AbortController();
    controller.abort();

    expect(withTimeout(controller.signal).aborted).toBe(true);
  });

  it("aborts on its own deadline, with or without a caller's signal", async () => {
    const controller = new AbortController();
    const alone = withTimeout(null, 10);
    const composed = withTimeout(controller.signal, 10);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect([alone.aborted, composed.aborted]).toEqual([true, true]);
  });
});
