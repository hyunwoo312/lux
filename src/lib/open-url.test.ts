// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchWeb } from "@/lib/open-url";

const searchMock = () =>
  (globalThis.chrome as unknown as { search: { query: ReturnType<typeof vi.fn> } }).search.query;

describe("searchWeb", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockReturnValue(null);
  });

  it("falls back to a web search when the browser search API rejects", async () => {
    searchMock().mockRejectedValueOnce(new Error("no default search engine"));

    searchWeb("lux dashboard", "newTab");
    await vi.waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        "https://www.google.com/search?q=lux%20dashboard",
        "_blank",
        "noopener,noreferrer",
      ),
    );
  });
});
