import type { AccentPreset } from "@/widgets/core/accent";

export const GITHUB_ACCENT: AccentPreset = "violet";

export const GITHUB_VIEWS = ["contributions", "inbox", "releases"] as const;

export const INBOX_FILTERS = ["all", "reviews", "issues", "notifications"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const INBOX_CACHE_KEY = "github:inbox";
export const CONTRIBUTIONS_CACHE_KEY = "github:contributions";
export const RELEASES_CACHE_KEY = "github:releases";

export const INBOX_REFRESH_MS = 3 * 60 * 1000;
export const SLOW_REFRESH_MS = 30 * 60 * 1000;
export type GithubView = (typeof GITHUB_VIEWS)[number];

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = {
  date: string;
  count: number;
  level: ContributionLevel;
};

export type RepoActivity = {
  repo: string;
  url: string;
  isPrivate: boolean;
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  total: number;
};

export type ContributionTotals = {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
};

export type DateRange = { from: string; to: string };

export type ContributionsData = {
  weeks: ContributionDay[][];
  total: number;
  currentStreak: number;
  longestStreak: number;
  login?: string;
  totals?: ContributionTotals;
  activity?: RepoActivity[];
  bestDay?: ContributionDay;
  dailyAverage?: number;
  currentStreakRange?: DateRange;
  longestStreakRange?: DateRange;
};

export type InboxNotification = {
  id: string;
  title: string;
  reason: string;
  repo: string;
  isPrivate: boolean;
  updatedAt: string;
  url: string;
};

export type PullRequestCi = "success" | "failure" | "pending" | "none";
export type PullRequestReview = "approved" | "changesRequested" | "reviewRequired" | "none";
export type PullRequestKind = "reviewRequested" | "mine";

export type InboxPullRequest = {
  id: string;
  title: string;
  url: string;
  number: number;
  repo: string;
  isPrivate: boolean;
  isDraft: boolean;
  author: string;
  updatedAt: string;
  kind: PullRequestKind;
  ci: PullRequestCi;
  review: PullRequestReview;
};

export type IssueKind = "assigned" | "mention";

export type InboxIssue = {
  id: string;
  title: string;
  url: string;
  number: number;
  repo: string;
  isPrivate: boolean;
  updatedAt: string;
  kind: IssueKind;
};

export type Release = {
  repo: string;
  isPrivate: boolean;
  name: string;
  tagName: string;
  url: string;
  publishedAt: string;
  isPrerelease: boolean;
};

export type ReleasesData = {
  releases: Release[];
  watchedCount: number;
  watchedScanned: number;
};

export type InboxData = {
  notifications: InboxNotification[];
  pullRequests: InboxPullRequest[];
  issues: InboxIssue[];
  notificationsError?: string;
  itemsError?: string;
};
