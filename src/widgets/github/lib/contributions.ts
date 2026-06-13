import type { ContributionDay, ContributionsData, RepoActivity } from "@/widgets/github/types";

export type RepoContribution = { repo: string; url: string; isPrivate: boolean; count: number };

export type RepoActivityGroups = {
  commits: RepoContribution[];
  prs: RepoContribution[];
  issues: RepoContribution[];
  reviews: RepoContribution[];
};

export function computeStreaks(days: ContributionDay[]): {
  current: number;
  longest: number;
} {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  let current = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (!day) break;
    if (day.count > 0) {
      current += 1;
    } else if (index === days.length - 1) {
      continue;
    } else {
      break;
    }
  }

  return { current, longest };
}

export function buildContributions(
  weeks: ContributionDay[][],
  total: number,
): ContributionsData {
  const days = weeks.flat();
  const { current, longest } = computeStreaks(days);
  return { weeks, total, currentStreak: current, longestStreak: longest };
}

export function buildRepoActivity(groups: RepoActivityGroups): RepoActivity[] {
  const byRepo = new Map<string, RepoActivity>();

  const entryFor = (contribution: RepoContribution): RepoActivity => {
    let entry = byRepo.get(contribution.repo);
    if (!entry) {
      entry = {
        repo: contribution.repo,
        url: contribution.url,
        isPrivate: contribution.isPrivate,
        commits: 0,
        prs: 0,
        issues: 0,
        reviews: 0,
        total: 0,
      };
      byRepo.set(contribution.repo, entry);
    }
    return entry;
  };

  for (const contribution of groups.commits) entryFor(contribution).commits += contribution.count;
  for (const contribution of groups.prs) entryFor(contribution).prs += contribution.count;
  for (const contribution of groups.issues) entryFor(contribution).issues += contribution.count;
  for (const contribution of groups.reviews) entryFor(contribution).reviews += contribution.count;

  for (const entry of byRepo.values()) {
    entry.total = entry.commits + entry.prs + entry.issues + entry.reviews;
  }

  return [...byRepo.values()].sort((a, b) => b.total - a.total);
}
