import { describe, expect, it } from "vitest";
import { googleProvider } from "@/integrations/providers/google";

const baseParams = {
  clientId: "client-123",
  redirectUri: "https://ext.chromiumapp.org/google/oauth",
  state: "state-xyz",
  scopes: googleProvider.scopes,
};

describe("googleProvider.buildAuthUrl", () => {
  it("requests a silent renewal with prompt=none", () => {
    const url = new URL(googleProvider.buildAuthUrl!({ ...baseParams, prompt: "none" }));
    expect(url.searchParams.get("prompt")).toBe("none");
    expect(url.searchParams.get("response_type")).toBe("token");
  });

  it("defaults to consent when no prompt is provided", () => {
    const url = new URL(googleProvider.buildAuthUrl!({ ...baseParams }));
    expect(url.searchParams.get("prompt")).toBe("consent");
  });
});
