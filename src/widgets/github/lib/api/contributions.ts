import { z } from "zod";
import { tolerantArray } from "@/lib/persist";
import { graphql } from "@/widgets/github/lib/api/client";
import {
  buildContributions,
  buildRepoActivity,
  type RepoContribution,
} from "@/widgets/github/lib/contributions";
import type { ContributionLevel, ContributionsData } from "@/widgets/github/types";

const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const REPO_ACTIVITY_FIELDS = `repository { nameWithOwner url isPrivate }
        contributions { totalCount }`;

const CONTRIBUTIONS_QUERY = `query {
  viewer {
    login
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      commitContributionsByRepository(maxRepositories: 25) { ${REPO_ACTIVITY_FIELDS} }
      pullRequestContributionsByRepository(maxRepositories: 25) { ${REPO_ACTIVITY_FIELDS} }
      issueContributionsByRepository(maxRepositories: 25) { ${REPO_ACTIVITY_FIELDS} }
      pullRequestReviewContributionsByRepository(maxRepositories: 25) { ${REPO_ACTIVITY_FIELDS} }
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount contributionLevel }
        }
      }
    }
  }
}`;

const repoBreakdownSchema = tolerantArray(
  z.object({
    repository: z.object({
      nameWithOwner: z.string(),
      url: z.string(),
      isPrivate: z.boolean(),
    }),
    contributions: z.object({ totalCount: z.number() }),
  }),
);

type RepoBreakdownRow = z.infer<typeof repoBreakdownSchema>[number];

const contributionsSchema = z.object({
  data: z.object({
    viewer: z.object({
      login: z.string(),
      contributionsCollection: z.object({
        totalCommitContributions: z.number(),
        totalPullRequestContributions: z.number(),
        totalIssueContributions: z.number(),
        totalPullRequestReviewContributions: z.number(),
        commitContributionsByRepository: repoBreakdownSchema,
        pullRequestContributionsByRepository: repoBreakdownSchema,
        issueContributionsByRepository: repoBreakdownSchema,
        pullRequestReviewContributionsByRepository: repoBreakdownSchema,
        contributionCalendar: z.object({
          totalContributions: z.number(),
          weeks: z.array(
            z.object({
              contributionDays: z.array(
                z.object({
                  date: z.string(),
                  contributionCount: z.number(),
                  contributionLevel: z.string(),
                }),
              ),
            }),
          ),
        }),
      }),
    }),
  }),
});

export async function fetchContributions(signal?: AbortSignal): Promise<ContributionsData> {
  const parsed = contributionsSchema.safeParse(await graphql(CONTRIBUTIONS_QUERY, signal));
  if (!parsed.success) {
    throw new Error("Unexpected GitHub contributions response");
  }
  const viewer = parsed.data.data.viewer;
  const collection = viewer.contributionsCollection;
  const calendar = collection.contributionCalendar;
  const weeks = calendar.weeks.map((week) =>
    week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: LEVELS[day.contributionLevel] ?? 0,
    })),
  );
  const toContributions = (rows: RepoBreakdownRow[]): RepoContribution[] =>
    rows.map((row) => ({
      repo: row.repository.nameWithOwner,
      url: row.repository.url,
      isPrivate: row.repository.isPrivate,
      count: row.contributions.totalCount,
    }));

  return {
    ...buildContributions(weeks, calendar.totalContributions),
    login: viewer.login,
    totals: {
      commits: collection.totalCommitContributions,
      prs: collection.totalPullRequestContributions,
      issues: collection.totalIssueContributions,
      reviews: collection.totalPullRequestReviewContributions,
    },
    activity: buildRepoActivity({
      commits: toContributions(collection.commitContributionsByRepository),
      prs: toContributions(collection.pullRequestContributionsByRepository),
      issues: toContributions(collection.issueContributionsByRepository),
      reviews: toContributions(collection.pullRequestReviewContributionsByRepository),
    }),
  };
}

const contributionDaySchema = z.object({
  date: z.string(),
  count: z.number(),
  level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

const repoActivitySchema = z.object({
  repo: z.string(),
  url: z.string(),
  isPrivate: z.boolean(),
  commits: z.number(),
  prs: z.number(),
  issues: z.number(),
  reviews: z.number(),
  total: z.number(),
});

const cachedContributionsSchema = z.object({
  weeks: tolerantArray(tolerantArray(contributionDaySchema)),
  total: z.number().catch(0),
  currentStreak: z.number().catch(0),
  longestStreak: z.number().catch(0),
  login: z.string().optional().catch(undefined),
  totals: z
    .object({
      commits: z.number().catch(0),
      prs: z.number().catch(0),
      issues: z.number().catch(0),
      reviews: z.number().catch(0),
    })
    .optional()
    .catch(undefined),
  activity: tolerantArray(repoActivitySchema).optional(),
  bestDay: contributionDaySchema.optional().catch(undefined),
  dailyAverage: z.number().optional().catch(undefined),
});

export function parseCachedContributions(raw: unknown): ContributionsData | null {
  const result = cachedContributionsSchema.safeParse(raw);
  if (!result.success || result.data.weeks.length === 0) return null;
  return result.data;
}
