import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError, RateLimitError } from "@/lib/net";
import { fetchYahoo } from "@/widgets/stocks/lib/yahooApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchYahoo", () => {
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
