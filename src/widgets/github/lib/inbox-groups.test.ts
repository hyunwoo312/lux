import { describe, expect, it } from "vitest";
import {
  attentionCount,
  groupByRepo,
  matchesFilter,
  type InboxEntry,
} from "@/widgets/github/lib/inbox-groups";
import type { InboxIssue, InboxNotification, InboxPullRequest } from "@/widgets/github/types";

function issueEntry(id: string, repo: string, updatedAt: string): InboxEntry {
  const issue = {
    id,
    title: id,
    url: "#",
    number: 1,
    repo,
    isPrivate: false,
    updatedAt,
    kind: "assigned",
  } satisfies InboxIssue;
  return { kind: "issue", id, repo, updatedAt, issue };
}

describe("groupByRepo", () => {
  it("collects every entry for a repository under one group", () => {
    const groups = groupByRepo([
      issueEntry("a", "o/one", "2026-08-01T00:00:00Z"),
      issueEntry("b", "o/two", "2026-08-02T00:00:00Z"),
      issueEntry("c", "o/one", "2026-08-03T00:00:00Z"),
    ]);

    expect(groups.map((group) => group.repo)).toEqual(["o/one", "o/two"]);
    expect(groups[0]?.entries).toHaveLength(2);
  });

  it("puts the most recently touched repository first", () => {
    const groups = groupByRepo([
      issueEntry("old", "o/stale", "2026-01-01T00:00:00Z"),
      issueEntry("new", "o/fresh", "2026-08-20T00:00:00Z"),
    ]);

    expect(groups[0]?.repo).toBe("o/fresh");
  });

  it("survives an unparseable timestamp instead of dropping the repository", () => {
    const groups = groupByRepo([issueEntry("a", "o/one", "not-a-date")]);
    expect(groups).toHaveLength(1);
  });

  it("reads an empty inbox as no groups", () => {
    expect(groupByRepo([])).toEqual([]);
  });
});

describe("attentionCount", () => {
  const pr = (kind: InboxPullRequest["kind"]): InboxPullRequest => ({
    id: kind,
    title: "t",
    url: "#",
    number: 1,
    repo: "o/r",
    isPrivate: false,
    isDraft: false,
    author: "a",
    updatedAt: "2026-08-01T00:00:00Z",
    kind,
    ci: "none",
    review: "none",
  });
  const notification: InboxNotification = {
    id: "n",
    title: "t",
    reason: "mention",
    repo: "o/r",
    isPrivate: false,
    updatedAt: "2026-08-01T00:00:00Z",
    url: "#",
  };

  it("counts review requests and notifications, not your own pull requests", () => {
    expect(attentionCount([pr("reviewRequested"), pr("mine")], [notification])).toBe(2);
  });

  it("is zero on an empty inbox so the tab carries no badge", () => {
    expect(attentionCount([], [])).toBe(0);
  });
});

describe("matchesFilter", () => {
  const entry = issueEntry("a", "o/r", "2026-08-01T00:00:00Z");

  it("lets everything through on the default filter", () => {
    expect(matchesFilter(entry, "all")).toBe(true);
  });

  it("keeps only the kind the filter names", () => {
    expect(matchesFilter(entry, "issues")).toBe(true);
    expect(matchesFilter(entry, "reviews")).toBe(false);
    expect(matchesFilter(entry, "notifications")).toBe(false);
  });
});
