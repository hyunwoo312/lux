import { describe, expect, it } from "vitest";
import { droppedLink } from "@/widgets/quick-access/lib/drop-link";

const transfer = (uri: string, plain = "") => ({
  getData: (type: string) => (type === "text/uri-list" ? uri : plain),
});
describe("droppedLink", () => {
  it("accepts one web URL, ignores URI comments, and preserves its path/query", () => {
    expect(droppedLink(transfer("# Link\r\nhttps://example.com/docs?q=glass"))).toBe(
      "https://example.com/docs?q=glass",
    );
    expect(droppedLink(transfer("", "https://example.com"))).toBe("https://example.com/");
  });
  it("rejects multiple links, unsupported schemes, prose and empty drops", () => {
    for (const text of [
      "https://a.test/\nhttps://b.test/",
      "javascript:alert(1)",
      "file:///C:/private.txt",
      "Read this https://example.com",
      "",
    ])
      expect(droppedLink(transfer("", text))).toBeNull();
  });
});
