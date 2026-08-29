// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";

function renderSearch(search: (query: string, signal: AbortSignal) => Promise<string[]>) {
  return renderHook(({ query }) => useDebouncedSearch(query, search), {
    initialProps: { query: "one" },
  });
}

describe("useDebouncedSearch", () => {
  it("ignores an in-flight request once the query has moved on", async () => {
    let resolveFirst: (data: string[]) => void = () => undefined;
    const search = vi
      .fn<(query: string, signal: AbortSignal) => Promise<string[]>>()
      .mockImplementationOnce(
        () =>
          new Promise<string[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(["second"]);

    const { result, rerender } = renderSearch(search);
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));

    rerender({ query: "two" });
    await waitFor(() => expect(result.current).toEqual({ status: "success", data: ["second"] }));

    await act(async () => {
      resolveFirst(["first"]);
    });
    expect(result.current).toEqual({ status: "success", data: ["second"] });
  });

  it("keeps the previous results visible while the next query loads", async () => {
    const search = vi
      .fn<(query: string, signal: AbortSignal) => Promise<string[]>>()
      .mockResolvedValue(["apple"]);

    const { result, rerender } = renderSearch(search);
    await waitFor(() => expect(result.current).toEqual({ status: "success", data: ["apple"] }));

    rerender({ query: "two" });
    expect(result.current).toEqual({ status: "loading", data: ["apple"] });
  });
});
