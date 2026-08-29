// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
}

describe("useCopyToClipboard", () => {
  it("reports failure when the clipboard write is rejected", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    const { result } = renderHook(() => useCopyToClipboard());

    act(() => result.current.copy("hello"));

    await waitFor(() => expect(result.current.status).toBe("failed"));
  });

  it("returns to idle after a successful copy", async () => {
    vi.useFakeTimers();
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copy("hello");
    });
    expect(result.current.status).toBe("copied");

    await act(async () => {
      vi.runAllTimers();
    });
    expect(result.current.status).toBe("idle");
    vi.useRealTimers();
  });
});
