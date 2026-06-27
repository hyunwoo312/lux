import { z } from "zod";
import { integrationFetch } from "@/integrations";
import {
  buildContributions,
  buildRepoActivity,
  type RepoContribution,
} from "@/widgets/github/lib/contributions";
import type {
  ContributionLevel,
  ContributionsData,
  InboxData,
  InboxNotification,
  InboxPullRequest,
  PullRequestCi,
  PullRequestReview,
} from "@/widgets/github/types";

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const NOTIFICATIONS_ENDPOINT = "https://api.github.com/notifications";

const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

async function graphql(query: string): Promise<unknown> {
  const response = await integrationFetch("github", GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error("GitHub request failed");
  }
  return response.json();
}

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

const repoBreakdownSchema = z.array(
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

export async function fetchContributions(): Promise<ContributionsData> {
  const parsed = contributionsSchema.safeParse(await graphql(CONTRIBUTIONS_QUERY));
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

const notificationSchema = z.object({
  id: z.string(),
  reason: z.string(),
  updated_at: z.string(),
  subject: z.object({ title: z.string(), url: z.string().nullable(), type: z.string() }),
  repository: z.object({
    full_name: z.string(),
    html_url: z.string(),
    private: z.boolean(),
  }),
});

const notificationsSchema = z.array(z.unknown());

function notificationUrl(subjectUrl: string | null, type: string, repoUrl: string): string {
  if (subjectUrl && (type === "PullRequest" || type === "Issue")) {
    return subjectUrl
      .replace("https://api.github.com/repos/", "https://github.com/")
      .replace("/pulls/", "/pull/");
  }
  return repoUrl;
}

async function fetchNotifications(): Promise<InboxNotification[]> {
  const response = await integrationFetch("github", NOTIFICATIONS_ENDPOINT, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error("GitHub notifications request failed");
  }
  const parsed = notificationsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Unexpected GitHub notifications response");
  }
  return parsed.data
    .map((entry) => notificationSchema.safeParse(entry))
    .flatMap((result) => (result.success ? [result.data] : []))
    .map((entry) => ({
      id: entry.id,
      title: entry.subject.title,
      reason: entry.reason,
      repo: entry.repository.full_name,
      isPrivate: entry.repository.private,
      updatedAt: entry.updated_at,
      url: notificationUrl(entry.subject.url, entry.subject.type, entry.repository.html_url),
    }));
}

const PULL_REQUESTS_QUERY = `query {
  reviewRequested: search(query: "is:open is:pr review-requested:@me", type: ISSUE, first: 20) {
    nodes { ...pr }
  }
  mine: search(query: "is:open is:pr author:@me", type: ISSUE, first: 20) {
    nodes { ...pr }
  }
}
fragment pr on PullRequest {
  id
  title
  url
  number
  isDraft
  updatedAt
  repository { nameWithOwner isPrivate }
  author { login }
  reviewDecision
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}`;

const prNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  number: z.number(),
  isDraft: z.boolean(),
  updatedAt: z.string(),
  repository: z.object({ nameWithOwner: z.string(), isPrivate: z.boolean() }),
  author: z.object({ login: z.string() }).nullable(),
  reviewDecision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED"]).nullable(),
  commits: z.object({
    nodes: z.array(
      z.object({
        commit: z.object({
          statusCheckRollup: z.object({ state: z.string() }).nullable(),
        }),
      }),
    ),
  }),
});

const pullRequestsSchema = z.object({
  data: z.object({
    reviewRequested: z.object({ nodes: z.array(z.unknown()) }),
    mine: z.object({ nodes: z.array(z.unknown()) }),
  }),
});

function toCi(state: string | undefined): PullRequestCi {
  if (state === "SUCCESS") return "success";
  if (state === "FAILURE" || state === "ERROR") return "failure";
  if (state === "PENDING" || state === "EXPECTED") return "pending";
  return "none";
}

function toReview(decision: string | null): PullRequestReview {
  if (decision === "APPROVED") return "approved";
  if (decision === "CHANGES_REQUESTED") return "changesRequested";
  if (decision === "REVIEW_REQUIRED") return "reviewRequired";
  return "none";
}

function toPullRequest(node: unknown, kind: InboxPullRequest["kind"]): InboxPullRequest | null {
  const parsed = prNodeSchema.safeParse(node);
  if (!parsed.success) return null;
  const pr = parsed.data;
  return {
    id: pr.id,
    title: pr.title,
    url: pr.url,
    number: pr.number,
    repo: pr.repository.nameWithOwner,
    isPrivate: pr.repository.isPrivate,
    isDraft: pr.isDraft,
    author: pr.author?.login ?? "unknown",
    updatedAt: pr.updatedAt,
    kind,
    ci: toCi(pr.commits.nodes[0]?.commit.statusCheckRollup?.state),
    review: toReview(pr.reviewDecision),
  };
}

async function fetchPullRequests(): Promise<InboxPullRequest[]> {
  const parsed = pullRequestsSchema.safeParse(await graphql(PULL_REQUESTS_QUERY));
  if (!parsed.success) {
    throw new Error("Unexpected GitHub pull request response");
  }
  const seen = new Set<string>();
  const result: InboxPullRequest[] = [];
  const groups: Array<[unknown[], InboxPullRequest["kind"]]> = [
    [parsed.data.data.reviewRequested.nodes, "reviewRequested"],
    [parsed.data.data.mine.nodes, "mine"],
  ];
  for (const [nodes, kind] of groups) {
    for (const node of nodes) {
      const pr = toPullRequest(node, kind);
      if (pr && !seen.has(pr.id)) {
        seen.add(pr.id);
        result.push(pr);
      }
    }
  }
  return result;
}

export async function fetchInbox(): Promise<InboxData> {
  const [notifications, pullRequests] = await Promise.all([
    fetchNotifications(),
    fetchPullRequests(),
  ]);
  return { notifications, pullRequests };
}

const inboxNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  repo: z.string(),
  isPrivate: z.boolean(),
  updatedAt: z.string(),
  url: z.string(),
});

const inboxPullRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  number: z.number(),
  repo: z.string(),
  isPrivate: z.boolean(),
  isDraft: z.boolean(),
  author: z.string(),
  updatedAt: z.string(),
  kind: z.enum(["reviewRequested", "mine"]),
  ci: z.enum(["success", "failure", "pending", "none"]),
  review: z.enum(["approved", "changesRequested", "reviewRequired", "none"]),
});

const inboxDataSchema = z.object({
  notifications: z.array(inboxNotificationSchema),
  pullRequests: z.array(inboxPullRequestSchema),
});

export function parseCachedInbox(raw: unknown): InboxData | null {
  const result = inboxDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}
