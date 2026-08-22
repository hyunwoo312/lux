import type {
  ContributionDay,
  ContributionsData,
  DateRange,
  RepoActivity,
} from "@/widgets/github/types";

export type RepoContribution = { repo: string; url: string; isPrivate: boolean; count: number };

export type RepoActivityGroups = {
  commits: RepoContribution[];
  prs: RepoContribution[];
  issues: RepoContribution[];
  reviews: RepoContribution[];
};

export type Streaks = {
  current: number;
  longest: number;
  currentRange?: DateRange;
  longestRange?: DateRange;
};

function rangeOf(days: ContributionDay[], endIndex: number, length: number): DateRange | undefined {
  if (length === 0) return undefined;
  const from = days[endIndex - length + 1]?.date;
  const to = days[endIndex]?.date;
  return from && to ? { from, to } : undefined;
}

export function computeStreaks(days: ContributionDay[]): Streaks {
  let longest = 0;
  let longestEnd = -1;
  let run = 0;
  for (const [index, day] of days.entries()) {
    run = day.count > 0 ? run + 1 : 0;
    if (run > longest) {
      longest = run;
      longestEnd = index;
    }
  }

  let current = 0;
  let currentEnd = -1;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (!day) break;
    if (day.count > 0) {
      if (currentEnd === -1) currentEnd = index;
      current += 1;
    } else if (index === days.length - 1) {
      continue;
    } else {
      break;
    }
  }

  return {
    current,
    longest,
    currentRange: rangeOf(days, currentEnd, current),
    longestRange: rangeOf(days, longestEnd, longest),
  };
}

function bestContributionDay(days: ContributionDay[]): ContributionDay | undefined {
  let best: ContributionDay | undefined;
  for (const day of days) {
    if (day.count > 0 && (!best || day.count > best.count)) best = day;
  }
  return best;
}

export function buildContributions(weeks: ContributionDay[][], total: number): ContributionsData {
  const days = weeks.flat();
  const { current, longest, currentRange, longestRange } = computeStreaks(days);
  return {
    weeks,
    total,
    currentStreak: current,
    longestStreak: longest,
    currentStreakRange: currentRange,
    longestStreakRange: longestRange,
    bestDay: bestContributionDay(days),
    dailyAverage: days.length > 0 ? total / days.length : 0,
  };
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
