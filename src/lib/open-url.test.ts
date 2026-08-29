// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openUrl, searchWeb } from "@/lib/open-url";

const searchMock = () =>
  (globalThis.chrome as unknown as { search: { query: ReturnType<typeof vi.fn> } }).search.query;

describe("openUrl", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockReturnValue(null);
  });

  it("refuses every scheme outside http and https", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "nope"]) {
      openUrl(url, "newTab");
    }

    expect(window.open).not.toHaveBeenCalled();
  });
});

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
