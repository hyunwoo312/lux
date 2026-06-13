import { describe, expect, it } from "vitest";
import {
  buildContributions,
  buildRepoActivity,
  computeStreaks,
  type RepoContribution,
} from "@/widgets/github/lib/contributions";
import type { ContributionDay } from "@/widgets/github/types";

function day(date: string, count: number): ContributionDay {
  return { date, count, level: count === 0 ? 0 : 1 };
}

describe("computeStreaks", () => {
  it("finds the longest run of active days", () => {
    const days = [day("d1", 1), day("d2", 2), day("d3", 0), day("d4", 1), day("d5", 1)];
    expect(computeStreaks(days).longest).toBe(2);
  });

  it("counts the current streak ending at the last day", () => {
    const days = [day("d1", 0), day("d2", 1), day("d3", 1), day("d4", 2)];
    expect(computeStreaks(days).current).toBe(3);
  });

  it("does not break the current streak when only today is empty", () => {
    const days = [day("d1", 1), day("d2", 1), day("today", 0)];
    expect(computeStreaks(days).current).toBe(2);
  });

  it("breaks the current streak on an empty day before today", () => {
    const days = [day("d1", 1), day("d2", 0), day("d3", 1), day("today", 0)];
    expect(computeStreaks(days).current).toBe(1);
  });

  it("returns zero streaks with no activity", () => {
    expect(computeStreaks([day("d1", 0), day("d2", 0)])).toEqual({ current: 0, longest: 0 });
  });
});

describe("buildContributions", () => {
  it("flattens weeks and attaches total and streaks", () => {
    const weeks = [
      [day("d1", 1), day("d2", 1)],
      [day("d3", 0), day("d4", 1)],
    ];
    expect(buildContributions(weeks, 3)).toEqual({
      weeks,
      total: 3,
      currentStreak: 1,
      longestStreak: 2,
    });
  });
});

describe("buildRepoActivity", () => {
  const c = (repo: string, count: number): RepoContribution => ({
    repo,
    url: `https://github.com/${repo}`,
    isPrivate: false,
    count,
  });

  it("merges per-type breakdowns by repo and sorts by total descending", () => {
    const result = buildRepoActivity({
      commits: [c("a/one", 10), c("a/two", 3)],
      prs: [c("a/one", 2)],
      issues: [c("a/two", 1)],
      reviews: [c("a/one", 5)],
    });

    expect(result.map((entry) => [entry.repo, entry.total])).toEqual([
      ["a/one", 17],
      ["a/two", 4],
    ]);
    expect(result[0]).toMatchObject({ commits: 10, prs: 2, issues: 0, reviews: 5 });
  });

  it("returns an empty list when there is no activity", () => {
    expect(buildRepoActivity({ commits: [], prs: [], issues: [], reviews: [] })).toEqual([]);
  });
});
