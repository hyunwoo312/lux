import { hashHue, hostnameOf, normalizeUrl } from "@/widgets/quick-access/lib/url";

describe("normalizeUrl", () => {
  it("prepends https when no protocol is present", () => {
    expect(normalizeUrl("github.com")).toBe("https://github.com/");
  });

  it("keeps an existing protocol", () => {
    expect(normalizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("returns null for blank input", () => {
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("rejects every scheme outside http and https", () => {
    expect(normalizeUrl("javascript://%0aalert(1)")).toBeNull();
    expect(normalizeUrl("vbscript://x")).toBeNull();
    expect(normalizeUrl("file:///etc/passwd")).toBeNull();
    expect(normalizeUrl("chrome://extensions")).toBeNull();
  });
});

describe("hostnameOf", () => {
  it("strips the www prefix", () => {
    expect(hostnameOf("https://www.google.com/")).toBe("google.com");
  });
});

describe("hashHue", () => {
  it("is deterministic for the same host", () => {
    expect(hashHue("https://github.com/")).toBe(hashHue("https://github.com/page"));
  });
});
