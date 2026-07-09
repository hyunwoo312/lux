import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations", () => ({ integrationFetch: vi.fn() }));

import { integrationFetch } from "@/integrations";
import {
  fetchInbox,
  markAllGithubNotificationsRead,
  markGithubThreadRead,
  unsubscribeGithubThread,
} from "@/widgets/github/lib/github-api";

const mockFetch = vi.mocked(integrationFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function issueNode(id: string, isPrivate = false) {
  return {
    id,
    title: `Issue ${id}`,
    url: `https://github.com/o/r/issues/${id}`,
    number: Number(id.replace(/\D/g, "")) || 1,
    updatedAt: "2026-07-01T00:00:00Z",
    repository: { nameWithOwner: "o/r", isPrivate },
  };
}

afterEach(() => {
  mockFetch.mockReset();
});

describe("fetchInbox — assigned issues & mentions", () => {
  it("maps assigned issues and mentions and dedupes an issue that is both", async () => {
    mockFetch.mockImplementation((_provider, url) => {
      if (String(url).includes("/graphql")) {
        return Promise.resolve(
          jsonResponse({
            data: {
              reviewRequested: { nodes: [] },
              mine: { nodes: [] },
              assigned: { nodes: [issueNode("1")] },
              mentioned: { nodes: [issueNode("1"), issueNode("2", true)] },
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });

    const inbox = await fetchInbox();

    expect(inbox.issues.map((issue) => [issue.id, issue.kind, issue.isPrivate])).toEqual([
      ["1", "assigned", false],
      ["2", "mention", true],
    ]);
  });
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
