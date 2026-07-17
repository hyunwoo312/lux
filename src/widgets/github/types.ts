export const GITHUB_VIEWS = ["contributions", "inbox"] as const;
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

export type ContributionsData = {
  weeks: ContributionDay[][];
  total: number;
  currentStreak: number;
  longestStreak: number;
  login?: string;
  totals?: ContributionTotals;
  activity?: RepoActivity[];
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

export type InboxData = {
  notifications: InboxNotification[];
  pullRequests: InboxPullRequest[];
  issues: InboxIssue[];
  notificationsError?: string;
  itemsError?: string;
};
