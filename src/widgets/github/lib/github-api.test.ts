import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations", () => ({ integrationFetch: vi.fn() }));

import { integrationFetch } from "@/integrations";
import { RateLimitError } from "@/lib/rate-limit";
import {
  fetchContributions,
  fetchInbox,
  fetchReleases,
  markAllGithubNotificationsRead,
  markGithubThreadRead,
  parseCachedReleases,
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

function notificationEntry(id: string) {
  return {
    id,
    reason: "mention",
    updated_at: "2026-07-01T00:00:00Z",
    subject: { title: `Ping ${id}`, url: null, type: "Issue" },
    repository: { full_name: "o/r", html_url: "https://github.com/o/r", private: false },
  };
}

function isGraphql(url: unknown): boolean {
  return String(url).includes("/graphql");
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

type SampleRelease = {
  name?: string | null;
  tagName: string;
  publishedAt: string | null;
  isPrerelease?: boolean;
};

function watchedRepo(name: string, release: SampleRelease | null, isPrivate = false) {
  return {
    id: `repo-${name}`,
    nameWithOwner: name,
    isPrivate,
    latestRelease: release
      ? {
          name: release.name ?? null,
          tagName: release.tagName,
          url: `https://github.com/${name}/releases/tag/${release.tagName}`,
          publishedAt: release.publishedAt,
          isPrerelease: release.isPrerelease ?? false,
        }
      : null,
  };
}

function watchingResponse(nodes: unknown[], totalCount = nodes.length) {
  return jsonResponse({ data: { viewer: { watching: { totalCount, nodes } } } });
}

describe("fetchReleases", () => {
  it("returns the newest release first regardless of how repositories are ordered", async () => {
    mockFetch.mockResolvedValue(
      watchingResponse([
        watchedRepo("o/old", { tagName: "v1.0.0", publishedAt: "2026-01-01T00:00:00Z" }),
        watchedRepo("o/new", { tagName: "v3.0.0", publishedAt: "2026-07-30T00:00:00Z" }),
        watchedRepo("o/mid", { tagName: "v2.0.0", publishedAt: "2026-04-15T00:00:00Z" }),
      ]),
    );

    const { releases } = await fetchReleases();

    expect(releases.map((release) => release.repo)).toEqual(["o/new", "o/mid", "o/old"]);
  });

  it("drops watched repositories that have never published a release", async () => {
    mockFetch.mockResolvedValue(
      watchingResponse([
        watchedRepo("o/quiet", null),
        watchedRepo("o/shipping", { tagName: "v1.0.0", publishedAt: "2026-07-01T00:00:00Z" }),
      ]),
    );

    const { releases } = await fetchReleases();

    expect(releases.map((release) => release.repo)).toEqual(["o/shipping"]);
  });

  it("drops an unpublished release rather than sorting it as undated", async () => {
    mockFetch.mockResolvedValue(
      watchingResponse([
        watchedRepo("o/draft", { tagName: "v2.0.0", publishedAt: null }),
        watchedRepo("o/live", { tagName: "v1.0.0", publishedAt: "2026-07-01T00:00:00Z" }),
      ]),
    );

    const { releases } = await fetchReleases();

    expect(releases.map((release) => release.repo)).toEqual(["o/live"]);
  });

  it("keeps the rest of the list when one repository is malformed", async () => {
    mockFetch.mockResolvedValue(
      watchingResponse([
        { id: "broken" },
        null,
        watchedRepo("o/fine", { tagName: "v1.0.0", publishedAt: "2026-07-01T00:00:00Z" }),
      ]),
    );

    const { releases } = await fetchReleases();

    expect(releases.map((release) => release.repo)).toEqual(["o/fine"]);
  });

  it("falls back to the tag when a release has no name", async () => {
    mockFetch.mockResolvedValue(
      watchingResponse([
        watchedRepo("o/a", { name: "  ", tagName: "v9.9.9", publishedAt: "2026-07-01T00:00:00Z" }),
      ]),
    );

    const { releases } = await fetchReleases();

    expect(releases[0]?.name).toBe("v9.9.9");
  });

  it("reports how much of the watch list was scanned so the cap can be surfaced", async () => {
    mockFetch.mockResolvedValue(
      watchingResponse(
        [watchedRepo("o/a", { tagName: "v1.0.0", publishedAt: "2026-07-01T00:00:00Z" })],
        240,
      ),
    );

    const data = await fetchReleases();

    expect(data.watchedCount).toBe(240);
    expect(data.watchedScanned).toBe(1);
  });

  it("throws when the response is not a watch list", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { viewer: {} } }));
    await expect(fetchReleases()).rejects.toThrow("Unexpected GitHub releases response");
  });
});

describe("parseCachedReleases", () => {
  it("round-trips a fetched payload", async () => {
    mockFetch.mockResolvedValue(
      watchingResponse([
        watchedRepo("o/a", { tagName: "v1.0.0", publishedAt: "2026-07-01T00:00:00Z" }),
      ]),
    );
    const data = await fetchReleases();

    expect(parseCachedReleases(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it("rejects a cache entry that is missing the watch counts", () => {
    expect(parseCachedReleases({ releases: [] })).toBeNull();
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

describe("graphql errors returned with HTTP 200", () => {
  it("throws a RateLimitError when an error is RATE_LIMITED", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ errors: [{ type: "RATE_LIMITED", message: "API rate limit exceeded" }] }),
    );
    await expect(fetchContributions()).rejects.toBeInstanceOf(RateLimitError);
  });

  it("throws the first error message for a generic errors body", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ errors: [{ message: "Something went wrong" }] }));
    await expect(fetchContributions()).rejects.toThrow("Something went wrong");
  });
});

describe("fetchInbox — per-section failures", () => {
  it("flags itemsError with the rate-limit message and keeps notifications", async () => {
    mockFetch.mockImplementation((_provider, url) => {
      if (isGraphql(url)) {
        return Promise.resolve(jsonResponse({ errors: [{ type: "RATE_LIMITED" }] }));
      }
      return Promise.resolve(jsonResponse([notificationEntry("n1")]));
    });

    const inbox = await fetchInbox();

    expect(inbox.notifications).toHaveLength(1);
    expect(inbox.pullRequests).toEqual([]);
    expect(inbox.issues).toEqual([]);
    expect(inbox.itemsError).toMatch(/rate limited/i);
    expect(inbox.notificationsError).toBeUndefined();
  });

  it("flags notificationsError when the REST half fails but keeps items", async () => {
    mockFetch.mockImplementation((_provider, url) => {
      if (isGraphql(url)) {
        return Promise.resolve(
          jsonResponse({
            data: {
              reviewRequested: { nodes: [] },
              mine: { nodes: [] },
              assigned: { nodes: [issueNode("1")] },
              mentioned: { nodes: [] },
            },
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 500 }));
    });

    const inbox = await fetchInbox();

    expect(inbox.issues).toHaveLength(1);
    expect(inbox.notifications).toEqual([]);
    expect(inbox.notificationsError).toBe("Couldn’t load notifications.");
    expect(inbox.itemsError).toBeUndefined();
  });

  it("throws when both halves fail", async () => {
    mockFetch.mockImplementation((_provider, url) => {
      if (isGraphql(url)) {
        return Promise.resolve(jsonResponse({ errors: [{ message: "graphql down" }] }));
      }
      return Promise.resolve(new Response(null, { status: 500 }));
    });

    await expect(fetchInbox()).rejects.toThrow();
  });
});
