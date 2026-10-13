import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError, RateLimitError } from "@/lib/net";
import { fetchYahoo } from "@/widgets/stocks/lib/yahooApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchYahoo", () => {
  it("bounds concurrent requests and cancels a queued request without using a slot", async () => {
    const complete: (() => void)[] = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) =>
          complete.push(() =>
            resolve(
              new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
            ),
          ),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const requests = Array.from({ length: 5 }, (_, index) => fetchYahoo(`/bounded/${index}`));
    const controller = new AbortController();
    const cancelled = fetchYahoo("/cancelled", controller.signal);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    complete.shift()?.();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    complete.forEach((finish) => finish());
    await Promise.all(requests);
    expect(fetchMock.mock.calls).toHaveLength(5);
  });
  it("surfaces a 429 as a rate limit after trying the second host", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchYahoo("/v8/quote")).rejects.toBeInstanceOf(RateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops at the first host on a client error and names its status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchYahoo("/v8/quote")).rejects.toMatchObject(
      expect.objectContaining({ status: 404 }) as HttpError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
