// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { anilistCallbackSchema } from "@/lib/extension-keys";

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

    const message: unknown = sendMessageMock().mock.calls[0]?.[0];
    expect(anilistCallbackSchema.safeParse(message)).toMatchObject({
      success: true,
      data: {
        accessToken: "tok",
        tokenType: "Bearer",
        expiresIn: "3600",
        state: "state-abc",
      },
    });
    expect(window.location.hash).toBe("");
  });
});
