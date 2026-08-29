// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function sendMessageMock() {
  return (globalThis.chrome as unknown as { runtime: { sendMessage: ReturnType<typeof vi.fn> } })
    .runtime.sendMessage;
}

describe("AniList callback page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("hands the fragment to the service worker and wipes it from the address bar", async () => {
    window.location.hash = "#access_token=tok&token_type=Bearer&expires_in=3600&state=state-abc";

    await import("@/anilist-callback");
    await flush();

    expect(sendMessageMock()).toHaveBeenCalledWith({
      type: "anilist-oauth",
      accessToken: "tok",
      tokenType: "Bearer",
      expiresIn: "3600",
      state: "state-abc",
      error: undefined,
    });
    expect(window.location.hash).toBe("");
  });
});
