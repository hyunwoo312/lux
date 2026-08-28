import { afterEach, describe, expect, it, vi } from "vitest";
import { submitFeedback } from "@/feedback/lib/submit";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitFeedback", () => {
  it("does not report a failure when the relay accepts it but the reply is unreadable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError("bad")) }),
    );

    const result = await submitFeedback({ category: "bug", message: "Something went sideways" });

    expect(result).toEqual({
      ok: false,
      retryable: false,
      message: expect.stringMatching(/couldn’t confirm/i),
    });
  });
});
