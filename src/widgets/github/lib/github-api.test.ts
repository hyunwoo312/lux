import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations", () => ({ integrationFetch: vi.fn() }));

import { integrationFetch } from "@/integrations";
import {
  markAllGithubNotificationsRead,
  markGithubThreadRead,
  unsubscribeGithubThread,
} from "@/widgets/github/lib/github-api";

const mockFetch = vi.mocked(integrationFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe("markGithubThreadRead", () => {
  it("PATCHes the thread endpoint", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 205 }));
    await markGithubThreadRead("42");
    expect(mockFetch).toHaveBeenCalledWith(
      "github",
      "https://api.github.com/notifications/threads/42",
      { method: "PATCH", headers: { Accept: "application/vnd.github+json" } },
    );
  });

  it("throws when the request fails", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(markGithubThreadRead("42")).rejects.toThrow();
  });
});

describe("unsubscribeGithubThread", () => {
  it("DELETEs the thread subscription endpoint", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await unsubscribeGithubThread("42");
    expect(mockFetch).toHaveBeenCalledWith(
      "github",
      "https://api.github.com/notifications/threads/42/subscription",
      { method: "DELETE", headers: { Accept: "application/vnd.github+json" } },
    );
  });
});

describe("markAllGithubNotificationsRead", () => {
  it("PUTs the notifications endpoint marking them read", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 202 }));
    await markAllGithubNotificationsRead();
    expect(mockFetch).toHaveBeenCalledWith("github", "https://api.github.com/notifications", {
      method: "PUT",
      headers: { Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
  });
});
