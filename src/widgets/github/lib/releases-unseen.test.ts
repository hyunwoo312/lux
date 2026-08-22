import { describe, expect, it } from "vitest";
import { countUnseen, isUnseen, newestPublishedAt } from "@/widgets/github/lib/releases-unseen";
import type { Release } from "@/widgets/github/types";

function release(publishedAt: string): Release {
  return {
    repo: `o/${publishedAt}`,
    isPrivate: false,
    name: "v1",
    tagName: "v1",
    url: "#",
    publishedAt,
    isPrerelease: false,
  };
}

const OLD = "2026-08-01T00:00:00.000Z";
const NEW = "2026-08-20T00:00:00.000Z";

describe("isUnseen", () => {
  it("marks a release published after you last looked", () => {
    expect(isUnseen(release(NEW), OLD)).toBe(true);
  });

  it("leaves everything unmarked on a first visit, so the list is not all new", () => {
    expect(isUnseen(release(NEW), undefined)).toBe(false);
  });

  it("does not mark the release you already saw", () => {
    expect(isUnseen(release(OLD), OLD)).toBe(false);
  });

  it("treats an unparseable timestamp as seen rather than shouting", () => {
    expect(isUnseen(release("nonsense"), OLD)).toBe(false);
    expect(isUnseen(release(NEW), "nonsense")).toBe(false);
  });
});

describe("countUnseen", () => {
  it("counts only what arrived since you last looked", () => {
    expect(countUnseen([release(OLD), release(NEW), release(NEW)], OLD)).toBe(2);
  });
});

describe("newestPublishedAt", () => {
  it("finds the most recent release regardless of order", () => {
    expect(newestPublishedAt([release(NEW), release(OLD)])).toBe(NEW);
  });

  it("ignores an unparseable timestamp", () => {
    expect(newestPublishedAt([release("nonsense"), release(OLD)])).toBe(OLD);
  });

  it("has no answer for an empty list", () => {
    expect(newestPublishedAt([])).toBeUndefined();
  });
});
